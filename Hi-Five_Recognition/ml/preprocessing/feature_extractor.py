"""
feature_extractor.py
---------------------
Builds the final (64, 290) feature sequence from normalized landmarks.

Per-frame feature vector (290 dims):
    [0:63]    left hand normalized coords     (63)
    [63:126]  right hand normalized coords    (63)
    [126:144] pose normalized coords          (18)
    [144:207] left hand velocity              (63)
    [207:270] right hand velocity             (63)
    [270:288] pose velocity                   (18)
    [288]     left_hand_present flag          (1)
    [289]     right_hand_present flag         (1)
    ─────────────────────────────────────────────
    Total: 290

Velocity:
    velocity(t) = position(t) - position(t-1)
    Frame 0 velocity = zeros (no previous frame).

Sequence handling:
    < 64 frames → pad end with zeros
    > 64 frames → uniformly resample to 64 frames
    = 64 frames → use as-is

Resampling is done on the normalized feature sequence,
NOT on the raw video frames.
"""

from __future__ import annotations

import numpy as np

SEQUENCE_LEN  = 64
FEATURE_DIM   = 302

# Slice indices for readability
LHAND_POS  = slice(0,   63)
RHAND_POS  = slice(63,  126)
POSE_POS   = slice(126, 144)
LHAND_VEL  = slice(144, 207)
RHAND_VEL  = slice(207, 270)
POSE_VEL   = slice(270, 288)
LHAND_WRIST_REL = slice(288, 291)  
RHAND_WRIST_REL = slice(291, 294)   
LHAND_FLAG      = 300
RHAND_FLAG      = 301


def build_frame_vector(
    current: dict,
    previous: dict | None,
) -> np.ndarray:
    """
    Build a single 290-dim feature vector for one frame.

    Args:
        current:  normalized frame dict for frame t
        previous: normalized frame dict for frame t-1
                  (None for the first frame → velocity = zeros)

    Returns:
        np.ndarray of shape (290,)
    """
    vec = np.zeros(FEATURE_DIM, dtype=np.float32)

    # Position features
    vec[LHAND_POS] = current["left_hand"]
    vec[RHAND_POS] = current["right_hand"]
    vec[POSE_POS]  = current["pose"]

    # Velocity features
    if previous is not None:
        vec[LHAND_VEL] = current["left_hand"]  - previous["left_hand"]
        vec[RHAND_VEL] = current["right_hand"] - previous["right_hand"]
        vec[POSE_VEL]  = current["pose"]       - previous["pose"]
    # else: velocity stays zero for first frame

    # Presence flags
    vec[LHAND_FLAG] = float(current["left_hand_present"])
    vec[RHAND_FLAG] = float(current["right_hand_present"])

    return vec


def build_sequence(normalized_frames: list[dict]) -> np.ndarray:
    """
    Build a (N, 290) feature matrix from a list of normalized frame dicts.
    Velocity is computed from consecutive normalized frames.

    Args:
        normalized_frames: list of normalized frame dicts

    Returns:
        np.ndarray of shape (N, 290) where N = len(normalized_frames)
    """
    n = len(normalized_frames)
    seq = np.zeros((n, FEATURE_DIM), dtype=np.float32)

    for i, frame in enumerate(normalized_frames):
        prev = normalized_frames[i - 1] if i > 0 else None
        seq[i] = build_frame_vector(frame, prev)

    return seq


def resample_sequence(seq: np.ndarray, target_len: int = SEQUENCE_LEN) -> np.ndarray:
    """
    Resample or pad a feature sequence to exactly target_len frames.

    Strategy:
        < target_len → pad end with zeros
        > target_len → uniformly resample using np.linspace indices
        = target_len → return as-is

    Args:
        seq:        np.ndarray of shape (N, feature_dim)
        target_len: desired output length (default 64)

    Returns:
        np.ndarray of shape (target_len, feature_dim)
    """
    n = len(seq)

    if n == target_len:
        return seq.astype(np.float32)

    out = np.zeros((target_len, seq.shape[1]), dtype=np.float32)

    if n < target_len:
        # Pad end with zeros
        out[:n] = seq
    else:
        # Uniform resampling
        indices = np.linspace(0, n - 1, target_len).astype(int)
        out = seq[indices].astype(np.float32)

    return out


def process_video_frames(normalized_frames: list[dict]) -> np.ndarray:
    """
    Full pipeline from normalized frames to final (64, 290) sequence.

    Steps:
        1. Build (N, 290) feature matrix with velocity
        2. Resample/pad to (64, 290)

    Args:
        normalized_frames: list of normalized frame dicts (any length)

    Returns:
        np.ndarray of shape (64, 290)
    """
    if not normalized_frames:
        return np.zeros((SEQUENCE_LEN, FEATURE_DIM), dtype=np.float32)

    # Step 1 — extract position-only features (no velocity yet)
    n = len(normalized_frames)
    pos_dim = 63 + 63 + 18 + 3 + 3  # 150 position features (incl. wrist-rel)
    pos_seq = np.zeros((n, pos_dim + 2), dtype=np.float32)  # +2 for flags

    for i, frame in enumerate(normalized_frames):
        pos_seq[i, 0:63]    = frame["left_hand"]
        pos_seq[i, 63:126]  = frame["right_hand"]
        pos_seq[i, 126:144] = frame["pose"]
        pos_seq[i, 144:147] = frame["lhand_wrist_rel"]
        pos_seq[i, 147:150] = frame["rhand_wrist_rel"]
        pos_seq[i, 150]     = float(frame["left_hand_present"])
        pos_seq[i, 151]     = float(frame["right_hand_present"])

    # Step 2 — resample positions to target length
    pos_resampled = resample_sequence(pos_seq, SEQUENCE_LEN)  # (64, 146)

    # Step 3 — recompute velocity from resampled positions
    out = np.zeros((SEQUENCE_LEN, FEATURE_DIM), dtype=np.float32)
    out[:, 0:150]    = pos_resampled[:, 0:150]   # positions + wrist-rel
    out[:, 300]      = pos_resampled[:, 150]      # left flag
    out[:, 301]      = pos_resampled[:, 151]      # right flag

    # Velocity: frame t - frame t-1, zeros for first frame
    out[1:, 150:300] = pos_resampled[1:, 0:150] - pos_resampled[:-1, 0:150]
    # out[0, 144:288] stays zero

    return out
