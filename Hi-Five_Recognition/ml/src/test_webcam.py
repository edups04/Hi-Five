"""
Live webcam test for the trained Hi-Five ASL alphabet model — subtitle mode.

As you sign, letters accumulate into a sentence shown at the bottom of
the screen. The hard part of "build up a string" is filtering out
unstable predictions; see SentenceBuilder below for the logic.

Behavior:
    - A letter is added only when it has been the top prediction for
      STABILITY_FRAMES consecutive frames, AND its confidence is above
      MIN_CONFIDENCE, AND it differs from the last letter added.
    - To repeat the same letter (e.g. spelling "BOOK"), remove your hand
      or change signs briefly to "reset", then sign the letter again.
    - `space` sign → appends a literal space.
    - `del` sign   → removes the last character (acts as backspace).

Controls:
    q          quit
    c          clear the sentence
    backspace  delete the last character manually
    d          toggle dev overlay (FPS, confidence, landmarks)
    s          save the current frame to debug_frames/

Usage:
    python -m src.test_webcam
    python -m src.test_webcam --camera 1
    python -m src.test_webcam --min-confidence 0.8 --stability 7
"""

from __future__ import annotations

import argparse
import time
from collections import deque
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from .predict import AslPredictor


# ---- Tunable behavior --------------------------------------------------------

# How many consecutive frames a prediction must hold before it's "committed"
# to the sentence. Higher = more stable but slower; lower = more responsive
# but more noise. 5 frames at 30fps is ~170ms — feels snappy without false adds.
STABILITY_FRAMES = 5

# Predictions below this confidence are ignored entirely. The trained model
# is usually >0.95 on clean signs, so 0.7 is a generous floor.
MIN_CONFIDENCE = 0.7

# After committing a letter, you can't commit the SAME letter again until
# you've signed something different (or "nothing") for this many frames.
# This is what lets you spell distinct letters without auto-repeating, while
# still letting "BOOK" work once you reset between Os.
RESET_FRAMES = 4


# ---- Drawing constants (BGR — OpenCV) ----------------------------------------

COLOR_HAND = (0, 255, 0)
COLOR_TEXT = (255, 255, 255)
COLOR_SHADOW = (0, 0, 0)
COLOR_GOOD = (0, 255, 0)
COLOR_WEAK = (0, 165, 255)
COLOR_NONE = (0, 0, 255)

SUBTITLE_FONT = cv2.FONT_HERSHEY_DUPLEX
SUBTITLE_SCALE = 1.0
SUBTITLE_THICKNESS = 1
SUBTITLE_BOTTOM_MARGIN = 50  # pixels from the bottom of the frame


# ---- Sentence-building logic -------------------------------------------------

class SentenceBuilder:
    """
    Turns a stream of per-frame predictions into a stable, accumulating
    sentence. The trick is in `_should_commit`: a prediction has to be
    stable across multiple frames before we trust it enough to add it
    to the sentence.
    """

    def __init__(
        self,
        stability_frames: int = STABILITY_FRAMES,
        min_confidence: float = MIN_CONFIDENCE,
        reset_frames: int = RESET_FRAMES,
    ) -> None:
        self.stability_frames = stability_frames
        self.min_confidence = min_confidence
        self.reset_frames = reset_frames

        self.sentence = ""
        self._recent: deque[str] = deque(maxlen=stability_frames)
        self._last_committed: str | None = None
        self._frames_since_commit = 0

    def update(self, label: str, confidence: float) -> bool:
        """
        Feed one frame's prediction. Returns True if a letter was committed
        on this frame (useful if you want a "ding" sound effect, etc).
        """
        # Track recent predictions for stability check.
        self._recent.append(label if confidence >= self.min_confidence else "_low")
        self._frames_since_commit += 1

        # Once enough frames have passed since the last commit (or we've
        # been seeing a different letter / nothing), allow re-committing
        # the same letter.
        if (
            self._last_committed is not None
            and self._frames_since_commit >= self.reset_frames
            and label != self._last_committed
        ):
            # The "reset" condition has been met; clear the lock.
            self._last_committed = None

        if not self._should_commit(label, confidence):
            return False

        self._commit(label)
        return True

    def _should_commit(self, label: str, confidence: float) -> bool:
        # Need a full window of consistent, confident predictions.
        if len(self._recent) < self.stability_frames:
            return False
        if confidence < self.min_confidence:
            return False
        if any(r != label for r in self._recent):
            return False
        # Don't commit "nothing" (no hand) — it's not a letter.
        if label == "nothing":
            return False
        # Don't double-commit the same letter without a reset.
        if label == self._last_committed:
            return False
        return True

    def _commit(self, label: str) -> None:
        if label == "space":
            self.sentence += " "
        elif label == "del":
            self.sentence = self.sentence[:-1]
        else:
            self.sentence += label
        self._last_committed = label
        self._frames_since_commit = 0

    def clear(self) -> None:
        self.sentence = ""
        self._recent.clear()
        self._last_committed = None
        self._frames_since_commit = 0

    def backspace(self) -> None:
        self.sentence = self.sentence[:-1]


