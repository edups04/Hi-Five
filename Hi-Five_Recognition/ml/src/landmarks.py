"""
<<<<<<< HEAD
Shared MediaPipe HandLandmarker + wrist-centered normalization + engineered features.

This module is the single source of truth for how a frame becomes a
feature vector. Both the XGBoost alphabet pipeline and the future LSTM
word-level pipeline import from here, so the feature representation stays
identical across models.

Feature vector composition (90 features total):
  - First 63: wrist-centered, scale-normalized raw landmarks (x0,y0,z0,...,x20,y20,z20).
  - Last 27 : engineered features focused on disambiguating closed-fist
              letters (M, N, T, A, S, E) which the raw landmark vector
              struggles with. See `engineer_features` below for details.
=======
Shared MediaPipe HandLandmarker + wrist-centered normalization.

This module is the single source of truth for how a frame becomes a
63-dimensional feature vector. Both the XGBoost alphabet pipeline and
the future LSTM word-level pipeline import from here, so the feature
representation stays identical across models.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f

Public API:
    HandLandmarkExtractor       — wraps MediaPipe Tasks HandLandmarker
    normalize_landmarks(arr)    — wrist-centered, scale-normalized 63-vector
<<<<<<< HEAD
    engineer_features(arr)      — 27 derived features for fist discrimination
    build_feature_vector(arr)   — concatenates the above into the 90-dim vector
    NUM_LANDMARKS, FEATURE_DIM  — constants (21, 90)
=======
    NUM_LANDMARKS, FEATURE_DIM  — constants (21, 63)
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
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
<<<<<<< HEAD
RAW_FEATURE_DIM = NUM_LANDMARKS * COORDS_PER_LANDMARK  # 63
ENGINEERED_FEATURE_DIM = 27
FEATURE_DIM = RAW_FEATURE_DIM + ENGINEERED_FEATURE_DIM  # 90

WRIST_IDX = 0               # MediaPipe landmark index for the wrist
MIDDLE_FINGER_MCP_IDX = 9   # knuckle of middle finger (scale reference)

# Finger indices, named for clarity. Each finger has 4 landmarks: MCP (base
# knuckle), PIP, DIP, TIP.
FINGER_INDICES = {
    "thumb":  {"cmc": 1,  "mcp": 2,  "ip": 3,   "tip": 4},
    "index":  {"mcp": 5,  "pip": 6,  "dip": 7,  "tip": 8},
    "middle": {"mcp": 9,  "pip": 10, "dip": 11, "tip": 12},
    "ring":   {"mcp": 13, "pip": 14, "dip": 15, "tip": 16},
    "pinky":  {"mcp": 17, "pip": 18, "dip": 19, "tip": 20},
}

# Tip indices for the four non-thumb fingers (used in many derived features).
FINGER_MCPS = [5, 9, 13, 17]    # index, middle, ring, pinky MCPs
FINGER_TIPS = [8, 12, 16, 20]   # index, middle, ring, pinky tips
THUMB_TIP = 4

# Official Google-hosted HandLandmarker task file.
=======
FEATURE_DIM = NUM_LANDMARKS * COORDS_PER_LANDMARK  # 63

WRIST_IDX = 0               # MediaPipe landmark index for the wrist
MIDDLE_FINGER_MCP_IDX = 12  # used as the scale reference (knuckle of middle finger)

# Official Google-hosted HandLandmarker task file. Full-precision (float32) is
# more accurate than float16 and the size difference is negligible for our use.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
HAND_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)


<<<<<<< HEAD
# --- Raw landmark normalization ----------------------------------------------
=======
# --- Normalization -----------------------------------------------------------
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f

def normalize_landmarks(landmarks_flat: np.ndarray) -> np.ndarray:
    """
    Wrist-centered, scale-normalized landmark vector.

    Steps:
      1. Translate so the wrist (landmark 0) is at the origin.
<<<<<<< HEAD
      2. Scale so the distance from wrist to middle-finger MCP (landmark 9)
=======
      2. Scale so the distance from wrist to middle-finger MCP (landmark 12)
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
         is 1.0. This makes the representation invariant to:
           - hand distance from camera
           - absolute hand size (different users)
           - absolute position in frame

    Args:
        landmarks_flat: shape (63,) array of [x0, y0, z0, x1, y1, z1, ...].

    Returns:
        shape (63,) normalized vector. If the hand size is degenerate
