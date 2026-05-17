from __future__ import annotations

import os
import urllib.request
from dataclasses import dataclass
from typing import Optional

import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision


NUM_LANDMARKS = 21          
COORDS_PER_LANDMARK = 3     
RAW_FEATURE_DIM = NUM_LANDMARKS * COORDS_PER_LANDMARK  
ENGINEERED_FEATURE_DIM = 27
FEATURE_DIM = RAW_FEATURE_DIM + ENGINEERED_FEATURE_DIM 

WRIST_IDX = 0               
MIDDLE_FINGER_MCP_IDX = 9   

FINGER_INDICES = {
    "thumb":  {"cmc": 1,  "mcp": 2,  "ip": 3,   "tip": 4},
    "index":  {"mcp": 5,  "pip": 6,  "dip": 7,  "tip": 8},
    "middle": {"mcp": 9,  "pip": 10, "dip": 11, "tip": 12},
    "ring":   {"mcp": 13, "pip": 14, "dip": 15, "tip": 16},
    "pinky":  {"mcp": 17, "pip": 18, "dip": 19, "tip": 20},
}

FINGER_MCPS = [5, 9, 13, 17]   
FINGER_TIPS = [8, 12, 16, 20]   
THUMB_TIP = 4

HAND_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)



def normalize_landmarks(landmarks_flat: np.ndarray) -> np.ndarray:
    arr = np.asarray(landmarks_flat, dtype=np.float32).reshape(NUM_LANDMARKS, COORDS_PER_LANDMARK)
    wrist = arr[WRIST_IDX]
    arr = arr - wrist
    hand_size = float(np.linalg.norm(arr[MIDDLE_FINGER_MCP_IDX]))
    if hand_size > 0.0:
        arr = arr / hand_size
    return arr.flatten().astype(np.float32)


def engineer_features(normalized_flat: np.ndarray) -> np.ndarray:
    arr = np.asarray(normalized_flat, dtype=np.float32).reshape(NUM_LANDMARKS, COORDS_PER_LANDMARK)
    features: list[float] = []

    thumb_tip = arr[THUMB_TIP]
    palm_center = arr[MIDDLE_FINGER_MCP_IDX]

    for mcp_idx in FINGER_MCPS:
        features.append(float(np.linalg.norm(thumb_tip - arr[mcp_idx])))

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

    for tip_idx in FINGER_TIPS:
        features.append(float(np.linalg.norm(thumb_tip - arr[tip_idx])))

    for i in range(len(FINGER_TIPS)):
        for j in range(i + 1, len(FINGER_TIPS)):
            features.append(float(np.linalg.norm(arr[FINGER_TIPS[i]] - arr[FINGER_TIPS[j]])))

    fingertip_palm_distances = [
        float(np.linalg.norm(arr[tip_idx] - palm_center)) for tip_idx in FINGER_TIPS
    ]
    features.extend(fingertip_palm_distances)

    delta = thumb_tip - palm_center
    features.append(float(delta[0]))
    features.append(float(delta[1]))
    features.append(float(delta[2]))

    features.append(float(np.mean(fingertip_palm_distances)))

    out = np.array(features, dtype=np.float32)
    assert out.shape == (ENGINEERED_FEATURE_DIM,), (
        f"Engineered features have wrong shape: {out.shape}, expected ({ENGINEERED_FEATURE_DIM},)"
    )
    return out


def build_feature_vector(landmarks_flat: np.ndarray) -> np.ndarray:
    normalized = normalize_landmarks(landmarks_flat)
    engineered = engineer_features(normalized)
    return np.concatenate([normalized, engineered]).astype(np.float32)


@dataclass
class LandmarkResult:
    """Result of running the extractor on one image."""
    found: bool
    raw_landmarks: Optional[np.ndarray]  
    normalized: Optional[np.ndarray]      


class HandLandmarkExtractor:
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
            running_mode=mp_vision.RunningMode.IMAGE,
        )
        self._detector = mp_vision.HandLandmarker.create_from_options(options)

    def extract(self, rgb_image: np.ndarray) -> LandmarkResult:
        if rgb_image.dtype != np.uint8:
            rgb_image = rgb_image.astype(np.uint8)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        result = self._detector.detect(mp_image)

        if not result.hand_landmarks:
            return LandmarkResult(found=False, raw_landmarks=None, normalized=None)

        hand = result.hand_landmarks[0]  
        raw = np.array([[lm.x, lm.y, lm.z] for lm in hand], dtype=np.float32).flatten()
        return LandmarkResult(
            found=True,
            raw_landmarks=raw,
            normalized=build_feature_vector(raw),
        )

    def close(self) -> None:
        self._detector.close()

    def __enter__(self) -> "HandLandmarkExtractor":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
