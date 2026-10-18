from __future__ import annotations

import base64
import io
import os
import time
from collections import deque
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

from src.predict import AslPredictor
from src.landmarks import HandLandmarkExtractor

DEFAULT_PORT    = 3001
DEFAULT_ORIGINS = "http://localhost:5173"

# ── Fingerspelling (XGBoost) config ───────────────────────────────────────────
FINGERSPELL_WINDOW = 3.0
FINGERSPELL_COUNT  = 3
# ─────────────────────────────────────────────────────────────────────────────

# ── TCN config ────────────────────────────────────────────────────────────────
TCN_CONFIDENCE_THRESHOLD = 0.60
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)

origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if o.strip()
]
CORS(app, resources={r"/*": {"origins": origins}})

# ── XGBoost fingerspelling predictors (letters A-Z) ───────────────────────────
print("[startup] Loading ASL fingerspelling predictor ...")
asl_predictor = AslPredictor()
print("[startup] ASL fingerspelling predictor ready.")

print("[startup] Loading FSL fingerspelling predictor ...")
fsl_predictor = AslPredictor(
    model_path="models/fsl_xgb.json",
    encoder_path="models/fsl_label_encoder.pkl",
)
print("[startup] FSL fingerspelling predictor ready.")

# ── Segmented TCN dynamic sign predictor ──────────────────────────────────────
tcn_predictor  = None
_tcn_available = False

try:
    from inference.realtime import SegmentedTCNPredictor
    if Path("models/fsl_tcn_20.pth").exists():
        tcn_predictor = SegmentedTCNPredictor(
            language="fsl20",
            confidence_threshold=TCN_CONFIDENCE_THRESHOLD,
        )
        _tcn_available = True
        print("[startup] Segmented TCN predictor ready (FSL20).")
    else:
        print("[startup] No TCN model found — TCN detection disabled.")
except Exception as e:
    print(f"[startup] TCN predictor failed to load: {e}")

# ── XGBoost word sign predictor (legacy fallback) ─────────────────────────────
word_sign_predictor: AslPredictor | None = None
word_sign_extractor: HandLandmarkExtractor | None = None

_word_model_path   = Path("models/word_signs_xgb.json")
_word_encoder_path = Path("models/word_signs_encoder.pkl")

if _word_model_path.exists() and _word_encoder_path.exists() and not _tcn_available:
    try:
        word_sign_predictor = AslPredictor(
            model_path=str(_word_model_path),
            encoder_path=str(_word_encoder_path),
            use_word_features=True,
        )
        word_sign_extractor = word_sign_predictor._extractor
        print("[startup] XGBoost word-sign predictor ready (fallback).")
    except Exception as e:
        print(f"[startup] XGBoost word-sign predictor failed to load: {e}")
else:
    if _tcn_available:
        print("[startup] Segmented TCN active — XGBoost word-sign predictor skipped.")
    else:
        print("[startup] No word-sign model found.")

# ── Per-session state ─────────────────────────────────────────────────────────
_recent_letters: list[float] = []

# Legacy XGBoost word sign state
_wrist_history:  deque[tuple[float, float]] = deque(maxlen=12)
_hold_label:     str   = ""
_hold_start:     float = 0.0
_last_word_time: dict[str, float] = {}
# ─────────────────────────────────────────────────────────────────────────────


def decode_base64_image(b64: str) -> np.ndarray:
    if "," in b64 and b64.lstrip().startswith("data:"):
        b64 = b64.split(",", 1)[1]
    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception as e:
        raise ValueError(f"Invalid base64 payload: {e}")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Could not decode image: {e}")
    return np.asarray(img, dtype=np.uint8)


def is_fingerspelling() -> bool:
    global _recent_letters
    now = time.time()
    _recent_letters = [t for t in _recent_letters if now - t < FINGERSPELL_WINDOW]
    return len(_recent_letters) >= FINGERSPELL_COUNT


def try_tcn_sign(rgb: np.ndarray) -> str | None:
    """
    Push frame to segmented TCN predictor.
    Returns a sign label only when a complete sign is detected
    (hand moved then went still), otherwise None.
    """
    if tcn_predictor is None:
        return None

    result = tcn_predictor.push_frame(rgb)

    if "label" not in result:
        return None

    if result.get("is_unknown", True):
        return None

    return result["label"]


