"""
Standalone webcam test for segmented TCN dynamic sign recognition.

Shows:
    - Segmentation state (WAITING / SIGNING)
    - Frame count during signing
    - TCN prediction + confidence when a sign completes
    - Detected sign displayed at bottom

Controls:
    Q     — quit
    A     — switch to ASL model
    F     — switch to FSL model
    R     — reset segmentation state

Usage:
    cd Hi-Five_Recognition/ml
    python test_tcn.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from inference.realtime import SegmentedTCNPredictor

# ── Config ────────────────────────────────────────────────────────────────────
DEFAULT_LANGUAGE     = "fsl20"
CONFIDENCE_THRESHOLD = 0.60
DISPLAY_DURATION     = 2.5
# ─────────────────────────────────────────────────────────────────────────────


def main():
    print(f"[init] Loading Segmented TCN predictor ({DEFAULT_LANGUAGE.upper()})...")
    predictor = SegmentedTCNPredictor(
        language=DEFAULT_LANGUAGE,
        confidence_threshold=CONFIDENCE_THRESHOLD,
    )
    print(f"[init] Classes: {len(predictor.classes)}")
    print("[init] Starting webcam...")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[error] Could not open webcam.")
        return

    last_shown      = ""
    last_shown_conf = 0.0
    last_shown_time = 0.0

    print(f"[ready] Sign! Press A=ASL F=FSL R=reset Q=quit\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        now   = time.time()

        # ── Push frame to segmented TCN ───────────────────────────────────
        result = predictor.push_frame(rgb)

        # debug
        raw = predictor._extractor.extract(rgb)
        print(f"lhand={raw['left_hand_present']} rhand={raw['right_hand_present']} pose_nonzero={raw['pose'].any()} state={predictor.state}")

        h, w = frame.shape[:2]

        # ── Check if a sign was completed ─────────────────────────────────
        if "label" in result and not result.get("is_unknown", True):
            last_shown      = result["label"].upper()
            last_shown_conf = result["confidence"]
            last_shown_time = now
            print(f"[TCN] {last_shown} ({last_shown_conf:.2f})  [{result['n_frames']} frames]")
        elif result.get("skipped"):
            print(f"[skip] {result.get('reason', 'too few frames')}")

        # ── Overlays ──────────────────────────────────────────────────────
        state       = result.get("state", predictor.state)
        frame_count = result.get("frames", predictor.sign_frame_count)

        lang_color = (255, 180, 0) if predictor.language == "asl" else (0, 200, 255)
        cv2.putText(frame, f"Model: {predictor.language.upper()} TCN (Segmented)",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, lang_color, 2)

        # State indicator
        if state == "WAITING":
            state_color = (150, 150, 150)
            state_text  = "WAITING — start signing"
        elif state == "SIGNING":
            state_color = (0, 200, 100)
            state_text  = f"SIGNING — {frame_count} frames"
        else:
            state_color = (100, 100, 255)
            state_text  = state

        cv2.putText(frame, state_text,
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.65, state_color, 2)

        # Progress bar during signing
        if state == "SIGNING":
            bar_w = int(min(frame_count / 64, 1.0) * 250)
            cv2.rectangle(frame, (10, 70), (260, 82), (50, 50, 50), -1)
            cv2.rectangle(frame, (10, 70), (10 + bar_w, 82), (0, 200, 100), -1)

        cv2.putText(frame, "A=ASL  F=FSL  R=reset  Q=quit",
                    (10, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)

        # Last detected sign
        if last_shown and now - last_shown_time < DISPLAY_DURATION:
            text_size = cv2.getTextSize(last_shown, cv2.FONT_HERSHEY_SIMPLEX, 2.2, 4)[0]
            tx = (w - text_size[0]) // 2
            ty = h - 70
            cv2.rectangle(frame,
                            (tx - 12, ty - text_size[1] - 12),
                            (tx + text_size[0] + 12, ty + 12),
                            (0, 0, 0), -1)
            cv2.putText(frame, last_shown, (tx, ty),
                        cv2.FONT_HERSHEY_SIMPLEX, 2.2, (0, 220, 120), 4)
            cv2.putText(frame, f"{last_shown_conf*100:.0f}% conf",
                        (tx, ty + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 100), 2)

        cv2.imshow(f"Segmented TCN [{predictor.language.upper()}] — Q to quit", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('a'):
            print("[switch] Switching to ASL...")
            predictor.switch_language("asl")
            last_shown = ""
            print("[switch] ASL model loaded.")
        elif key == ord('f'):
            print("[switch] Switching to FSL...")
            predictor.switch_language("fsl")
            last_shown = ""
            print("[switch] FSL model loaded.")
        elif key == ord('t'):
            print("[switch] Switching to FSL 20-class...")
            predictor.switch_language("fsl20")
            last_shown = ""
            print("[switch] FSL 20-class model loaded.")
        elif key == ord('r'):
            predictor.reset()
            last_shown = ""
            print("[reset] State reset.")

    cap.release()
    cv2.destroyAllWindows()
    predictor.close()
    print("[done] Test ended.")

if __name__ == "__main__":
    main()
