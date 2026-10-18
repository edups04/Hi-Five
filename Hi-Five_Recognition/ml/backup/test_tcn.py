"""
Standalone webcam test for TCN dynamic sign recognition.

Shows:
    - Buffer fill progress (0/64 → 64/64)
    - TCN prediction + confidence
    - Smoothing window status
    - Detected sign displayed at bottom

Controls:
    Q     — quit
    A     — switch to ASL model
    F     — switch to FSL model
    SPACE — clear buffer manually

Usage:
    cd Hi-Five_Recognition/ml
    python test_tcn.py
"""

from __future__ import annotations

import sys
import time
from collections import Counter, deque
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from inference.realtime import TCNPredictor

# ── Config ────────────────────────────────────────────────────────────────────
DEFAULT_LANGUAGE         = "asl"
CONFIDENCE_THRESHOLD     = 0.60
TCN_COOLDOWN             = 2.0
SMOOTHING_WINDOW         = 5
DISPLAY_DURATION         = 2.5
# ─────────────────────────────────────────────────────────────────────────────


def main():
    print(f"[init] Loading TCN predictor ({DEFAULT_LANGUAGE.upper()})...")
    predictor = TCNPredictor(
        language=DEFAULT_LANGUAGE,
        confidence_threshold=CONFIDENCE_THRESHOLD,
    )
    print(f"[init] Classes: {len(predictor.classes)}")
    print("[init] Starting webcam...")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[error] Could not open webcam.")
        return

    smooth_history:  deque[str]       = deque(maxlen=SMOOTHING_WINDOW)
    last_sign_time:  dict[str, float] = {}
    last_shown       = ""
    last_shown_conf  = 0.0
    last_shown_time  = 0.0

    print(f"[ready] Sign! Press A=ASL F=FSL SPACE=clear Q=quit\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        now   = time.time()

        # ── Push frame to TCN ─────────────────────────────────────────────
        result = predictor.push_frame(rgb)

        raw_label = ""
        raw_conf  = 0.0

        if result is not None:
            raw_label = result["raw_label"]
            raw_conf  = result["confidence"]

            if not result["is_unknown"]:
                smooth_history.append(raw_label)

                if len(smooth_history) == SMOOTHING_WINDOW:
                    counts    = Counter(smooth_history)
                    top_label = counts.most_common(1)[0][0]
                    top_count = counts.most_common(1)[0][1]

                    if top_count >= SMOOTHING_WINDOW // 2 + 1:
                        last_fired = last_sign_time.get(top_label, 0.0)
                        if now - last_fired >= TCN_COOLDOWN:
                            last_sign_time[top_label] = now
                            last_shown      = top_label.upper()
                            last_shown_conf = raw_conf
                            last_shown_time = now
                            smooth_history.clear()
                            print(f"[TCN] {top_label.upper()} ({raw_conf:.2f})")
            else:
                smooth_history.clear()

        h, w = frame.shape[:2]

        # ── Overlays ──────────────────────────────────────────────────────
        lang_color = (255, 180, 0) if predictor.language == "asl" else (0, 200, 255)
        cv2.putText(frame, f"Model: {predictor.language.upper()} TCN",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, lang_color, 2)

        fill    = predictor.buffer_fill
        bar_w   = int(fill / 64 * 250)
        cv2.putText(frame, f"Buffer: {fill}/64", (10, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.rectangle(frame, (10, 65), (260, 80), (50, 50, 50), -1)
        bar_color = (0, 200, 100) if fill == 64 else (0, 140, 255)
        cv2.rectangle(frame, (10, 65), (10 + bar_w, 80), bar_color, -1)

        if raw_label:
            conf_color = (0, 255, 100) if raw_conf >= CONFIDENCE_THRESHOLD else (100, 100, 100)
            cv2.putText(frame, f"TCN: {raw_label} ({raw_conf:.2f})",
                        (10, 105), cv2.FONT_HERSHEY_SIMPLEX, 0.6, conf_color, 2)

        if smooth_history:
            smooth_str = " ".join(list(smooth_history)[-5:])
            cv2.putText(frame, f"Smooth: [{smooth_str}]",
                        (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        cv2.putText(frame, "A=ASL  F=FSL  SPACE=clear  Q=quit",
                    (10, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)

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

        cv2.imshow(f"TCN Sign Test [{predictor.language.upper()}] — Q to quit", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('a'):
            print("[switch] Switching to ASL...")
            predictor.switch_language("asl")
            smooth_history.clear()
            last_shown = ""
            print("[switch] ASL model loaded.")
        elif key == ord('f'):
            print("[switch] Switching to FSL...")
            predictor.switch_language("fsl")
            smooth_history.clear()
            last_shown = ""
            print("[switch] FSL model loaded.")
        elif key == ord(' '):
            predictor.clear()
            smooth_history.clear()
            print("[clear] Buffer cleared.")

    cap.release()
    cv2.destroyAllWindows()
    predictor.close()
    print("[done] Test ended.")


if __name__ == "__main__":
    main()
