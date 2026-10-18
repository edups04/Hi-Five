"""
evaluate_asl.py
----------------
Evaluates the trained ASL TCN model on the test set.

Produces:
    - Overall accuracy, precision, recall, F1
    - Per-class accuracy
    - Confusion matrix
    - Top-5 most confused sign pairs

Usage:
    cd Hi-Five_Recognition/ml
    python -m training.evaluate_asl
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path
from collections import defaultdict

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

sys.path.insert(0, str(Path(__file__).parent.parent))
from training.tcn import SignTCN

# ── Config ────────────────────────────────────────────────────────────────────
FEATURES_DIR = Path("data/ASL-Citizen/features")
TEST_DIR     = FEATURES_DIR / "test"
TEST_MANIFEST = FEATURES_DIR / "test_manifest.csv"
LABEL_MAP    = Path("models/asl_label_map.csv")
MODEL_PATH   = Path("models/asl_tcn.pth")

BATCH_SIZE   = 32
# ─────────────────────────────────────────────────────────────────────────────


class TestDataset(Dataset):
    def __init__(self, features_dir: Path, manifest_csv: Path) -> None:
        self.samples: list[tuple[Path, int]] = []
        with open(manifest_csv, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                npy_path = features_dir / row["npy_file"]
                label_id = int(row["label_id"])
                if npy_path.exists():
                    self.samples.append((npy_path, label_id))
        print(f"  Test dataset: {len(self.samples)} sequences")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        npy_path, label_id = self.samples[idx]
        seq = np.load(str(npy_path)).astype(np.float32)
        return torch.from_numpy(seq), torch.tensor(label_id, dtype=torch.long)


def load_label_map(path: Path) -> dict[int, str]:
    label_map = {}
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            label_map[int(row["label_id"])] = row["gloss"]
    return label_map


def main() -> None:
    print("=" * 65)
    print("  ASL TCN Evaluation")
    print("=" * 65)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n  Device: {device}")

    # ── Load label map ────────────────────────────────────────────────────────
    label_map = load_label_map(LABEL_MAP)
    class_names = [label_map[i] for i in range(len(label_map))]

    # ── Load model ────────────────────────────────────────────────────────────
    print(f"\n[info] Loading model from {MODEL_PATH}...")
    checkpoint = torch.load(MODEL_PATH, map_location=device)

    model = SignTCN(
        feature_dim=checkpoint["feature_dim"],
        num_classes=checkpoint["num_classes"],
        channels=checkpoint["channels"],
        dilations=checkpoint["dilations"],
        kernel_size=checkpoint["kernel_size"],
        dropout=checkpoint["dropout"],
        fc_dropout=checkpoint["fc_dropout"],
    ).to(device)

    model.load_state_dict(checkpoint["model_state"])
    model.eval()

    print(f"  Loaded from epoch {checkpoint['epoch']}")
    print(f"  Val acc at save time: {checkpoint['val_acc']*100:.2f}%")

    # ── Load test data ────────────────────────────────────────────────────────
    print(f"\n[info] Loading test data...")
    test_dataset = TestDataset(TEST_DIR, TEST_MANIFEST)
    test_loader  = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    # ── Run inference ─────────────────────────────────────────────────────────
    print(f"\n[info] Running inference...")
    all_preds  = []
    all_labels = []

    with torch.no_grad():
        for x, y in test_loader:
            x = x.to(device)
            logits = model(x)
            preds  = logits.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(y.numpy())

    all_preds  = np.array(all_preds)
    all_labels = np.array(all_labels)

    # ── Overall metrics ───────────────────────────────────────────────────────
    acc  = accuracy_score(all_labels, all_preds)
    prec = precision_score(all_labels, all_preds, average="macro", zero_division=0)
    rec  = recall_score(all_labels, all_preds, average="macro", zero_division=0)
    f1   = f1_score(all_labels, all_preds, average="macro", zero_division=0)

    print(f"\n{'='*65}")
    print(f"  OVERALL RESULTS (Test Set)")
    print(f"{'='*65}")
    print(f"  Accuracy  : {acc*100:.2f}%")
    print(f"  Precision : {prec*100:.2f}%  (macro)")
    print(f"  Recall    : {rec*100:.2f}%  (macro)")
    print(f"  F1 Score  : {f1*100:.2f}%  (macro)")
    print(f"  Samples   : {len(all_labels)}")

    # ── Per-class accuracy ────────────────────────────────────────────────────
    print(f"\n{'─'*65}")
    print(f"  PER-CLASS ACCURACY")
    print(f"{'─'*65}")
    print(f"  {'#':<5} {'Gloss':<25} {'Correct':>8} {'Total':>7} {'Acc':>8}")
    print(f"  {'-'*55}")

    per_class_correct = defaultdict(int)
    per_class_total   = defaultdict(int)
    for pred, label in zip(all_preds, all_labels):
        per_class_total[label]   += 1
        if pred == label:
            per_class_correct[label] += 1

    per_class_acc = []
    for class_id in range(len(label_map)):
        total   = per_class_total[class_id]
        correct = per_class_correct[class_id]
        acc_c   = correct / total if total > 0 else 0.0
        per_class_acc.append((class_id, class_names[class_id], correct, total, acc_c))

    per_class_acc.sort(key=lambda x: x[4])

    for class_id, name, correct, total, acc_c in per_class_acc:
        flag = " ←" if acc_c < 0.5 else ""
        print(f"  {class_id:<5} {name:<25} {correct:>8} {total:>7} {acc_c*100:>7.1f}%{flag}")

    # ── Top confused pairs ────────────────────────────────────────────────────
    print(f"\n{'─'*65}")
    print(f"  TOP 10 MOST CONFUSED SIGN PAIRS")
    print(f"{'─'*65}")

    cm = confusion_matrix(all_labels, all_preds, labels=list(range(len(label_map))))
    confused_pairs = []
    for true_id in range(len(label_map)):
        for pred_id in range(len(label_map)):
            if true_id != pred_id and cm[true_id][pred_id] > 0:
                confused_pairs.append((
                    cm[true_id][pred_id],
                    class_names[true_id],
                    class_names[pred_id],
                ))
    confused_pairs.sort(reverse=True)

    print(f"  {'Count':>6}  {'True Label':<25} {'Predicted As':<25}")
    print(f"  {'-'*58}")
    for count, true_name, pred_name in confused_pairs[:10]:
        print(f"  {count:>6}  {true_name:<25} {pred_name:<25}")

    # ── Summary ───────────────────────────────────────────────────────────────
    low_acc_classes = [c for c in per_class_acc if c[4] < 0.5]
    print(f"\n{'='*65}")
    print(f"  SUMMARY")
    print(f"{'='*65}")
    print(f"  Test accuracy      : {acc*100:.2f}%")
    print(f"  Classes below 50%  : {len(low_acc_classes)}")
    print(f"  Best class acc     : {max(c[4] for c in per_class_acc)*100:.1f}%")
    print(f"  Worst class acc    : {min(c[4] for c in per_class_acc)*100:.1f}%")
    print(f"  Avg class acc      : {sum(c[4] for c in per_class_acc)/len(per_class_acc)*100:.1f}%")
    print(f"\n[done] Evaluation complete")


if __name__ == "__main__":
    main()