def try_word_sign_xgb(rgb: np.ndarray) -> str | None:
    """Legacy XGBoost word sign detection (used when TCN not available)."""
    global _hold_label, _hold_start, _wrist_history

    if word_sign_predictor is None:
        return None

    if word_sign_extractor:
        result = word_sign_extractor.extract(rgb)
        if result and result.found and result.raw_landmarks is not None:
            raw   = result.raw_landmarks.reshape(21, 3)
            wrist = (float(raw[0, 0]), float(raw[0, 1]))
            _wrist_history.append(wrist)

    if len(_wrist_history) < 6:
        return None

    positions  = np.array(_wrist_history)
    total_disp = float(np.sum(np.linalg.norm(np.diff(positions, axis=0), axis=1)))
    if total_disp <= 0.05:
        _hold_label = ""
        _hold_start = 0.0
        return None

    pred = word_sign_predictor.predict_from_rgb(rgb)
    if not pred.hand_detected or pred.label == "nothing" or pred.confidence < 0.70:
        _hold_label = ""
        _hold_start = 0.0
        return None

    candidate = pred.label
    now       = time.time()

    if candidate != _hold_label:
        _hold_label = candidate
        _hold_start = now
        return None

    if now - _hold_start < 0.25:
        return None

    last_fired = _last_word_time.get(candidate, 0.0)
    if now - last_fired < 2.0:
        return None

    _last_word_time[candidate] = now
    _hold_label = ""
    _hold_start = 0.0
    return candidate


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":        "ok",
        "tcn_available": _tcn_available,
        "tcn_language":  tcn_predictor.language if tcn_predictor else None,
        "tcn_mode":      "segmented",
    }), 200


@app.route("/switch_language", methods=["POST"])
def switch_language():
    """Switch the TCN model between ASL and FSL at runtime."""
    if tcn_predictor is None:
        return jsonify({"error": "TCN not available"}), 503

    payload  = request.get_json(silent=True) or {}
    language = payload.get("language", "asl")

    if language not in ("fsl20",):
        return jsonify({"error": "language must be 'fsl20'"}), 400

    try:
        tcn_predictor.switch_language(language)
        return jsonify({
            "status":   "ok",
            "language": tcn_predictor.language,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}

    if "image" not in payload:
        return jsonify({"error": "Missing 'image' field"}), 400

    try:
        rgb = decode_base64_image(payload["image"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    mode           = payload.get("mode", "asl")
    detection_mode = payload.get("detection_mode", "alphabet")

    # ── Words mode: TCN / word signs only, skip fingerspelling ────────────────
    if detection_mode == "words":
        dynamic_sign = None

        if _tcn_available:
            dynamic_sign = try_tcn_sign(rgb)
        elif word_sign_predictor is not None:
            dynamic_sign = try_word_sign_xgb(rgb)

        if dynamic_sign is not None:
            return jsonify({
                "label":         dynamic_sign,
                "confidence":    1.0,
                "hand_detected": True,
                "hand_count":    1,
                "is_word_sign":  True,
            }), 200

        # Still collecting — return empty result
        return jsonify({
            "label":         "...",
            "confidence":    0.0,
            "hand_detected": False,
            "hand_count":    0,
            "is_word_sign":  False,
        }), 200

    # ── Alphabet mode: XGBoost fingerspelling only ────────────────────────────
    if mode == "fsl":
        letter_result = fsl_predictor.predict_from_rgb(rgb)
    elif mode == "both":
        asl_result = asl_predictor.predict_from_rgb(rgb)
        fsl_result = fsl_predictor.predict_from_rgb(rgb)
        letter_result = asl_result if asl_result.confidence >= fsl_result.confidence else fsl_result
    else:
        letter_result = asl_predictor.predict_from_rgb(rgb)

    # Track fingerspelling activity (for future use / logging)
    tcn_is_idle = (not _tcn_available) or (tcn_predictor.state == "WAITING")
    if (tcn_is_idle and
            letter_result.hand_detected and
            letter_result.label != "nothing" and
            letter_result.confidence > 0.7):
        _recent_letters.append(time.time())

    result = letter_result.to_dict()
    result["is_word_sign"] = False
    return jsonify(result), 200


@app.route("/tcn_state", methods=["GET"])
def tcn_state():
    """Returns the current segmentation state (waiting/signing) for UI feedback."""
    if tcn_predictor is None:
        return jsonify({"error": "TCN not available"}), 503
    return jsonify({
        "state":       tcn_predictor.state,
        "frame_count": tcn_predictor.sign_frame_count,
    }), 200


if __name__ == "__main__":
    port  = int(os.getenv("PORT", str(DEFAULT_PORT)))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)