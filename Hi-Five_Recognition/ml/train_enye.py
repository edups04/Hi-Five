"""
train_enye.py
--------------
Trains a binary XGBoost classifier to detect FSL Ñ (enye).

Positive samples : data/fsl_alphabet_train/Ñ/     (500 photos)
Negative samples : data/fsl_alphabet_train/N/      (most similar letter)
                 + data/fsl_alphabet_train/<others> (random subset)

Output:
    models/enye_classifier.json
    models/enye_encoder.pkl

Usage:
    cd Hi-Five_Recognition/ml
    python train_enye.py
"""

from __future__ import annotations

import sys
import random
from pathlib import Path

import cv2
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).parent))
from src.landmarks import HandLandmarkExtractor

# ── Config ────────────────────────────────────────────────────────────────────
TRAIN_DIR       = Path("data/fsl_alphabet_train")
ENYE_DIR        = TRAIN_DIR / "Ñ"
N_DIR           = TRAIN_DIR / "N"

MODEL_OUT       = Path("models/enye_classifier.json")

ENYE_LABEL      = 1
NOT_ENYE_LABEL  = 0

# How many "not enye" samples per other letter folder to include
N_SAMPLES_FROM_N      = 500   # all N samples (most similar)
N_SAMPLES_FROM_OTHERS = 30    # random samples from each other letter

CONFIDENCE_THRESHOLD  = 0.80  # threshold to fire Ñ prediction
# ─────────────────────────────────────────────────────────────────────────────


def extract_features(img_path: Path, extractor: HandLandmarkExtractor) -> np.ndarray | None:
    """Extract 90-dim hand landmarks from an image."""
    img = cv2.imread(str(img_path))
    if img is None:
        return None
    rgb    = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = extractor.extract(np.asarray(rgb, dtype=np.uint8))
    if result is None or not result.found or result.normalized is None:
        return None
    return result.normalized.flatten().astype(np.float32)


def load_images_from_folder(
    folder: Path,
    extractor: HandLandmarkExtractor,
    max_samples: int = 9999,
    label: int = 0,
) -> tuple[list[np.ndarray], list[int]]:
    """Load and extract features from all images in a folder."""
    images = list(folder.glob("*.jpg")) + list(folder.glob("*.png"))
    random.shuffle(images)
    images = images[:max_samples]

    X, y = [], []
    skipped = 0
    for img_path in images:
        features = extract_features(img_path, extractor)
        if features is not None:
            X.append(features)
            y.append(label)
        else:
            skipped += 1

    print(f"  {folder.name:<10} — loaded: {len(X)} | skipped: {skipped}")
    return X, y


def main():
    print("=" * 60)
    print("  FSL Ñ Binary Classifier Training")
    print("=" * 60)

    print("\n[info] Loading MediaPipe extractor...")
    extractor = HandLandmarkExtractor(model_path="models/hand_landmarker.task")

    X_all, y_all = [], []

    # ── Positive samples: Ñ ──────────────────────────────────────────────────
    print(f"\n[info] Loading Ñ samples (positive)...")
    X_pos, y_pos = load_images_from_folder(ENYE_DIR, extractor, label=ENYE_LABEL)
    X_all.extend(X_pos)
    y_all.extend(y_pos)

    # ── Negative samples: N (most similar) ───────────────────────────────────
    print(f"\n[info] Loading N samples (negative — most similar)...")
    X_n, y_n = load_images_from_folder(N_DIR, extractor,
                                        max_samples=N_SAMPLES_FROM_N,
                                        label=NOT_ENYE_LABEL)
    X_all.extend(X_n)
    y_all.extend(y_n)

    # ── Negative samples: other letters ──────────────────────────────────────
    print(f"\n[info] Loading other letter samples (negative)...")
    skip_folders = {"Ñ", "N", "nothing", "samples", "space", "del", "J", "Z"}
    for folder in sorted(TRAIN_DIR.iterdir()):
        if not folder.is_dir() or folder.name in skip_folders:
            continue
        X_other, y_other = load_images_from_folder(
            folder, extractor,
            max_samples=N_SAMPLES_FROM_OTHERS,
            label=NOT_ENYE_LABEL,
        )
        X_all.extend(X_other)
        y_all.extend(y_other)

    if not X_all:
        print("[error] No samples loaded. Check folder paths.")
        sys.exit(1)

    X = np.array(X_all, dtype=np.float32)
    y = np.array(y_all, dtype=np.int32)

    print(f"\n[info] Dataset summary:")
    print(f"  Total samples : {len(X)}")
    print(f"  Ñ (positive)  : {sum(y == ENYE_LABEL)}")
    print(f"  Not Ñ (neg)   : {sum(y == NOT_ENYE_LABEL)}")
    print(f"  Feature dim   : {X.shape[1]}")

    # ── Train/test split ──────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n  Train: {len(X_train)} | Test: {len(X_test)}")

    # ── Train XGBoost ─────────────────────────────────────────────────────────
    print(f"\n[info] Training XGBoost binary classifier...")
    clf = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
    )
    clf.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # ── Evaluate ──────────────────────────────────────────────────────────────
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, ENYE_LABEL]

    print(f"\n[result] Classification Report:")
    print(classification_report(y_test, y_pred,
                                target_names=["not_enye", "enye"]))

    print(f"[result] Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Accuracy at threshold
    y_thresh = (y_prob >= CONFIDENCE_THRESHOLD).astype(int)
    tp = ((y_thresh == 1) & (y_test == 1)).sum()
    fp = ((y_thresh == 1) & (y_test == 0)).sum()
    fn = ((y_thresh == 0) & (y_test == 1)).sum()
    print(f"\n[result] At threshold {CONFIDENCE_THRESHOLD}:")
    print(f"  True Positives  (Ñ correctly detected) : {tp}")
    print(f"  False Positives (wrong Ñ detection)    : {fp}")
    print(f"  False Negatives (missed Ñ)             : {fn}")

    # ── Save model ────────────────────────────────────────────────────────────
    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    clf.save_model(str(MODEL_OUT))
    print(f"\n[saved] Model → {MODEL_OUT}")
    print(f"\n[done] Training complete!")
    print(f"[next] Restart app.py to use Ñ detection")


if __name__ == "__main__":
    main()
