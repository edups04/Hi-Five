"""
Standalone webcam test for word sign detection.
Tests both XGBoost (end-pose) and LSTM (sequence) models simultaneously.

Usage:
    cd Hi-Five_Recognition/ml
    python test_word_signs.py

Controls:
    Q — quit
"""

from __future__ import annotations

import time
import sys
import os
from collections import deque
from pathlib import Path

import cv2
import numpy as np
import joblib
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).parent))
from src.landmarks import HandLandmarkExtractor

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

# ── Config ────────────────────────────────────────────────────────────────────
XGB_MODEL_PATH   = "models/word_signs_xgb.json"
XGB_ENCODER_PATH = "models/word_signs_encoder.pkl"
LSTM_MODEL_PATH  = "models/word_signs_lstm.keras"
LSTM_ENC_PATH    = "models/word_signs_lstm_encoder.pkl"
LANDMARKER_PATH  = "models/hand_landmarker.task"

MOTION_WINDOW       = 25
MOTION_THRESHOLD    = 0.20
HOLD_DURATION       = 0.50
WORD_COOLDOWN       = 2.0
MIN_DISPLACEMENT    = 0.10
XGB_CONFIDENCE      = 0.82
LSTM_CONFIDENCE     = 0.50
LSTM_SEQ_LEN        = 30
# ─────────────────────────────────────────────────────────────────────────────


def load_xgb():
    if not Path(XGB_MODEL_PATH).exists():
        print("[warn] XGBoost model not found — XGBoost detection disabled")
        return None, None
    clf = XGBClassifier()
    clf.load_model(XGB_MODEL_PATH)
    encoder = joblib.load(XGB_ENCODER_PATH)
    print(f"[init] XGBoost classes: {list(encoder.classes_)}")
    return clf, encoder


def load_lstm():
    if not Path(LSTM_MODEL_PATH).exists():
        print("[warn] LSTM model not found — LSTM detection disabled")
        return None, None
    import tensorflow as tf
    model   = tf.keras.models.load_model(LSTM_MODEL_PATH)
    encoder = joblib.load(LSTM_ENC_PATH)
    print(f"[init] LSTM classes: {list(encoder.classes_)}")
    return model, encoder


