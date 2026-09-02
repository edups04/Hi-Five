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

# ── Motion gate config ────────────────────────────────────────────────────────
MOTION_WINDOW             = 12
MOTION_THRESHOLD          = 0.05
HOLD_DURATION             = 0.25
WORD_COOLDOWN             = 2.0
MIN_DISPLACEMENT          = 0.0
WORD_CONFIDENCE_THRESHOLD = 0.70
FINGERSPELL_WINDOW        = 3.0
FINGERSPELL_COUNT         = 3
FINGERSPELL_COOLDOWN      = 2.0
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)

origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if o.strip()
]
CORS(app, resources={r"/*": {"origins": origins}})

print("[startup] Loading ASL predictor ...")
asl_predictor = AslPredictor()
print("[startup] ASL predictor ready.")

print("[startup] Loading FSL predictor ...")
fsl_predictor = AslPredictor(
    model_path="models/fsl_xgb.json",
    encoder_path="models/fsl_label_encoder.pkl",
)
print("[startup] FSL predictor ready.")

# ── Word sign predictor (XGBoost — end pose) ─────────────────────────────────
word_sign_predictor: AslPredictor | None = None
word_sign_extractor: HandLandmarkExtractor | None = None

_word_model_path   = Path("models/word_signs_xgb.json")
_word_encoder_path = Path("models/word_signs_encoder.pkl")

if _word_model_path.exists() and _word_encoder_path.exists():
    try:
        word_sign_predictor = AslPredictor(
            model_path=str(_word_model_path),
            encoder_path=str(_word_encoder_path),
            use_word_features=True,
        )
        word_sign_extractor = word_sign_predictor._extractor
        print("[startup] Word-sign predictor ready.")
    except Exception as e:
        print(f"[startup] Word-sign predictor failed to load: {e}")
else:
    print("[startup] No word-sign model found — word detection disabled.")

# ── Per-session motion state ──────────────────────────────────────────────────
_wrist_history:         deque[tuple[float, float]] = deque(maxlen=MOTION_WINDOW)
_hold_label:            str   = ""
_hold_start:            float = 0.0
_last_word_time:        dict[str, float] = {}
_recent_letters:        list[float] = []
_last_fingerspell_time: float = 0.0
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


def wrist_from_rgb(rgb: np.ndarray) -> tuple[float, float] | None:
    if word_sign_extractor is None:
        return None
    result = word_sign_extractor.extract(rgb)
    if result is None or not result.found or result.raw_landmarks is None:
        return None
    raw = result.raw_landmarks.reshape(21, 3)
    return float(raw[0, 0]), float(raw[0, 1])


def is_hand_moving() -> bool:
    if len(_wrist_history) < MOTION_WINDOW // 2:
        return False
    positions  = np.array(_wrist_history)
    total_disp = float(np.sum(np.linalg.norm(np.diff(positions, axis=0), axis=1)))
    return total_disp > MOTION_THRESHOLD


def is_fingerspelling() -> bool:
    global _recent_letters
    now = time.time()
    _recent_letters = [t for t in _recent_letters if now - t < FINGERSPELL_WINDOW]
    return len(_recent_letters) >= FINGERSPELL_COUNT


def try_word_sign(rgb: np.ndarray) -> str | None:
    global _hold_label, _hold_start

    if word_sign_predictor is None:
        return None

    if not is_hand_moving():
        _hold_label = ""
        _hold_start = 0.0
        return None

    pred = word_sign_predictor.predict_from_rgb(rgb)
    if not pred.hand_detected or pred.label == "nothing":
        _hold_label = ""
        _hold_start = 0.0
        return None

    if pred.confidence < WORD_CONFIDENCE_THRESHOLD:
        _hold_label = ""
        _hold_start = 0.0
        return None

    candidate = pred.label
    now = time.time()

    if candidate != _hold_label:
        _hold_label = candidate
        _hold_start = now
        return None

    held = now - _hold_start

    held = now - _hold_start
    if held > 1000:
        _hold_start = now
        return None

    if held < HOLD_DURATION:
        return None

    last_fired = _last_word_time.get(candidate, 0.0)
    if now - last_fired < WORD_COOLDOWN:
        return None

    _last_word_time[candidate] = now
    _hold_label = ""
    _hold_start = 0.0
    return candidate


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/predict", methods=["POST"])
def predict():
    global _wrist_history

    payload = request.get_json(silent=True) or {}

    if "image" not in payload:
        return jsonify({"error": "Missing 'image' field"}), 400

    try:
        rgb = decode_base64_image(payload["image"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    mode = payload.get("mode", "asl")

    wrist = wrist_from_rgb(rgb)
    if wrist:
        _wrist_history.append(wrist)

    word = try_word_sign(rgb)

    if mode == "fsl":
        letter_result = fsl_predictor.predict_from_rgb(rgb)
    elif mode == "both":
        asl_result = asl_predictor.predict_from_rgb(rgb)
        fsl_result = fsl_predictor.predict_from_rgb(rgb)
        letter_result = asl_result if asl_result.confidence >= fsl_result.confidence else fsl_result
    else:
        letter_result = asl_predictor.predict_from_rgb(rgb)

    if word is not None and not is_fingerspelling():
        return jsonify({
            "label":         word,
            "confidence":    1.0,
            "hand_detected": True,
            "hand_count":    1,
            "is_word_sign":  True,
        }), 200

    if (letter_result.hand_detected and
            letter_result.label != "nothing" and
            letter_result.confidence > 0.7):
        _recent_letters.append(time.time())

    result = letter_result.to_dict()
    result["is_word_sign"] = False
    return jsonify(result), 200


if __name__ == "__main__":
    port  = int(os.getenv("PORT", str(DEFAULT_PORT)))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
