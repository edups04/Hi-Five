"""
mediapipe_extractor.py
-----------------------
Extracts MediaPipe hand and pose landmarks from a single RGB frame.

Returns raw landmark arrays for:
    - Left hand  (21 x 3)
    - Right hand (21 x 3)
    - Pose       (33 x 3) — we select 6 joints later

Hand presence flags:
    - left_hand_present  (0 or 1)
    - right_hand_present (0 or 1)
"""

from __future__ import annotations

import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# Pose landmark indices we care about
POSE_INDICES = {
    "left_shoulder":  11,
    "right_shoulder": 12,
    "left_elbow":     13,
    "right_elbow":    14,
    "left_wrist":     15,
    "right_wrist":    16,
}
POSE_IDX_LIST = [
    POSE_INDICES["left_shoulder"],
    POSE_INDICES["right_shoulder"],
    POSE_INDICES["left_elbow"],
    POSE_INDICES["right_elbow"],
    POSE_INDICES["left_wrist"],
    POSE_INDICES["right_wrist"],
]

NUM_HAND_LANDMARKS = 21
NUM_POSE_JOINTS    = 6
HAND_DIM           = NUM_HAND_LANDMARKS * 3   # 63
POSE_DIM           = NUM_POSE_JOINTS * 3      # 18


class FrameExtractor:
    """
    Extracts hand and pose landmarks from a single RGB frame.
    Create once and reuse across all frames for efficiency.
    """

    def __init__(
        self,
        hand_model_path: str = "models/hand_landmarker.task",
        pose_model_path: str = "models/pose_landmarker.task",
        min_hand_confidence: float = 0.3,
        min_pose_confidence: float = 0.3,
    ) -> None:
        # Hand landmarker
        hand_base    = mp_python.BaseOptions(model_asset_path=hand_model_path)
        hand_options = mp_vision.HandLandmarkerOptions(
            base_options=hand_base,
            num_hands=2,
            min_hand_detection_confidence=min_hand_confidence,
            min_hand_presence_confidence=min_hand_confidence,
            min_tracking_confidence=min_hand_confidence,
            running_mode=mp_vision.RunningMode.IMAGE,
        )
        self._hand_detector = mp_vision.HandLandmarker.create_from_options(hand_options)

        # Pose landmarker
        pose_base    = mp_python.BaseOptions(model_asset_path=pose_model_path)
        pose_options = mp_vision.PoseLandmarkerOptions(
            base_options=pose_base,
            min_pose_detection_confidence=min_pose_confidence,
            min_pose_presence_confidence=min_pose_confidence,
            min_tracking_confidence=min_pose_confidence,
            running_mode=mp_vision.RunningMode.IMAGE,
        )
        self._pose_detector = mp_vision.PoseLandmarker.create_from_options(pose_options)

    def extract(self, rgb_frame: np.ndarray) -> dict:
        """
        Extract landmarks from one RGB frame.

        Returns dict with:
            left_hand:          np.ndarray (63,) or zeros
            right_hand:         np.ndarray (63,) or zeros
            pose:               np.ndarray (18,) or zeros
            left_hand_present:  int (0 or 1)
            right_hand_present: int (0 or 1)
        """
        if rgb_frame.dtype != np.uint8:
            rgb_frame = rgb_frame.astype(np.uint8)

        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        left_hand  = np.zeros(HAND_DIM, dtype=np.float32)
        right_hand = np.zeros(HAND_DIM, dtype=np.float32)
        pose       = np.zeros(POSE_DIM, dtype=np.float32)
        left_present  = 0
        right_present = 0

        # ── Hand extraction ───────────────────────────────────────────────────
        hand_result = self._hand_detector.detect(mp_img)
        if hand_result.hand_landmarks and hand_result.handedness:
            for landmarks, handedness in zip(
                hand_result.hand_landmarks, hand_result.handedness
            ):
                label = handedness[0].category_name  # "Left" or "Right"
                coords = np.array(
                    [[lm.x, lm.y, lm.z] for lm in landmarks],
                    dtype=np.float32,
                ).flatten()

                if label == "Left":
                    left_hand    = coords
                    left_present = 1
                else:
                    right_hand    = coords
                    right_present = 1

        # ── Pose extraction ───────────────────────────────────────────────────
        pose_result = self._pose_detector.detect(mp_img)
        if pose_result.pose_landmarks:
            all_pose = pose_result.pose_landmarks[0]
            selected = []
            for idx in POSE_IDX_LIST:
                lm = all_pose[idx]
                selected.extend([lm.x, lm.y, lm.z])
            pose = np.array(selected, dtype=np.float32)

        return {
            "left_hand":          left_hand,
            "right_hand":         right_hand,
            "pose":               pose,
            "left_hand_present":  left_present,
            "right_hand_present": right_present,
        }

    def close(self) -> None:
        self._hand_detector.close()
        self._pose_detector.close()

    def __enter__(self) -> "FrameExtractor":
        return self

    def __exit__(self, *args) -> None:
        self.close()
