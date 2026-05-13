from __future__ import annotations

import base64
import io
import os

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

from src.predict import AslPredictor

DEFAULT_PORT = 3001
DEFAULT_ORIGINS = "http://localhost:5173"

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
print(f"[startup] FSL predictor ready. CORS allowed origins: {origins}")


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


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}

    if "image" not in payload:
        return jsonify({"error": "Missing 'image' field"}), 400

    try:
        rgb = decode_base64_image(payload["image"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    mode = payload.get("mode", "asl")

    if mode == "fsl":
        result = fsl_predictor.predict_from_rgb(rgb).to_dict()
    elif mode == "both":
        asl_result = asl_predictor.predict_from_rgb(rgb)
        fsl_result = fsl_predictor.predict_from_rgb(rgb)
        result = (
            asl_result if asl_result.confidence >= fsl_result.confidence else fsl_result
        ).to_dict()
    else:
        result = asl_predictor.predict_from_rgb(rgb).to_dict()

    return jsonify(result), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", str(DEFAULT_PORT)))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)