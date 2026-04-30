"""
Train the XGBoost ASL alphabet classifier from a landmarks CSV.

Input:  data/landmarks.csv  (produced by extract_features.py)
Output: models/asl_xgb.json + models/label_encoder.pkl

The training setup mirrors Valentinetemi's reference repo (the
MediaPipe-landmarks + XGBoost pipeline reporting 98.43% accuracy):
    - 80/20 stratified train/test split
    - LabelEncoder for class labels (XGBoost wants integers)
    - XGBClassifier with multi-class softprob
    - Reports accuracy, classification report, and confusion matrix

Usage:
    python -m src.train
    python -m src.train --csv data/landmarks.csv --out-dir models
    python -m src.train --quick    # smaller, faster training for smoke tests
"""

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

from .landmarks import FEATURE_DIM


def load_dataset(csv_path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Load the landmarks CSV and split into X (features) and y (string labels)."""
    print(f"[load] Reading {csv_path} ...")
    df = pd.read_csv(csv_path)

    feature_cols = [f"f{i}" for i in range(FEATURE_DIM)]
    missing = [c for c in feature_cols + ["label"] if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")

    X = df[feature_cols].to_numpy(dtype=np.float32)
    y = df["label"].to_numpy()

    print(f"[load] {len(df):,} samples, {len(np.unique(y))} classes")
    print(f"[load] Class distribution:")
    counts = pd.Series(y).value_counts().sort_index()
    for cls, n in counts.items():
        print(f"        {cls:>5}: {n:,}")
    return X, y


def train(
    csv_path: Path,
    out_dir: Path,
    test_size: float = 0.2,
    random_state: int = 42,
    quick: bool = False,
) -> None:
    X, y_str = load_dataset(csv_path)

    # Encode string labels -> integers for XGBoost.
    le = LabelEncoder()
    y = le.fit_transform(y_str)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        stratify=y,            # keeps class balance in both splits
        random_state=random_state,
    )
    print(f"[split] train={len(X_train):,}  test={len(X_test):,}")

    # Hyperparameters: defaults are reasonable for this many features (63)
    # and this many classes (~28). `quick` mode is for smoke-testing the pipeline.
    if quick:
        params = dict(n_estimators=50, max_depth=4, learning_rate=0.3)
    else:
        params = dict(n_estimators=300, max_depth=6, learning_rate=0.1)

    clf = XGBClassifier(
        objective="multi:softprob",
        num_class=len(le.classes_),
        tree_method="hist",        # fast and CPU-friendly
        n_jobs=-1,
        eval_metric="mlogloss",
        random_state=random_state,
        **params,
    )

    print(f"[train] Fitting XGBoost ({params}) ...")
    clf.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # --- Evaluate ---
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\n[eval] Test accuracy: {acc * 100:.2f}%")
    print("\n[eval] Classification report:")
    print(classification_report(
        y_test, y_pred,
        target_names=le.classes_,
        digits=3,
    ))

    # Print a confusion matrix in plain text. (Skip the matplotlib heatmap here
    # to keep the script dependency-light; you can always plot the matrix from
    # a notebook if you want a visual.)
    cm = confusion_matrix(y_test, y_pred)
    print("[eval] Confusion matrix (rows=true, cols=pred):")
    header = "      " + " ".join(f"{c:>4}" for c in le.classes_)
    print(header)
    for cls, row in zip(le.classes_, cm):
        print(f"{cls:>5} " + " ".join(f"{v:>4}" for v in row))

    # --- Save ---
    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "asl_xgb.json"
    encoder_path = out_dir / "label_encoder.pkl"
    clf.save_model(str(model_path))
    joblib.dump(le, encoder_path)
    print(f"\n[save] Model:   {model_path}")
    print(f"[save] Encoder: {encoder_path}")


def main() -> None:
    p = argparse.ArgumentParser(description="Train the XGBoost ASL alphabet classifier.")
    p.add_argument("--csv", type=Path, default=Path("data/landmarks.csv"))
    p.add_argument("--out-dir", type=Path, default=Path("models"))
    p.add_argument("--test-size", type=float, default=0.2)
    p.add_argument("--random-state", type=int, default=42)
    p.add_argument(
        "--quick",
        action="store_true",
        help="Use small/fast hyperparameters (for smoke testing the pipeline).",
    )
    args = p.parse_args()

    train(
        csv_path=args.csv,
        out_dir=args.out_dir,
        test_size=args.test_size,
        random_state=args.random_state,
        quick=args.quick,
    )


if __name__ == "__main__":
    main()