<<<<<<< HEAD
        (zero-length, basically never happens for a real hand), returns
        the wrist-centered vector without scaling.
=======
        (zero-length, which should basically never happen for a real hand),
        returns the wrist-centered vector without scaling.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
    """
    arr = np.asarray(landmarks_flat, dtype=np.float32).reshape(NUM_LANDMARKS, COORDS_PER_LANDMARK)
    wrist = arr[WRIST_IDX]
    arr = arr - wrist
    hand_size = float(np.linalg.norm(arr[MIDDLE_FINGER_MCP_IDX]))
    if hand_size > 0.0:
        arr = arr / hand_size
    return arr.flatten().astype(np.float32)


<<<<<<< HEAD
# --- Engineered features -----------------------------------------------------

def engineer_features(normalized_flat: np.ndarray) -> np.ndarray:
    """
    Compute 27 engineered features from already-normalized landmarks.

    These features are specifically designed to help discriminate closed-fist
    letters (M, N, T, A, S, E) where the raw landmark vector underperforms.
    The signal these letters need — "is the thumb under the fingers, and how
    far in?" — is technically present in the 63 raw values but hard for
    XGBoost to learn from low-dimensional input. Pre-computing it
    explicitly gives the classifier a much easier job.

    Feature breakdown:
      [0..3]   (4)  Thumb tip → each finger MCP distance.
                    Tight differences here separate M from N from T.
      [4..8]   (5)  Per-finger curl ratio: tip-to-base direct distance / sum of
                    bone lengths along the finger. Low ratio = curled finger.
                    All closed-fist letters have low ratios on index/middle/ring/pinky;
                    T/M/N differ in thumb curl pattern.
      [9..12]  (4)  Thumb tip → each fingertip distance.
                    T: thumb is between index/middle tips (small distances).
                    M/N: thumb is hidden under fingers (large distances to tips).
      [13..18] (6)  Pairwise distances between the 4 non-thumb fingertips.
                    Captures whether fingers are spread or together.
      [19..22] (4)  Distance from each non-thumb fingertip to the palm center
                    (middle MCP). Per-finger "extension" signal.
      [23..25] (3)  Thumb tip xyz deviation from palm center.
                    T: thumb pokes forward (large +x or +z).
                    M/N: thumb tucked behind (negative deltas).
      [26]     (1)  Mean fingertip-to-palm distance.
                    Overall "openness" of the hand — closed fist vs open palm.

    Returns: shape (27,) float32 array.
    """
    arr = np.asarray(normalized_flat, dtype=np.float32).reshape(NUM_LANDMARKS, COORDS_PER_LANDMARK)
    features: list[float] = []

    thumb_tip = arr[THUMB_TIP]
    palm_center = arr[MIDDLE_FINGER_MCP_IDX]

    # [0..3] Thumb tip → each non-thumb finger MCP distance (4 features)
    for mcp_idx in FINGER_MCPS:
        features.append(float(np.linalg.norm(thumb_tip - arr[mcp_idx])))

    # [4..8] Per-finger curl ratios (5 features)
    # ratio = direct base-to-tip distance / sum of bone lengths along the finger.
    # Extended finger ≈ 1.0; fully curled finger approaches 0.
    for finger_name in ["thumb", "index", "middle", "ring", "pinky"]:
        joints = FINGER_INDICES[finger_name]
        if finger_name == "thumb":
            chain = [joints["cmc"], joints["mcp"], joints["ip"], joints["tip"]]
        else:
            chain = [joints["mcp"], joints["pip"], joints["dip"], joints["tip"]]

        direct = float(np.linalg.norm(arr[chain[-1]] - arr[chain[0]]))
        bone_sum = 0.0
        for i in range(len(chain) - 1):
            bone_sum += float(np.linalg.norm(arr[chain[i + 1]] - arr[chain[i]]))
        ratio = (direct / bone_sum) if bone_sum > 1e-6 else 0.0
        features.append(ratio)

    # [9..12] Thumb tip → each non-thumb fingertip distance (4 features)
    for tip_idx in FINGER_TIPS:
        features.append(float(np.linalg.norm(thumb_tip - arr[tip_idx])))

    # [13..18] Pairwise distances between non-thumb fingertips (6 features)
    # 4 choose 2 = 6 pairs: (index,middle), (index,ring), (index,pinky),
    #                       (middle,ring), (middle,pinky), (ring,pinky)
    for i in range(len(FINGER_TIPS)):
        for j in range(i + 1, len(FINGER_TIPS)):
            features.append(float(np.linalg.norm(arr[FINGER_TIPS[i]] - arr[FINGER_TIPS[j]])))

    # [19..22] Each non-thumb fingertip → palm center distance (4 features)
    fingertip_palm_distances = [
        float(np.linalg.norm(arr[tip_idx] - palm_center)) for tip_idx in FINGER_TIPS
    ]
    features.extend(fingertip_palm_distances)

    # [23..25] Thumb tip xyz deviation from palm center (3 features)
    delta = thumb_tip - palm_center
    features.append(float(delta[0]))
    features.append(float(delta[1]))
    features.append(float(delta[2]))

    # [26] Mean fingertip-to-palm-center distance (1 feature) — hand openness
    features.append(float(np.mean(fingertip_palm_distances)))

    out = np.array(features, dtype=np.float32)
    assert out.shape == (ENGINEERED_FEATURE_DIM,), (
        f"Engineered features have wrong shape: {out.shape}, expected ({ENGINEERED_FEATURE_DIM},)"
    )
    return out


def build_feature_vector(landmarks_flat: np.ndarray) -> np.ndarray:
    """
    Convenience wrapper: raw landmarks (63,) → full feature vector (90,).

    Steps:
      1. Wrist-center and scale-normalize the raw landmarks.
      2. Compute 27 engineered features from the normalized result.
      3. Concatenate normalized + engineered → 90-dim vector.
    """
    normalized = normalize_landmarks(landmarks_flat)
    engineered = engineer_features(normalized)
    return np.concatenate([normalized, engineered]).astype(np.float32)


=======
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
# --- HandLandmarker wrapper --------------------------------------------------

@dataclass
class LandmarkResult:
    """Result of running the extractor on one image."""
    found: bool
    raw_landmarks: Optional[np.ndarray]   # shape (63,), un-normalized, or None
<<<<<<< HEAD
    normalized: Optional[np.ndarray]      # shape (90,), normalized + engineered, or None
=======
    normalized: Optional[np.ndarray]      # shape (63,), wrist-normalized, or None
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f


class HandLandmarkExtractor:
    """
    Thin wrapper around MediaPipe Tasks HandLandmarker.

    Usage:
        extractor = HandLandmarkExtractor()  # downloads the .task file if needed
        result = extractor.extract(rgb_image)  # rgb_image is HxWx3 uint8 RGB ndarray
        if result.found:
