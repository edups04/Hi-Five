"""
Hi-Five ML server (Flask).

A small HTTP server that wraps the trained ASL alphabet model. The React
frontend sends base64-encoded webcam frames to /predict and gets back a
label + confidence for each frame.

Endpoints:
    GET  /health    Liveness check. Returns {"status": "ok"} if the model loaded.
    POST /predict   Per-frame ASL prediction.

POST /predict request body:
    {
        "image": "data:image/jpeg;base64,...."   # data URL or bare base64 OK
    }

Response:
    {
        "label": "A",
        "confidence": 0.987,
        "hand_detected": true
    }

CORS:
    Allowed origin defaults to http://localhost:5173 (Vite). Override
    with the ALLOWED_ORIGINS env var (comma-separated) in production.

Run:
    python app.py
    # Server on http://localhost:3001
"""

from __future__ import annotations

import base64
import io
import os

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

from src.predict import AslPredictor

# ----- Config ----------------------------------------------------------------

DEFAULT_PORT = 3001
DEFAULT_ORIGINS = "http://localhost:5173"


# ----- App setup -------------------------------------------------------------

app = Flask(__name__)

# Allow only the Vite dev server by default. In prod, set ALLOWED_ORIGINS to
# your real domain(s), comma-separated.
origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if o.strip()
]
CORS(app, resources={r"/*": {"origins": origins}})

# Load the predictor ONCE at startup. If we lazy-loaded on the first request,
# the first prediction would take ~3 seconds (MediaPipe init + model load),
# which feels broken to a user. Pay the cost up front.
print("[startup] Loading ASL predictor ...")
predictor = AslPredictor()
print(f"[startup] Predictor ready. CORS allowed origins: {origins}")


# ----- Helpers ---------------------------------------------------------------

def decode_base64_image(b64: str) -> np.ndarray:
    """
    Accept a data URL ('data:image/jpeg;base64,....') or a bare base64 string.

    Returns: HxWx3 uint8 ndarray in RGB order (what the predictor expects).
    Raises: ValueError on malformed input.
    """
    # Strip the data-URL prefix if present.
    if "," in b64 and b64.lstrip().startswith("data:"):
        b64 = b64.split(",", 1)[1]

    try:
        raw = base64.b64decode(b64, validate=False)
    except Exception as e:
        raise ValueError(f"Invalid base64 payload: {e}")

    # PIL handles JPEG/PNG/WebP transparently — MediaRecorder and canvas.toDataURL
    # can produce any of these depending on browser. .convert("RGB") drops alpha.
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Could not decode image: {e}")
    return np.asarray(img, dtype=np.uint8)


# ----- Routes ----------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    """Simple liveness probe. Tells you the model loaded OK."""
    return jsonify({"status": "ok"}), 200


@app.route("/predict", methods=["POST"])
def predict():
    """Per-frame ASL alphabet prediction."""
    payload = request.get_json(silent=True) or {}

    if "image" not in payload:
        return jsonify({"error": "Missing 'image' field"}), 400

    try:
        rgb = decode_base64_image(payload["image"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    result = predictor.predict_from_rgb(rgb).to_dict()
    return jsonify(result), 200


# ----- Entrypoint ------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", str(DEFAULT_PORT)))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    # 0.0.0.0 so it's reachable from other devices on the LAN if you want
    # to demo from a phone. localhost-only would be 127.0.0.1.
    app.run(host="0.0.0.0", port=port, debug=debug)
