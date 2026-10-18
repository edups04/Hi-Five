"""
realtime.py
------------
TCN inference module for real-time isolated dynamic sign language recognition.

Maintains a 64-frame rolling buffer of landmark features per session.
Runs inference every frame once the buffer is full.
Supports ASL and FSL language switching.

Usage:
    from inference.realtime import TCNPredictor

    predictor = TCNPredictor(language='asl')
    result = predictor.push_frame(rgb_image)
    if result:
        print(result['label'], result['confidence'])
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).parent.parent))

from preprocessing.mediapipe_extractor import FrameExtractor
from preprocessing.normalization import normalize_frame
from preprocessing.feature_extractor import build_frame_vector
from training.tcn import SignTCN

# ── Config ────────────────────────────────────────────────────────────────────
SEQUENCE_LEN        = 64
FEATURE_DIM         = 302
CONFIDENCE_THRESHOLD = 0.60   # below this → unknown
UNKNOWN_LABEL       = "unknown"

MODEL_PATHS = {
    "asl": {
        "model":     "models/asl_tcn.pth",
        "label_map": "models/asl_label_map.csv",
    },
    "fsl": {
        "model":     "models/fsl_tcn.pth",
        "label_map": "models/fsl_label_map.csv",
    },
        "fsl10": {
        "model":     "models/fsl_tcn_10.pth",
        "label_map": "models/fsl_label_map_10.csv",
    },
        "fsl20": {                                        # ← add this
        "model":     "models/fsl_tcn_20.pth",
        "label_map": "models/fsl_label_map_20.csv",
    },
}

HAND_MODEL = "models/hand_landmarker.task"
POSE_MODEL = "models/pose_landmarker.task"
# ─────────────────────────────────────────────────────────────────────────────


def _load_label_map(path: str) -> dict[int, str]:
    import csv
    label_map = {}
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            label_map[int(row["label_id"])] = row["gloss"]
    return label_map


class TCNPredictor:
    """
    Real-time TCN predictor for isolated dynamic sign recognition.

    Maintains a rolling 64-frame buffer of 302-dim landmark features.
    Runs inference every frame once the buffer is full.

    Args:
        language:             'asl' or 'fsl'
        confidence_threshold: minimum confidence to return a prediction
                              (below this returns 'unknown')
    """

    def __init__(
        self,
        language:             str   = "asl",
        confidence_threshold: float = CONFIDENCE_THRESHOLD,
    ) -> None:
        if language not in MODEL_PATHS:
            raise ValueError(f"language must be 'asl' or 'fsl', got '{language}'")

        self.language             = language
        self.confidence_threshold = confidence_threshold
        self._device              = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # ── Load model ────────────────────────────────────────────────────────
        paths      = MODEL_PATHS[language]
        checkpoint = torch.load(paths["model"], map_location=self._device)

        self._model = SignTCN(
            feature_dim=checkpoint["feature_dim"],
            num_classes=checkpoint["num_classes"],
            channels=checkpoint["channels"],
            dilations=checkpoint["dilations"],
            kernel_size=checkpoint["kernel_size"],
            dropout=checkpoint["dropout"],
            fc_dropout=checkpoint["fc_dropout"],
        ).to(self._device)
        self._model.load_state_dict(checkpoint["model_state"])
        self._model.eval()

        self._label_map = _load_label_map(paths["label_map"])
        print(f"[TCNPredictor] Loaded {language.upper()} model — "
              f"{len(self._label_map)} classes — device: {self._device}")

        # ── MediaPipe extractor ───────────────────────────────────────────────
        self._extractor = FrameExtractor(
            hand_model_path=HAND_MODEL,
            pose_model_path=POSE_MODEL,
        )

        # ── Frame buffer ──────────────────────────────────────────────────────
        self._buffer:   deque[np.ndarray] = deque(maxlen=SEQUENCE_LEN)
        self._prev_frame: dict | None     = None   # for velocity computation

    # ── Public API ────────────────────────────────────────────────────────────

    def push_frame(self, rgb_image: np.ndarray) -> dict | None:
        """
        Process one RGB frame, push its features to the buffer,
        and run inference if the buffer is full.

        Args:
            rgb_image: np.ndarray (H, W, 3) uint8 RGB

        Returns:
            dict with keys:
                label:       str  — predicted sign or 'unknown'
                confidence:  float — model confidence 0-1
                is_unknown:  bool  — True if below confidence threshold
                buffer_full: bool  — True if buffer has 64 frames
            or None if buffer not yet full.
        """
        # Extract landmarks
        raw = self._extractor.extract(rgb_image)

        # Normalize
        norm = normalize_frame(raw)

        # Build 302-dim feature vector (with velocity from previous frame)
        vec = build_frame_vector(norm, self._prev_frame)
        self._prev_frame = norm

        # Push to buffer
        self._buffer.append(vec)

        if len(self._buffer) < SEQUENCE_LEN:
            return None

        # Run inference
        return self._predict()

    def switch_language(self, language: str) -> None:
        """
        Switch between ASL and FSL models at runtime.
        Clears the frame buffer on switch.
        """
        if language == self.language:
            return
        if language not in MODEL_PATHS:
            raise ValueError(f"language must be 'asl' or 'fsl', got '{language}'")

        paths      = MODEL_PATHS[language]
        checkpoint = torch.load(paths["model"], map_location=self._device)

        self._model = SignTCN(
            feature_dim=checkpoint["feature_dim"],
            num_classes=checkpoint["num_classes"],
            channels=checkpoint["channels"],
            dilations=checkpoint["dilations"],
            kernel_size=checkpoint["kernel_size"],
            dropout=checkpoint["dropout"],
            fc_dropout=checkpoint["fc_dropout"],
        ).to(self._device)
        self._model.load_state_dict(checkpoint["model_state"])
        self._model.eval()

        self._label_map = _load_label_map(paths["label_map"])
        self.language   = language
        self.clear()
        print(f"[TCNPredictor] Switched to {language.upper()} model — "
              f"{len(self._label_map)} classes")

    def clear(self) -> None:
        """Clear the frame buffer and previous frame reference."""
        self._buffer.clear()
        self._prev_frame = None

    @property
    def buffer_fill(self) -> int:
        """Number of frames currently in the buffer (0-64)."""
        return len(self._buffer)

    @property
    def buffer_ready(self) -> bool:
        """True when buffer has exactly 64 frames."""
        return len(self._buffer) == SEQUENCE_LEN

    @property
    def classes(self) -> list[str]:
        """List of class names for the current language model."""
        return [self._label_map[i] for i in range(len(self._label_map))]

    def close(self) -> None:
        """Release MediaPipe resources."""
        self._extractor.close()

    def __enter__(self) -> "TCNPredictor":
        return self

    def __exit__(self, *args) -> None:
        self.close()

    # ── Private ───────────────────────────────────────────────────────────────

    @torch.no_grad()
    def _predict(self) -> dict:
        """Run TCN inference on the current buffer."""
        seq    = np.array(self._buffer, dtype=np.float32)        # (64, 302)
        tensor = torch.from_numpy(seq).unsqueeze(0).to(self._device)  # (1, 64, 302)

        logits = self._model(tensor)                              # (1, num_classes)
        probs  = torch.softmax(logits, dim=1)[0].cpu().numpy()

        best_idx    = int(np.argmax(probs))
        confidence  = float(probs[best_idx])
        label       = self._label_map.get(best_idx, UNKNOWN_LABEL)

        is_unknown = confidence < self.confidence_threshold

        return {
            "label":       UNKNOWN_LABEL if is_unknown else label,
            "confidence":  round(confidence, 4),
            "is_unknown":  is_unknown,
            "buffer_full": True,
            "raw_label":   label,   # always the top prediction regardless of threshold
        }


# ── Segmentation states ───────────────────────────────────────────────────────
_STATE_WAITING    = "WAITING"
_STATE_SIGNING    = "SIGNING"
_STATE_PREDICTING = "PREDICTING"

# Segmentation config
SEG_MOVE_THRESHOLD = 0.008  # normalized wrist displacement to count as movement
SEG_HOLD_DURATION  = 0.25   # seconds of stillness before sign ends
SEG_MIN_FRAMES     = 10     # minimum frames before predicting
SEG_MAX_FRAMES     = 150    # maximum frames before forcing prediction
SEG_SKIP_LEADING   = 5      # drop first N frames (approach/prep motion before the sign)
# ─────────────────────────────────────────────────────────────────────────────


class SegmentedTCNPredictor:
    """
    Movement-based segmented TCN predictor.

    Automatically detects when a sign starts and ends using wrist velocity,
    collects frames only during the actual sign, then resamples to 64 frames
    and runs TCN inference once per sign.

    States:
        WAITING    — no movement, idle
        SIGNING    — movement detected, collecting frames
        PREDICTING — movement stopped, running inference

    Args:
        language:             'asl' or 'fsl'
        confidence_threshold: minimum confidence to return a prediction
    """

    def __init__(
        self,
        language:             str   = "asl",
        confidence_threshold: float = CONFIDENCE_THRESHOLD,
    ) -> None:
        if language not in MODEL_PATHS:
            raise ValueError(f"language must be 'asl' or 'fsl', got '{language}'")

        self.language             = language
        self.confidence_threshold = confidence_threshold
        self._device              = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # ── Load model ────────────────────────────────────────────────────────
        self._model, self._label_map = self._load_model(language)

        # ── MediaPipe extractor ───────────────────────────────────────────────
        self._extractor = FrameExtractor(
            hand_model_path=HAND_MODEL,
            pose_model_path=POSE_MODEL,
        )

        # ── Segmentation state ────────────────────────────────────────────────
        self._state:        str             = _STATE_WAITING
        self._sign_frames:  list[np.ndarray] = []   # frames collected during sign
        self._prev_frame:   dict | None     = None
        self._prev_wrist:   np.ndarray | None = None
        self._still_since:  float           = 0.0   # time hand became still

        print(f"[SegmentedTCNPredictor] Loaded {language.upper()} model — "
              f"{len(self._label_map)} classes — device: {self._device}")

    # ── Public API ────────────────────────────────────────────────────────────

    def push_frame(self, rgb_image: np.ndarray) -> dict | None:
        """
        Process one RGB frame through the segmentation pipeline.

        Returns:
            dict with label/confidence when a sign is detected,
            dict with state info when collecting/waiting,
            None is never returned — always returns state.
        """
        import time

        # Extract + normalize
        raw  = self._extractor.extract(rgb_image)
        norm = normalize_frame(raw)
        vec  = build_frame_vector(norm, self._prev_frame)
        self._prev_frame = norm

        # Get wrist position for movement detection
        # Use pose left wrist (index 15*3=45 in raw pose, but from 302-dim vec
        # left wrist body-relative is at dims 288-290, right at 291-293)
        # Simpler: use hand presence + left/right wrist from normalized hand[0]
        wrist = self._get_wrist(norm)
        moving = self._is_moving(wrist)
        self._prev_wrist = wrist

        now = time.time()

        # ── State machine ─────────────────────────────────────────────────────
        if self._state == _STATE_WAITING:
            if moving:
                self._state       = _STATE_SIGNING
                self._sign_frames = [vec]
                self._still_since = 0.0
            return {"state": _STATE_WAITING, "frames": 0}

        elif self._state == _STATE_SIGNING:
            self._sign_frames.append(vec)

            if moving:
                self._still_since = 0.0
            else:
                if self._still_since == 0.0:
                    self._still_since = now
                elif now - self._still_since >= SEG_HOLD_DURATION:
                    # Hand held still long enough — sign ended
                    return self._run_prediction()

            # Force prediction if too many frames
            if len(self._sign_frames) >= SEG_MAX_FRAMES:
                return self._run_prediction()

            return {
                "state":  _STATE_SIGNING,
                "frames": len(self._sign_frames),
            }

        return {"state": self._state, "frames": 0}

    def switch_language(self, language: str) -> None:
        """Switch between ASL and FSL models at runtime."""
        if language == self.language:
            return
        if language not in MODEL_PATHS:
            raise ValueError(f"language must be 'asl' or 'fsl', got '{language}'")

        self._model, self._label_map = self._load_model(language)
        self.language = language
        self.reset()
        print(f"[SegmentedTCNPredictor] Switched to {language.upper()} model — "
              f"{len(self._label_map)} classes")

    def reset(self) -> None:
        """Reset segmentation state."""
        self._state       = _STATE_WAITING
        self._sign_frames = []
        self._prev_frame  = None
        self._prev_wrist  = None
        self._still_since = 0.0

    @property
    def state(self) -> str:
        return self._state

    @property
    def sign_frame_count(self) -> int:
        return len(self._sign_frames)

    @property
    def classes(self) -> list[str]:
        return [self._label_map[i] for i in range(len(self._label_map))]

    def close(self) -> None:
        self._extractor.close()

    def __enter__(self) -> "SegmentedTCNPredictor":
        return self

    def __exit__(self, *args) -> None:
        self.close()

    # ── Private ───────────────────────────────────────────────────────────────

    def _load_model(self, language: str):
        paths      = MODEL_PATHS[language]
        checkpoint = torch.load(paths["model"], map_location=self._device)
        model = SignTCN(
            feature_dim=checkpoint["feature_dim"],
            num_classes=checkpoint["num_classes"],
            channels=checkpoint["channels"],
            dilations=checkpoint["dilations"],
            kernel_size=checkpoint["kernel_size"],
            dropout=checkpoint["dropout"],
            fc_dropout=checkpoint["fc_dropout"],
        ).to(self._device)
        model.load_state_dict(checkpoint["model_state"])
        model.eval()
        label_map = _load_label_map(paths["label_map"])
        return model, label_map

    def _get_wrist(self, norm: dict) -> np.ndarray | None:
        """Return wrist position only if a hand is present, else None."""
        if norm["left_hand_present"]:
            return norm["lhand_wrist_rel"].copy()
        elif norm["right_hand_present"]:
            return norm["rhand_wrist_rel"].copy()
        return None  # no hand detected — do NOT fall back to noisy pose landmarks

    def _is_moving(self, wrist: np.ndarray | None) -> bool:
        """Check if wrist has moved beyond threshold. Returns False if no hand present."""
        if wrist is None or self._prev_wrist is None:
            return False
        displacement = float(np.linalg.norm(wrist - self._prev_wrist))
        return displacement > SEG_MOVE_THRESHOLD

    @torch.no_grad()
    def _run_prediction(self) -> dict:
        """Resample collected frames to 64 and run TCN inference."""
        from preprocessing.feature_extractor import resample_sequence

        self._state = _STATE_WAITING

        n_frames = len(self._sign_frames)

        if n_frames < SEG_MIN_FRAMES:
            self._sign_frames = []
            return {
                "state":      _STATE_WAITING,
                "frames":     n_frames,
                "skipped":    True,
                "reason":     f"too few frames ({n_frames} < {SEG_MIN_FRAMES})",
            }

        # Trim leading approach/prep frames, then resample to 64 frames
        trimmed = self._sign_frames[SEG_SKIP_LEADING:]
        if len(trimmed) < SEG_MIN_FRAMES:
            trimmed = self._sign_frames  # not enough left after trim, use all
        seq_raw    = np.array(trimmed, dtype=np.float32)  # (N, 302)
        seq        = resample_sequence(seq_raw, SEQUENCE_LEN)        # (64, 302)
        self._sign_frames = []

        # Run inference
        tensor = torch.from_numpy(seq).unsqueeze(0).to(self._device)
        logits = self._model(tensor)
        probs  = torch.softmax(logits, dim=1)[0].cpu().numpy()

        best_idx   = int(np.argmax(probs))
        confidence = float(probs[best_idx])
        label      = self._label_map.get(best_idx, UNKNOWN_LABEL)
        is_unknown = confidence < self.confidence_threshold

        return {
            "state":      _STATE_WAITING,
            "label":      UNKNOWN_LABEL if is_unknown else label,
            "confidence": round(confidence, 4),
            "is_unknown": is_unknown,
            "raw_label":  label,
            "n_frames":   n_frames,
        }