# ---- Drawing helpers ---------------------------------------------------------

def draw_landmarks(frame: np.ndarray, raw_landmarks: np.ndarray) -> None:
    h, w = frame.shape[:2]
    pts = raw_landmarks.reshape(21, 3)
    for x, y, _z in pts:
        cv2.circle(frame, (int(x * w), int(y * h)), 5, COLOR_HAND, -1)


def _fits(text: str, max_width: int) -> bool:
    """True if `text` renders within `max_width` pixels at subtitle font/scale."""
    (tw, _), _ = cv2.getTextSize(text, SUBTITLE_FONT, SUBTITLE_SCALE, SUBTITLE_THICKNESS)
    return tw <= max_width


def _fit_to_width(text: str, max_width: int) -> str:
    """
    Trim `text` from the left so it fits in `max_width` pixels.

    Strategy:
      1. If the whole string fits, return it unchanged.
      2. Otherwise drop whole words from the front, one at a time, until
         what remains fits. (Subtitle-style sliding window.)
      3. If even the last word alone doesn't fit (very long single word),
         fall back to cropping characters from its left with a leading "…".
    """
    if _fits(text, max_width):
        return text

    # Step 2: drop whole words from the left.
    words = text.split(" ")
    while len(words) > 1:
        words.pop(0)
        candidate = " ".join(words)
        if _fits(candidate, max_width):
            return candidate

    # Step 3: only one word left and it still overflows. Crop chars.
    last = words[0]
    while last:
        candidate = "…" + last[1:]
        if _fits(candidate, max_width):
            return candidate
        last = last[1:]
    return ""


def draw_subtitle(frame: np.ndarray, text: str) -> None:
    """Draw the accumulating sentence at the bottom with a soft shadow."""
    if not text:
        return
    h, w = frame.shape[:2]

    # Reserve 80px of margin (40 each side) so text doesn't kiss the edges.
    max_width = w - 80
    display = _fit_to_width(text, max_width)
    if not display:
        return

    (tw, th), _ = cv2.getTextSize(display, SUBTITLE_FONT, SUBTITLE_SCALE, SUBTITLE_THICKNESS)
    x = (w - tw) // 2
    y = h - SUBTITLE_BOTTOM_MARGIN

    # Multi-pass shadow for a soft drop-shadow effect (cheap blur).
    for dx, dy in [(-2, -2), (-2, 2), (2, -2), (2, 2), (0, 3)]:
        cv2.putText(
            frame, display, (x + dx, y + dy),
            SUBTITLE_FONT, SUBTITLE_SCALE, COLOR_SHADOW, SUBTITLE_THICKNESS + 1,
            cv2.LINE_AA,
        )
    cv2.putText(
        frame, display, (x, y),
        SUBTITLE_FONT, SUBTITLE_SCALE, COLOR_TEXT, SUBTITLE_THICKNESS,
        cv2.LINE_AA,
    )


