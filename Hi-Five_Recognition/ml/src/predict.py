from __future__ import annotations

from cProfile import label
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
    label: str
    confidence: float
    hand_detected: bool
    hand_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["confidence"] = round(self.confidence, 4)
        return d

class AslPredictor:
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


    def predict_from_rgb(self, rgb_image: np.ndarray) -> Prediction:
        result = self._extractor.extract(rgb_image)
        if not result.found:
            return Prediction(
            label=NOTHING_LABEL,
            confidence=1.0,
            hand_detected=False,
            hand_count=0,
        )

        features = result.normalized.reshape(1, -1)
        probs = self._clf.predict_proba(features)[0]
        best_idx = int(np.argmax(probs))
        label = str(self._encoder.inverse_transform([best_idx])[0])
        confidence = float(probs[best_idx])

        return Prediction(
            label=label,
            confidence=confidence,
            hand_detected=True,
            hand_count=result.hand_count,
        )


    def predict_topk_from_rgb(self, rgb_image: np.ndarray, k: int = 3) -> dict[str, Any]:
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
        