def main():
    print("[init] Loading XGBoost model...")
    xgb_clf, xgb_enc = load_xgb()

    print("[init] Loading LSTM model...")
    lstm_model, lstm_enc = load_lstm()

    print("[init] Loading MediaPipe extractor...")
    extractor = HandLandmarkExtractor(model_path=LANDMARKER_PATH, num_hands=1)
    print("[init] Starting webcam...")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[error] Could not open webcam.")
        return

    wrist_history: deque[tuple[float, float]] = deque(maxlen=MOTION_WINDOW)
    lstm_buffer:   deque[np.ndarray]          = deque(maxlen=LSTM_SEQ_LEN)

    hold_label  = ""
    hold_start  = 0.0
    last_word_time: dict[str, float] = {}
    last_word_shown       = ""
    last_word_source      = ""
    last_word_display_time = 0.0

    print("[ready] Show your hand and sign! Press Q to quit.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        now   = time.time()

        result       = extractor.extract(rgb)
        hand_detected = result is not None and result.found

        motion_detected  = False
        xgb_label        = ""
        xgb_confidence   = 0.0
        lstm_label_raw   = ""
        lstm_conf_raw    = 0.0

        if hand_detected:
            raw   = result.raw_landmarks.reshape(21, 3)
            wrist = (float(raw[0, 0]), float(raw[0, 1]))
            wrist_history.append(wrist)

            # Push to LSTM buffer
            if result.normalized is not None:
                lstm_buffer.append(result.normalized.copy())

            # Check motion
            if len(wrist_history) >= MOTION_WINDOW // 2:
                positions    = np.array(wrist_history)
                total_disp   = float(np.sum(np.linalg.norm(np.diff(positions, axis=0), axis=1)))
                start_to_end = float(np.linalg.norm(positions[-1] - positions[0]))
                motion_detected = total_disp > MOTION_THRESHOLD and start_to_end > MIN_DISPLACEMENT

            # ── XGBoost end-pose detection ────────────────────────────────
            if motion_detected and xgb_clf is not None and result.word_features is not None:
                features  = result.word_features.reshape(1, -1)
                probs     = xgb_clf.predict_proba(features)[0]
                best_idx  = int(np.argmax(probs))
                xgb_label = str(xgb_enc.inverse_transform([best_idx])[0])
                xgb_confidence = float(probs[best_idx])

                if xgb_confidence >= XGB_CONFIDENCE:
                    if xgb_label != hold_label:
                        hold_label = xgb_label
                        hold_start = now
                    elif now - hold_start >= HOLD_DURATION:
                        last_fired = last_word_time.get(xgb_label, 0.0)
                        if now - last_fired >= WORD_COOLDOWN:
                            last_word_time[xgb_label]  = now
                            last_word_shown            = xgb_label.upper()
                            last_word_source           = "XGB"
                            last_word_display_time     = now
                            print(f"[XGB DETECTED] {xgb_label.upper()} ({xgb_confidence:.2f})")
                            hold_label = ""
                            hold_start = 0.0
                else:
                    hold_label = ""
                    hold_start = 0.0
            elif not motion_detected:
                hold_label = ""
                hold_start = 0.0

            # ── LSTM sequence detection ───────────────────────────────────
            if (motion_detected and lstm_model is not None and
                    len(lstm_buffer) >= LSTM_SEQ_LEN):
                seq        = np.array(lstm_buffer, dtype=np.float32)[np.newaxis]
                probs      = lstm_model.predict(seq, verbose=0)[0]
                best_idx   = int(np.argmax(probs))
                lstm_conf_raw  = float(probs[best_idx])
                lstm_label_raw = str(lstm_enc.inverse_transform([best_idx])[0])

                if lstm_conf_raw >= LSTM_CONFIDENCE:
                    last_fired = last_word_time.get(lstm_label_raw, 0.0)
                    if now - last_fired >= WORD_COOLDOWN:
                        last_word_time[lstm_label_raw] = now
                        last_word_shown                = lstm_label_raw.upper()
                        last_word_source               = "LSTM"
                        last_word_display_time         = now
                        print(f"[LSTM DETECTED] {lstm_label_raw.upper()} ({lstm_conf_raw:.2f})")
                        lstm_buffer.clear()

        h, w = frame.shape[:2]

        # Status overlays
        status_color = (0, 200, 0) if motion_detected else (0, 120, 255)
        status_text  = "MOVING" if motion_detected else "STATIC"
        cv2.putText(frame, f"Hand: {'YES' if hand_detected else 'NO'}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"Motion: {status_text}", (10, 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

        # XGB candidate
        if motion_detected and xgb_label and xgb_confidence >= XGB_CONFIDENCE:
            cv2.putText(frame, f"XGB: {xgb_label} ({xgb_confidence:.2f})", (10, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            held  = now - hold_start
            bar_w = int(min(held / HOLD_DURATION, 1.0) * 200)
            cv2.rectangle(frame, (10, 90), (210, 108), (50, 50, 50), -1)
            cv2.rectangle(frame, (10, 90), (10 + bar_w, 108), (0, 200, 100), -1)

        # LSTM candidate
        if motion_detected and lstm_label_raw:
            lstm_color = (0, 255, 180) if lstm_conf_raw >= LSTM_CONFIDENCE else (100, 100, 100)
            cv2.putText(frame, f"LSTM: {lstm_label_raw} ({lstm_conf_raw:.2f}) buf={len(lstm_buffer)}/{LSTM_SEQ_LEN}",
                        (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.55, lstm_color, 2)

        # Word display
        if last_word_shown and now - last_word_display_time < 2.0:
            text_size = cv2.getTextSize(last_word_shown, cv2.FONT_HERSHEY_SIMPLEX, 2.0, 4)[0]
            tx = (w - text_size[0]) // 2
            ty = h - 60
            cv2.rectangle(frame, (tx - 10, ty - text_size[1] - 10),
                          (tx + text_size[0] + 10, ty + 10), (0, 0, 0), -1)
            cv2.putText(frame, last_word_shown, (tx, ty),
                        cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 220, 120), 4)
            src_color = (0, 255, 180) if last_word_source == "LSTM" else (0, 255, 255)
            cv2.putText(frame, f"via {last_word_source}", (tx, ty + 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, src_color, 2)

        cv2.imshow("Word Sign Test (XGB + LSTM) — Q to quit", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("[done] Test ended.")


if __name__ == "__main__":
    main()