def draw_dev_overlay(
    frame: np.ndarray,
    label: str,
    confidence: float,
    hand_detected: bool,
    fps: float,
    min_confidence: float,
) -> None:
    """Top-left dev info: current prediction, confidence, FPS."""
    if not hand_detected:
        color, text = COLOR_NONE, "no hand"
    elif confidence < min_confidence:
        color = COLOR_WEAK
        text = f"{label}  {confidence * 100:.0f}%  (low)"
    else:
        color = COLOR_GOOD
        text = f"{label}  {confidence * 100:.0f}%"

    cv2.putText(frame, text, (20, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2, cv2.LINE_AA)
    cv2.putText(frame, f"{fps:.1f} fps", (20, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_TEXT, 1, cv2.LINE_AA)


def draw_hint_bar(frame: np.ndarray, debug: bool) -> None:
    """Top-right keyboard-shortcut reminder."""
    h, w = frame.shape[:2]
    debug_state = "on" if debug else "off"
    hint = f"q quit  |  c clear  |  bksp delete  |  d debug ({debug_state})  |  s save"
    (tw, _), _ = cv2.getTextSize(hint, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    cv2.putText(frame, hint, (w - tw - 20, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_TEXT, 1, cv2.LINE_AA)


# ---- Main loop ---------------------------------------------------------------

def run(
    camera_index: int = 0,
    min_confidence: float = MIN_CONFIDENCE,
    stability_frames: int = STABILITY_FRAMES,
    debug_dir: Path = Path("debug_frames"),
) -> None:
    print("[init] Loading model ...")
    predictor = AslPredictor()
    print("[init] Model ready.")

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open camera {camera_index}.")
    
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    builder = SentenceBuilder(
        stability_frames=stability_frames,
        min_confidence=min_confidence,
    )
    frame_times: deque[float] = deque(maxlen=30)
    debug_overlay = False  # toggle with 'd'

    print("[run] Webcam open.")
    print("      q=quit  c=clear  backspace=delete  d=debug  s=save")

    try:
        while True:
            t0 = time.time()
            ok, bgr_frame = cap.read()
            if not ok:
                print("[warn] Camera read failed; stopping.")
                break

            bgr_frame = cv2.flip(bgr_frame, 1)  # mirror
            rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)

            # Inference. Going one level under predict_from_rgb so we can
            # also draw landmarks when debug is on.
            er = predictor._extractor.extract(rgb_frame)  # noqa: SLF001
            if er.found:
                features = er.normalized.reshape(1, -1)
                probs = predictor._clf.predict_proba(features)[0]  # noqa: SLF001
                best = int(np.argmax(probs))
                label = str(predictor._encoder.inverse_transform([best])[0])  # noqa: SLF001
                confidence = float(probs[best])
            else:
                label, confidence = "nothing", 1.0

            # Feed into the sentence builder.
            builder.update(label, confidence)

            # FPS book-keeping.
            frame_times.append(time.time() - t0)
            avg_dt = sum(frame_times) / len(frame_times)
            fps = 1.0 / avg_dt if avg_dt > 0 else 0.0

            # Draw.
            if debug_overlay:
                if er.found:
                    draw_landmarks(bgr_frame, er.raw_landmarks)
                draw_dev_overlay(
                    bgr_frame, label, confidence,
                    hand_detected=er.found, fps=fps,
                    min_confidence=min_confidence,
                )
            draw_subtitle(bgr_frame, builder.sentence)
            draw_hint_bar(bgr_frame, debug_overlay)

            cv2.imshow("Hi-Five — webcam test", bgr_frame)

            # Handle keys.
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("c"):
                builder.clear()
                print("[key] Sentence cleared.")
            elif key == 8:  # backspace
                builder.backspace()
            elif key == ord("d"):
                debug_overlay = not debug_overlay
                print(f"[key] Debug overlay {'on' if debug_overlay else 'off'}.")
            elif key == ord("s"):
                debug_dir.mkdir(parents=True, exist_ok=True)
                ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                path = debug_dir / f"{ts}_{label}_{int(confidence * 100)}.jpg"
                cv2.imwrite(str(path), bgr_frame)
                print(f"[save] {path}")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print(f"[done] Final sentence: {builder.sentence!r}")


def main() -> None:
    p = argparse.ArgumentParser(description="Live webcam test (subtitle mode).")
    p.add_argument("--camera", type=int, default=0)
    p.add_argument("--min-confidence", type=float, default=MIN_CONFIDENCE,
                   help=f"Confidence floor for committing a letter (default {MIN_CONFIDENCE}).")
    p.add_argument("--stability", type=int, default=STABILITY_FRAMES,
                   help=f"Frames a prediction must hold before committing (default {STABILITY_FRAMES}).")
    p.add_argument("--debug-dir", type=Path, default=Path("debug_frames"))
    args = p.parse_args()
    run(
        camera_index=args.camera,
        min_confidence=args.min_confidence,
        stability_frames=args.stability,
        debug_dir=args.debug_dir,
    )


if __name__ == "__main__":
    main()


# To run the webcam test, make sure you have OpenCV installed (`pip install opencv-python`)
# python -m src.test_webcam