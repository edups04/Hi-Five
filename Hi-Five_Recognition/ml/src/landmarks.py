"""
Shared MediaPipe HandLandmarker + wrist-centered normalization.

This module is the single source of truth for how a frame becomes a
63-dimensional feature vector. Both the XGBoost alphabet pipeline and
the future LSTM word-level pipeline import from here, so the feature
representation stays identical across models.

Public API:
    HandLandmarkExtractor       — wraps MediaPipe Tasks HandLandmarker
    normalize_landmarks(arr)    — wrist-centered, scale-normalized 63-vector
    NUM_LANDMARKS, FEATURE_DIM  — constants (21, 63)
"""

from __future__ import annotations

import os
import urllib.request
from dataclasses import dataclass
from typing import Optional

import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# --- Constants ---------------------------------------------------------------

NUM_LANDMARKS = 21          # MediaPipe returns 21 hand keypoints
COORDS_PER_LANDMARK = 3     # x, y, z
FEATURE_DIM = NUM_LANDMARKS * COORDS_PER_LANDMARK  # 63

WRIST_IDX = 0               # MediaPipe landmark index for the wrist
MIDDLE_FINGER_MCP_IDX = 12  # used as the scale reference (knuckle of middle finger)

# Official Google-hosted HandLandmarker task file. Full-precision (float32) is
# more accurate than float16 and the size difference is negligible for our use.
HAND_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)


# --- Normalization -----------------------------------------------------------

def normalize_landmarks(landmarks_flat: np.ndarray) -> np.ndarray:
    """
    Wrist-centered, scale-normalized landmark vector.

    Steps:
      1. Translate so the wrist (landmark 0) is at the origin.
      2. Scale so the distance from wrist to middle-finger MCP (landmark 12)
         is 1.0. This makes the representation invariant to:
           - hand distance from camera
           - absolute hand size (different users)
           - absolute position in frame

    Args:
        landmarks_flat: shape (63,) array of [x0, y0, z0, x1, y1, z1, ...].

    Returns:
        shape (63,) normalized vector. If the hand size is degenerate
        (zero-length, which should basically never happen for a real hand),
        returns the wrist-centered vector without scaling.
    """
    arr = np.asarray(landmarks_flat, dtype=np.float32).reshape(NUM_LANDMARKS, COORDS_PER_LANDMARK)
    wrist = arr[WRIST_IDX]
    arr = arr - wrist
    hand_size = float(np.linalg.norm(arr[MIDDLE_FINGER_MCP_IDX]))
    if hand_size > 0.0:
        arr = arr / hand_size
    return arr.flatten().astype(np.float32)


# --- HandLandmarker wrapper --------------------------------------------------

@dataclass
class LandmarkResult:
    """Result of running the extractor on one image."""
    found: bool
    raw_landmarks: Optional[np.ndarray]   # shape (63,), un-normalized, or None
    normalized: Optional[np.ndarray]      # shape (63,), wrist-normalized, or None


class HandLandmarkExtractor:
    """
    Thin wrapper around MediaPipe Tasks HandLandmarker.

    Usage:
        extractor = HandLandmarkExtractor()  # downloads the .task file if needed
        result = extractor.extract(rgb_image)  # rgb_image is HxWx3 uint8 RGB ndarray
        if result.found:
            features = result.normalized  # ready for XGBoost

    Notes:
      - This class is NOT thread-safe. Create one per worker / per request handler,
        or guard with a lock.
      - num_hands=1 because ASL alphabet is single-handed. For two-handed signs in
        the WLASL stage, instantiate a second extractor with num_hands=2.
    """

    def __init__(
        self,
        model_path: str = "models/hand_landmarker.task",
        num_hands: int = 1,
        min_detection_confidence: float = 0.5,
        min_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        auto_download: bool = True,
    ) -> None:
        if not os.path.exists(model_path):
            if not auto_download:
                raise FileNotFoundError(
                    f"HandLandmarker model not found at {model_path}. "
                    f"Either download manually from {HAND_LANDMARKER_URL} "
                    f"or pass auto_download=True."
                )
            os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
            print(f"[landmarks] Downloading HandLandmarker model -> {model_path}")
            urllib.request.urlretrieve(HAND_LANDMARKER_URL, model_path)
            print("[landmarks] Download complete.")

        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = mp_vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=num_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_hand_presence_confidence=min_presence_confidence,
            min_tracking_confidence=min_tracking_confidence,
            running_mode=mp_vision.RunningMode.IMAGE,  # IMAGE mode = synchronous, what we want
        )
        self._detector = mp_vision.HandLandmarker.create_from_options(options)

    def extract(self, rgb_image: np.ndarray) -> LandmarkResult:
        """
        Run the detector on a single RGB image.

        Args:
            rgb_image: HxWx3 uint8 ndarray, RGB order (NOT BGR).

        Returns:
            LandmarkResult. If no hand is found, found=False and arrays are None.
        """
        if rgb_image.dtype != np.uint8:
            rgb_image = rgb_image.astype(np.uint8)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        result = self._detector.detect(mp_image)

        if not result.hand_landmarks:
            return LandmarkResult(found=False, raw_landmarks=None, normalized=None)

        hand = result.hand_landmarks[0]  # we set num_hands=1
        raw = np.array([[lm.x, lm.y, lm.z] for lm in hand], dtype=np.float32).flatten()
        return LandmarkResult(
            found=True,
            raw_landmarks=raw,
            normalized=normalize_landmarks(raw),
        )

    def close(self) -> None:
        """Release the underlying MediaPipe resources."""
        self._detector.close()

    def __enter__(self) -> "HandLandmarkExtractor":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
