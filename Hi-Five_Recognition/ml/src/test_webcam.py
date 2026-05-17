from __future__ import annotations

import argparse
import time
from collections import deque
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from .predict import AslPredictor

STABILITY_FRAMES = 5

MIN_CONFIDENCE = 0.7

RESET_FRAMES = 4

COLOR_HAND = (0, 255, 0)
COLOR_TEXT = (255, 255, 255)
COLOR_SHADOW = (0, 0, 0)
COLOR_GOOD = (0, 255, 0)
COLOR_WEAK = (0, 165, 255)
COLOR_NONE = (0, 0, 255)

SUBTITLE_FONT = cv2.FONT_HERSHEY_DUPLEX
SUBTITLE_SCALE = 1.0
SUBTITLE_THICKNESS = 1
SUBTITLE_BOTTOM_MARGIN = 50 


class SentenceBuilder:
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
        self._recent.append(label if confidence >= self.min_confidence else "_low")
        self._frames_since_commit += 1
        if (
            self._last_committed is not None
            and self._frames_since_commit >= self.reset_frames
            and label != self._last_committed
        ):
            self._last_committed = None

        if not self._should_commit(label, confidence):
            return False

        self._commit(label)
        return True

    def _should_commit(self, label: str, confidence: float) -> bool:
        if len(self._recent) < self.stability_frames:
            return False
        if confidence < self.min_confidence:
            return False
        if any(r != label for r in self._recent):
            return False
        if label == "nothing":
            return False
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
    if _fits(text, max_width):
        return text

    words = text.split(" ")
    while len(words) > 1:
        words.pop(0)
        candidate = " ".join(words)
        if _fits(candidate, max_width):
            return candidate

    last = words[0]
    while last:
        candidate = "…" + last[1:]
        if _fits(candidate, max_width):
            return candidate
        last = last[1:]
    return ""


def draw_subtitle(frame: np.ndarray, text: str) -> None:
    if not text:
        return
    h, w = frame.shape[:2]

    max_width = w - 80
    display = _fit_to_width(text, max_width)
    if not display:
        return

    (tw, th), _ = cv2.getTextSize(display, SUBTITLE_FONT, SUBTITLE_SCALE, SUBTITLE_THICKNESS)
    x = (w - tw) // 2
    y = h - SUBTITLE_BOTTOM_MARGIN

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
    h, w = frame.shape[:2]
    debug_state = "on" if debug else "off"
    hint = f"q quit  |  c clear  |  bksp delete  |  d debug ({debug_state})  |  s save"
    (tw, _), _ = cv2.getTextSize(hint, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
    cv2.putText(frame, hint, (w - tw - 20, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_TEXT, 1, cv2.LINE_AA)

def run(
    camera_index: int = 0,
    min_confidence: float = MIN_CONFIDENCE,
    stability_frames: int = STABILITY_FRAMES,
    debug_dir: Path = Path("debug_frames"),
    model_path: str = "models/asl_xgb.json",
    encoder_path: str = "models/label_encoder.pkl",
) -> None:
    print(f"[init] Loading model from {model_path} ...")
    predictor = AslPredictor(
        model_path=model_path,
        encoder_path=encoder_path,
    )
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
    debug_overlay = False 

    print("[run] Webcam open.")
    print("      q=quit  c=clear  backspace=delete  d=debug  s=save")

    try:
        while True:
            t0 = time.time()
            ok, bgr_frame = cap.read()
            if not ok:
                print("[warn] Camera read failed; stopping.")
                break

            bgr_frame = cv2.flip(bgr_frame, 1) 
            rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)

            er = predictor._extractor.extract(rgb_frame)  
            if er.found:
                features = er.normalized.reshape(1, -1)
                probs = predictor._clf.predict_proba(features)[0] 
                best = int(np.argmax(probs))
                label = str(predictor._encoder.inverse_transform([best])[0])  
                confidence = float(probs[best])
            else:
                label, confidence = "nothing", 1.0

            builder.update(label, confidence)

            frame_times.append(time.time() - t0)
            avg_dt = sum(frame_times) / len(frame_times)
            fps = 1.0 / avg_dt if avg_dt > 0 else 0.0

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

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("c"):
                builder.clear()
                print("[key] Sentence cleared.")
            elif key == 8: 
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
    p.add_argument("--model", type=str, default="models/asl_xgb.json",
                   help="Path to XGBoost model file (default: models/asl_xgb.json).")
    p.add_argument("--encoder", type=str, default="models/label_encoder.pkl",
                   help="Path to label encoder file (default: models/label_encoder.pkl).")
    args = p.parse_args()
    run(
        camera_index=args.camera,
        min_confidence=args.min_confidence,
        stability_frames=args.stability,
        debug_dir=args.debug_dir,
        model_path=args.model,
        encoder_path=args.encoder,
    )


if __name__ == "__main__":
    main()


# To run the webcam test, make sure you have OpenCV installed (`pip install opencv-python`)
# python -m src.test_webcam