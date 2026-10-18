"""
error_analysis_asl.py
----------------------
Deep error analysis on the ASL TCN baseline.

Produces:
    1. Full 105x105 confusion matrix (saved as CSV)
    2. Worst performing classes with error breakdown
    3. Confused pair analysis
    4. Landmark sequence inspection for worst classes
    5. Hand detection rate per class
    6. Feature statistics for confused pairs

Usage:
    cd Hi-Five_Recognition/ml
    python -m training.error_analysis_asl
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path
from collections import defaultdict

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

sys.path.insert(0, str(Path(__file__).parent.parent))
from training.tcn import SignTCN

# ── Config ────────────────────────────────────────────────────────────────────
FEATURES_DIR  = Path("data/ASL-Citizen/features")
TEST_DIR      = FEATURES_DIR / "test"
TEST_MANIFEST = FEATURES_DIR / "test_manifest.csv"
LABEL_MAP     = Path("models/asl_label_map.csv")
MODEL_PATH    = Path("models/asl_tcn.pth")

OUTPUT_DIR    = Path("data/ASL-Citizen/error_analysis")
BATCH_SIZE    = 32

# Classes to inspect in detail
WORST_CLASSES = ["HUNGRY", "DRAG1", "RUN1", "LUNCH1", "WISH"]
# ─────────────────────────────────────────────────────────────────────────────


class TestDataset(Dataset):
    def __init__(self, features_dir: Path, manifest_csv: Path) -> None:
        self.samples: list[tuple[Path, int, str, str]] = []
        with open(manifest_csv, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                npy_path = features_dir / row["npy_file"]
                if npy_path.exists():
                    self.samples.append((
                        npy_path,
                        int(row["label_id"]),
                        row["gloss"],
                        row["participant"],
                    ))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        npy_path, label_id, gloss, participant = self.samples[idx]
        seq = np.load(str(npy_path)).astype(np.float32)
        return torch.from_numpy(seq), torch.tensor(label_id, dtype=torch.long), gloss, participant


def collate_fn(batch):
    seqs    = torch.stack([b[0] for b in batch])
    labels  = torch.stack([b[1] for b in batch])
    glosses = [b[2] for b in batch]
    parts   = [b[3] for b in batch]
    return seqs, labels, glosses, parts


def load_label_map(path: Path) -> dict[int, str]:
    m = {}
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            m[int(row["label_id"])] = row["gloss"]
    return m


def analyze_sequence(seq: np.ndarray) -> dict:
    """Extract statistics from a (64, 302) sequence."""
    lhand_present = seq[:, 300].mean()
    rhand_present = seq[:, 301].mean()

    pos = seq[:, :144]
    vel = seq[:, 144:288]

    pos_nonzero = (pos != 0).mean()
    vel_nonzero = (vel != 0).mean()
    vel_magnitude = np.abs(vel).mean()
    pos_range = pos.max() - pos.min()

    return {
        "lhand_present_pct": round(float(lhand_present) * 100, 1),
        "rhand_present_pct": round(float(rhand_present) * 100, 1),
        "pos_nonzero_pct":   round(float(pos_nonzero) * 100, 1),
        "vel_nonzero_pct":   round(float(vel_nonzero) * 100, 1),
        "vel_magnitude_avg": round(float(vel_magnitude), 4),
        "pos_range":         round(float(pos_range), 4),
    }


def main() -> None:
    print("=" * 65)
    print("  ASL TCN Error Analysis")
    print("=" * 65)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # ── Load ──────────────────────────────────────────────────────────────────
    label_map   = load_label_map(LABEL_MAP)
    class_names = [label_map[i] for i in range(len(label_map))]
    gloss_to_id = {v: k for k, v in label_map.items()}

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

    dataset = TestDataset(TEST_DIR, TEST_MANIFEST)
    loader  = DataLoader(dataset, batch_size=BATCH_SIZE,
                         shuffle=False, collate_fn=collate_fn)

    # ── Run inference + collect metadata ─────────────────────────────────────
    print("\n[info] Running inference on test set...")
    all_preds, all_labels, all_glosses, all_parts = [], [], [], []
    all_seqs = []

    with torch.no_grad():
        for x, y, glosses, parts in loader:
            x      = x.to(device)
            logits = model(x)
            preds  = logits.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(y.numpy())
            all_glosses.extend(glosses)
            all_parts.extend(parts)
            all_seqs.extend(x.cpu().numpy())

    all_preds  = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_seqs   = np.array(all_seqs)

    n_classes = len(label_map)

    # ── 1. Full confusion matrix ──────────────────────────────────────────────
    print("\n[1] Building full confusion matrix...")
    cm = np.zeros((n_classes, n_classes), dtype=int)
    for true, pred in zip(all_labels, all_preds):
        cm[true][pred] += 1

    cm_path = OUTPUT_DIR / "confusion_matrix.csv"
    with open(cm_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([""] + class_names)
        for i, row in enumerate(cm):
            writer.writerow([class_names[i]] + list(row))
    print(f"  Saved → {cm_path}")

    # ── 2. Per-class error breakdown ──────────────────────────────────────────
    print("\n[2] Per-class error breakdown...")
    class_stats = []
    for class_id in range(n_classes):
        mask    = all_labels == class_id
        total   = mask.sum()
        correct = (all_preds[mask] == class_id).sum()
        acc     = correct / total if total > 0 else 0.0

        wrong_preds = all_preds[mask][all_preds[mask] != class_id]
        top_errors  = {}
        for p in wrong_preds:
            top_errors[class_names[p]] = top_errors.get(class_names[p], 0) + 1
        top_errors = sorted(top_errors.items(), key=lambda x: x[1], reverse=True)

        class_stats.append({
            "class_id":   class_id,
            "gloss":      class_names[class_id],
            "total":      int(total),
            "correct":    int(correct),
            "accuracy":   round(acc * 100, 1),
            "top_errors": top_errors[:3],
        })

    class_stats.sort(key=lambda x: x["accuracy"])

    # Print worst 20
    print(f"\n  {'#':<5} {'Gloss':<25} {'Acc':>6}  Top Errors")
    print(f"  {'-'*65}")
    for s in class_stats[:20]:
        errors_str = " | ".join(
            f"{name}({count})" for name, count in s["top_errors"]
        )
        print(f"  {s['class_id']:<5} {s['gloss']:<25} {s['accuracy']:>5}%  {errors_str}")

    # Save full breakdown
    breakdown_path = OUTPUT_DIR / "per_class_breakdown.csv"
    with open(breakdown_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "class_id", "gloss", "total", "correct", "accuracy", "top_errors"
        ])
        writer.writeheader()
        for s in class_stats:
            writer.writerow({**s, "top_errors": str(s["top_errors"])})
    print(f"\n  Saved → {breakdown_path}")

    # ── 3. Confused pair analysis ─────────────────────────────────────────────
    print("\n[3] Confused pair analysis...")
    pairs = []
    for i in range(n_classes):
        for j in range(n_classes):
            if i != j and cm[i][j] > 0:
                pairs.append({
                    "true_id":   i,
                    "pred_id":   j,
                    "true_name": class_names[i],
                    "pred_name": class_names[j],
                    "count":     int(cm[i][j]),
                    "true_total": int(cm[i].sum()),
                    "error_rate": round(cm[i][j] / cm[i].sum() * 100, 1),
                })
    pairs.sort(key=lambda x: x["count"], reverse=True)

    print(f"\n  {'Count':>6}  {'Error%':>7}  {'True Label':<25} {'Predicted As':<25}")
    print(f"  {'-'*68}")
    for p in pairs[:20]:
        print(f"  {p['count']:>6}  {p['error_rate']:>6}%  {p['true_name']:<25} {p['pred_name']:<25}")

    pairs_path = OUTPUT_DIR / "confused_pairs.csv"
    with open(pairs_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=pairs[0].keys())
        writer.writeheader()
        writer.writerows(pairs)
    print(f"\n  Saved → {pairs_path}")

    # ── 4. Feature inspection for worst classes ───────────────────────────────
    print(f"\n[4] Feature inspection for worst classes: {WORST_CLASSES}")
    print(f"\n  {'Gloss':<20} {'LHand%':>8} {'RHand%':>8} {'Vel Mag':>9} {'Pos Range':>10} {'Result'}")
    print(f"  {'-'*70}")

    inspection_rows = []
    for gloss in WORST_CLASSES:
        if gloss not in gloss_to_id:
            continue
        class_id = gloss_to_id[gloss]
        mask     = all_labels == class_id

        correct_seqs = all_seqs[mask][all_preds[mask] == class_id]
        wrong_seqs   = all_seqs[mask][all_preds[mask] != class_id]

        for seqs, result in [(correct_seqs, "CORRECT"), (wrong_seqs, "WRONG")]:
            if len(seqs) == 0:
                continue
            stats = analyze_sequence(seqs.mean(axis=0))
            print(
                f"  {gloss:<20} {stats['lhand_present_pct']:>7}% "
                f"{stats['rhand_present_pct']:>7}% "
                f"{stats['vel_magnitude_avg']:>9.4f} "
                f"{stats['pos_range']:>10.4f}  {result} (n={len(seqs)})"
            )
            inspection_rows.append({
                "gloss": gloss, "result": result, "n": len(seqs), **stats
            })

    inspect_path = OUTPUT_DIR / "feature_inspection.csv"
    with open(inspect_path, "w", newline="", encoding="utf-8") as f:
        if inspection_rows:
            writer = csv.DictWriter(f, fieldnames=inspection_rows[0].keys())
            writer.writeheader()
            writer.writerows(inspection_rows)
    print(f"\n  Saved → {inspect_path}")

    # ── 5. Hand detection rate per class ─────────────────────────────────────
    print(f"\n[5] Hand detection rate per class (worst 20)...")

    # Build accuracy lookup by class_id
    acc_by_class = {s["class_id"]: s["accuracy"] for s in class_stats}

    detection_stats = []
    for class_id in range(n_classes):
        mask = all_labels == class_id
        seqs = all_seqs[mask]
        if len(seqs) == 0:
            continue
        lhand = seqs[:, :, 300].mean() * 100
        rhand = seqs[:, :, 301].mean() * 100

        detection_stats.append({
            "class_id":  class_id,
            "gloss":     class_names[class_id],
            "lhand_pct": round(float(lhand), 1),
            "rhand_pct": round(float(rhand), 1),
            "accuracy":  acc_by_class.get(class_id, 0.0),
        })

    detection_stats.sort(key=lambda x: x["accuracy"])

    detection_stats.sort(key=lambda x: x["accuracy"])

    print(f"\n  {'Gloss':<25} {'LHand%':>8} {'RHand%':>8} {'Acc':>8}")
    print(f"  {'-'*52}")
    for s in detection_stats[:20]:
        flag = " ← low detection" if s["lhand_pct"] < 20 and s["rhand_pct"] < 20 else ""
        print(f"  {s['gloss']:<25} {s['lhand_pct']:>7}% {s['rhand_pct']:>7}% {s['accuracy']:>7}%{flag}")

    det_path = OUTPUT_DIR / "hand_detection_per_class.csv"
    with open(det_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=detection_stats[0].keys())
        writer.writeheader()
        writer.writerows(detection_stats)
    print(f"\n  Saved → {det_path}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*65}")
    print(f"  ERROR ANALYSIS SUMMARY")
    print(f"{'='*65}")
    acc = (all_preds == all_labels).mean()
    print(f"  Test accuracy        : {acc*100:.2f}%")
    print(f"  Classes below 50%    : {sum(1 for s in class_stats if s['accuracy'] < 50)}")
    print(f"  Classes below 70%    : {sum(1 for s in class_stats if s['accuracy'] < 70)}")
    print(f"  Classes at 100%      : {sum(1 for s in class_stats if s['accuracy'] == 100)}")
    print(f"  Top confused pair    : {pairs[0]['true_name']} → {pairs[0]['pred_name']} ({pairs[0]['count']} errors)")
    print(f"\n  Output files saved to: {OUTPUT_DIR}")
    print(f"    confusion_matrix.csv")
    print(f"    per_class_breakdown.csv")
    print(f"    confused_pairs.csv")
    print(f"    feature_inspection.csv")
    print(f"    hand_detection_per_class.csv")
    print(f"\n[done] Error analysis complete")


if __name__ == "__main__":
    main()
