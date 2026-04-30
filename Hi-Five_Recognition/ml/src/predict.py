"""
Single-frame ASL alphabet inference.

This module is the bridge between a raw image and a label. The Flask
layer should not know about MediaPipe, normalization, or XGBoost — it
just calls AslPredictor.predict_from_rgb(image) and gets back a result.

The "nothing" class is handled here, not in XGBoost. If MediaPipe finds
no hand in the frame, we short-circuit and return label="nothing". This
matches what the user actually wants ("there's no sign in front of the
camera") and keeps the trained model focused on the 28 real signs.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from xgboost import XGBClassifier

from .landmarks import HandLandmarkExtractor

NOTHING_LABEL = "nothing"


@dataclass
class Prediction:
    """Result of a single-frame prediction."""
    label: str
    confidence: float        # 0.0 - 1.0
    hand_detected: bool

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # Round confidence for cleaner JSON; full precision rarely matters.
        d["confidence"] = round(self.confidence, 4)
        return d


class AslPredictor:
    """
    Loads the trained model + label encoder once, then predicts on demand.

    Construct one instance per process (or per Flask app) and reuse it —
    loading the model is the expensive part, prediction itself is fast.

    Example:
        predictor = AslPredictor()
        pred = predictor.predict_from_rgb(rgb_ndarray)
        # -> Prediction(label='A', confidence=0.987, hand_detected=True)
    """

    def __init__(
        self,
        model_path: str | Path = "models/asl_xgb.json",
        encoder_path: str | Path = "models/label_encoder.pkl",
        landmarker_path: str | Path = "models/hand_landmarker.task",
    ) -> None:
        model_path = Path(model_path)
        encoder_path = Path(encoder_path)

        if not model_path.exists():
            raise FileNotFoundError(
                f"XGBoost model not found at {model_path}. "
                f"Train one first with: python -m src.train"
            )
        if not encoder_path.exists():
            raise FileNotFoundError(
                f"Label encoder not found at {encoder_path}. "
                f"Train one first with: python -m src.train"
            )

        self._clf = XGBClassifier()
        self._clf.load_model(str(model_path))
        self._encoder = joblib.load(encoder_path)
        self._extractor = HandLandmarkExtractor(model_path=str(landmarker_path))

    # --- Core prediction ----------------------------------------------------

    def predict_from_rgb(self, rgb_image: np.ndarray) -> Prediction:
        """
        Predict the ASL alphabet sign in a single RGB frame.

        Args:
            rgb_image: HxWx3 uint8 ndarray, RGB order. (cv2.imread gives BGR;
                       call cv2.cvtColor(img, cv2.COLOR_BGR2RGB) first.)

        Returns:
            Prediction. If no hand is detected, label='nothing' and
            hand_detected=False.
        """
        result = self._extractor.extract(rgb_image)
        if not result.found:
            return Prediction(
                label=NOTHING_LABEL,
                confidence=1.0,        # certain there's no hand to classify
                hand_detected=False,
            )

        # Reshape for sklearn API: (1, 63).
        features = result.normalized.reshape(1, -1)
        probs = self._clf.predict_proba(features)[0]
        best_idx = int(np.argmax(probs))
        label = str(self._encoder.inverse_transform([best_idx])[0])
        confidence = float(probs[best_idx])

        return Prediction(
            label=label,
            confidence=confidence,
            hand_detected=True,
        )

    # --- Convenience: top-K, useful for the frontend's "alternates" UI -----

    def predict_topk_from_rgb(self, rgb_image: np.ndarray, k: int = 3) -> dict[str, Any]:
        """
        Like predict_from_rgb, but returns the top-K alternatives too.

        Returns a dict like:
            {
                "label": "A",
                "confidence": 0.91,
                "hand_detected": True,
                "topk": [
                    {"label": "A", "confidence": 0.91},
                    {"label": "S", "confidence": 0.06},
                    {"label": "T", "confidence": 0.02},
                ],
            }
        """
        result = self._extractor.extract(rgb_image)
        if not result.found:
            return {
                "label": NOTHING_LABEL,
                "confidence": 1.0,
                "hand_detected": False,
                "topk": [{"label": NOTHING_LABEL, "confidence": 1.0}],
            }

        features = result.normalized.reshape(1, -1)
        probs = self._clf.predict_proba(features)[0]
        top_idx = np.argsort(probs)[::-1][:k]
        topk = [
            {
                "label": str(self._encoder.inverse_transform([int(i)])[0]),
                "confidence": round(float(probs[int(i)]), 4),
            }
            for i in top_idx
        ]
        return {
            "label": topk[0]["label"],
            "confidence": topk[0]["confidence"],
            "hand_detected": True,
            "topk": topk,
        }
