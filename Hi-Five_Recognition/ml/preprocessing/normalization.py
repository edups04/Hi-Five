"""
normalization.py
-----------------
Normalizes hand and pose landmarks so that recognition is less sensitive to:
    - signer position
    - camera distance
    - hand size
    - body size
    - camera framing

Apply the SAME normalization during training, validation, testing,
and real-time inference.
"""

from __future__ import annotations

import numpy as np

NUM_HAND_LANDMARKS = 21
NUM_POSE_JOINTS    = 6


def normalize_hand(hand_flat: np.ndarray, present: int) -> np.ndarray:
    """
    Normalize a single hand's landmarks.

    Strategy:
        1. Translate so wrist (landmark 0) is at origin.
        2. Scale by the distance from wrist to middle finger MCP (landmark 9).
           This makes the normalization invariant to hand size and camera distance.

    If hand is not present (present == 0), returns zeros unchanged.

    Args:
        hand_flat: (63,) flattened [x0,y0,z0, x1,y1,z1, ...]
        present:   0 or 1

    Returns:
        (63,) normalized landmarks, or zeros if not present.
    """
    if present == 0:
        return np.zeros(63, dtype=np.float32)

    arr = hand_flat.reshape(NUM_HAND_LANDMARKS, 3).copy()

    # Translate: wrist to origin
    wrist = arr[0].copy()
    arr   = arr - wrist

    # Scale: wrist-to-middle-MCP distance
    scale = float(np.linalg.norm(arr[9]))
    if scale > 1e-6:
        arr = arr / scale

    return arr.flatten().astype(np.float32)


def normalize_pose(pose_flat: np.ndarray) -> np.ndarray:
    """
    Normalize the 6 selected pose landmarks.

    Strategy:
        1. Translate so the midpoint of the two shoulders is at origin.
        2. Scale by the shoulder width (distance between left and right shoulder).
           This makes pose coordinates invariant to camera distance and signer position.

    If pose is all zeros (not detected), returns zeros unchanged.

    Args:
        pose_flat: (18,) flattened [x0,y0,z0, ..., x5,y5,z5]
                   Order: left_shoulder, right_shoulder, left_elbow,
                          right_elbow, left_wrist, right_wrist

    Returns:
        (18,) normalized pose landmarks.
    """
    if np.all(pose_flat == 0):
        return np.zeros(18, dtype=np.float32)

    arr = pose_flat.reshape(NUM_POSE_JOINTS, 3).copy()

    left_shoulder  = arr[0]
    right_shoulder = arr[1]

    # Translate: shoulder midpoint to origin
    midpoint = (left_shoulder + right_shoulder) / 2.0
    arr      = arr - midpoint

    # Scale: shoulder width
    shoulder_width = float(np.linalg.norm(left_shoulder - right_shoulder))
    if shoulder_width > 1e-6:
        arr = arr / shoulder_width

    return arr.flatten().astype(np.float32)


def normalize_frame(frame_dict: dict) -> dict:
    normalized_pose = normalize_pose(frame_dict["pose"])

    # Compute shoulder midpoint from RAW pose for body-relative wrist position
    # Raw pose order: left_shoulder, right_shoulder, left_elbow, right_elbow,
    #                 left_wrist, right_wrist
    raw_pose = np.asarray(frame_dict["pose"], dtype=np.float32).reshape(6, 3)
    left_shoulder  = raw_pose[0]
    right_shoulder = raw_pose[1]
    shoulder_mid   = (left_shoulder + right_shoulder) / 2.0
    shoulder_width = float(np.linalg.norm(left_shoulder - right_shoulder))

    # Raw wrist positions from hand landmarks (landmark 0 = wrist)
    raw_lhand = np.asarray(frame_dict["left_hand"],  dtype=np.float32).reshape(21, 3)
    raw_rhand = np.asarray(frame_dict["right_hand"], dtype=np.float32).reshape(21, 3)

    # Body-relative wrist position — wrist relative to shoulder midpoint
    # normalized by shoulder width (same scale as pose normalization)
    if frame_dict["left_hand_present"] and shoulder_width > 1e-6:
        lhand_wrist_rel = (raw_lhand[0] - shoulder_mid) / shoulder_width
    else:
        lhand_wrist_rel = np.zeros(3, dtype=np.float32)

    if frame_dict["right_hand_present"] and shoulder_width > 1e-6:
        rhand_wrist_rel = (raw_rhand[0] - shoulder_mid) / shoulder_width
    else:
        rhand_wrist_rel = np.zeros(3, dtype=np.float32)
        
    """
    Normalize a single frame's landmarks in-place.

    Args:
        frame_dict: dict with keys:
            left_hand, right_hand, pose,
            left_hand_present, right_hand_present

    Returns:
        dict with normalized left_hand, right_hand, pose.
        Presence flags are unchanged.
    """
    return {
        "left_hand":          normalize_hand(frame_dict["left_hand"],  frame_dict["left_hand_present"]),
        "right_hand":         normalize_hand(frame_dict["right_hand"], frame_dict["right_hand_present"]),
        "pose":               normalized_pose,
        "left_hand_present":  frame_dict["left_hand_present"],
        "right_hand_present": frame_dict["right_hand_present"],
        "lhand_wrist_rel":    lhand_wrist_rel.astype(np.float32),
        "rhand_wrist_rel":    rhand_wrist_rel.astype(np.float32),
    }