<<<<<<< HEAD
            features = result.normalized  # shape (90,), ready for XGBoost
=======
            features = result.normalized  # ready for XGBoost
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f

    Notes:
      - This class is NOT thread-safe. Create one per worker / per request handler,
        or guard with a lock.
<<<<<<< HEAD
      - num_hands=1 because ASL alphabet is single-handed.
=======
      - num_hands=1 because ASL alphabet is single-handed. For two-handed signs in
        the WLASL stage, instantiate a second extractor with num_hands=2.
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
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
<<<<<<< HEAD
            running_mode=mp_vision.RunningMode.IMAGE,
=======
            running_mode=mp_vision.RunningMode.IMAGE,  # IMAGE mode = synchronous, what we want
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
        )
        self._detector = mp_vision.HandLandmarker.create_from_options(options)

    def extract(self, rgb_image: np.ndarray) -> LandmarkResult:
        """
        Run the detector on a single RGB image.

        Args:
            rgb_image: HxWx3 uint8 ndarray, RGB order (NOT BGR).

        Returns:
            LandmarkResult. If no hand is found, found=False and arrays are None.
<<<<<<< HEAD
            If found=True, `normalized` is shape (90,): the 63 wrist-normalized
            landmarks concatenated with 27 engineered features.
=======
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
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
<<<<<<< HEAD
            normalized=build_feature_vector(raw),
=======
            normalized=normalize_landmarks(raw),
>>>>>>> 4223b98f78c3d8d11e30c357874cd2be4ce5721f
        )

    def close(self) -> None:
        """Release the underlying MediaPipe resources."""
        self._detector.close()

    def __enter__(self) -> "HandLandmarkExtractor":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
