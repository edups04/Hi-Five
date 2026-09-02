"""
Train a word-sign end-pose classifier using XGBoost + two-hand MediaPipe landmarks.
Uses word_features (254 dims) which include both hands padded, absolute position
and palm orientation.

Usage:
    cd Hi-Five_Recognition/ml
    python -m src.train_word_signs

Folder structure expected:
    data/word_signs/
        hello/
            img001.jpg ...
        want/
            img001.jpg ...
"""

from __future__ import annotations

import sys
import joblib
import numpy as np
from pathlib import Path
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
from xgboost import XGBClassifier

DATA_DIR   = Path("data/word_signs")
MODEL_OUT  = Path("models/word_signs_xgb.json")
ENC_OUT    = Path("models/word_signs_encoder.pkl")
LMARK_PATH = "models/hand_landmarker.task"

SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".bmp"}


def load_extractor():
    from src.landmarks import HandLandmarkExtractor
    return HandLandmarkExtractor(model_path=LMARK_PATH, num_hands=2)


def extract_features_from_image(img_path: Path, extractor) -> np.ndarray | None:
    try:
        img = Image.open(img_path).convert("RGB")
        rgb = np.asarray(img, dtype=np.uint8)
        result = extractor.extract(rgb)
        if result is None or not result.found or result.word_features is None:
            return None
        return result.word_features
    except Exception as e:
        print(f"  [warn] Failed to process {img_path.name}: {e}")
        return None


def augment(features: np.ndarray) -> list[np.ndarray]:
    augmented = [features]

    # Only one noise augmentation with stronger noise
    aug = features.copy()
    aug[:90] += np.random.normal(0, 0.05, 90).astype(np.float32)
    augmented.append(aug)

    # Mirror only
    mirrored = features.copy()
    raw_part = mirrored[:63].reshape(21, 3)
    raw_part[:, 0] = -raw_part[:, 0]
    mirrored[:63] = raw_part.flatten()
    augmented.append(mirrored)

    return augmented


def main():
    if not DATA_DIR.exists():
        print(f"[error] Data directory not found: {DATA_DIR}")
        print("  Create: data/word_signs/<sign_name>/*.jpg")
        sys.exit(1)

    sign_dirs = sorted([d for d in DATA_DIR.iterdir() if d.is_dir()])
    if not sign_dirs:
        print(f"[error] No sign folders found inside {DATA_DIR}")
        sys.exit(1)

    print(f"[info] Found {len(sign_dirs)} sign(s): {[d.name for d in sign_dirs]}")
    print("[info] Loading MediaPipe extractor (2 hands)...")
    extractor = load_extractor()

    X_raw, y_raw = [], []
    skipped_total = 0

    for sign_dir in sign_dirs:
        label = sign_dir.name
        images = [f for f in sign_dir.iterdir() if f.suffix.lower() in SUPPORTED_EXT]
        print(f"\n[info] Processing '{label}' — {len(images)} images...")

        extracted, skipped = 0, 0
        for img_path in images:
            features = extract_features_from_image(img_path, extractor)
            if features is not None:
                X_raw.append(features)
                y_raw.append(label)
                extracted += 1
            else:
                skipped += 1

        skipped_total += skipped
        print(f"  → Extracted: {extracted} | Skipped (no hand): {skipped}")

    if not X_raw:
        print("[error] No features extracted. Check that images contain visible hands.")
        sys.exit(1)

    print(f"\n[info] Total samples before augmentation: {len(X_raw)}")
    print(f"[info] Feature dimension: {X_raw[0].shape[0]}")
    print(f"[info] Total skipped: {skipped_total}")

    X_aug, y_aug = [], []
    for feat, lbl in zip(X_raw, y_raw):
        for aug_feat in augment(feat):
            X_aug.append(aug_feat)
            y_aug.append(lbl)

    X = np.array(X_aug, dtype=np.float32)
    y_str = np.array(y_aug)

    print(f"[info] Total samples after augmentation: {len(X)}")

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_str)
    print(f"[info] Classes: {list(encoder.classes_)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )
    print(f"[info] Train: {len(X_train)} | Test: {len(X_test)}")

    print("\n[info] Training XGBoost...")
    n_classes = len(encoder.classes_)
    clf = XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.6,
        colsample_bytree=0.6,
        min_child_weight=10,
        gamma=0.3,
        reg_alpha=0.5,
        reg_lambda=2.0,
        use_label_encoder=False,
        eval_metric="mlogloss" if n_classes > 2 else "logloss",
        objective="multi:softprob" if n_classes > 2 else "binary:logistic",
        num_class=n_classes if n_classes > 2 else None,
        random_state=42,
        verbosity=0,
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = (y_pred == y_test).mean()
    print(f"\n[result] Test accuracy: {acc * 100:.2f}%")
    print("\n[result] Classification report:")
    print(classification_report(y_test, y_pred, target_names=encoder.classes_))

    if n_classes > 1:
        print("[result] Confusion matrix:")
        print(confusion_matrix(y_test, y_pred))

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    clf.save_model(str(MODEL_OUT))
    joblib.dump(encoder, ENC_OUT)
    print(f"\n[info] Model saved → {MODEL_OUT}")
    print(f"[info] Encoder saved → {ENC_OUT}")
    print("\n[done] Training complete!")


if __name__ == "__main__":
    main()
