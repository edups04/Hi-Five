"""
train_asl.py
-------------
Trains the ASL TCN model on preprocessed ASL Citizen features.

Uses:
    data/ASL-Citizen/features/train/   ← training sequences
    data/ASL-Citizen/features/val/     ← validation sequences
    data/ASL-Citizen/features/label_map.csv

Saves:
    models/asl_tcn.pth                 ← best model weights
    models/asl_label_map.csv           ← class label mapping

Usage:
    cd Hi-Five_Recognition/ml
    python -m training.train_asl
"""

from __future__ import annotations

import csv
import sys
import time
import shutil
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau

sys.path.insert(0, str(Path(__file__).parent.parent))
from training.tcn import SignTCN

# ── Config ────────────────────────────────────────────────────────────────────
FEATURES_DIR = Path("data/ASL-Citizen/features")
TRAIN_DIR    = FEATURES_DIR / "train"
VAL_DIR      = FEATURES_DIR / "val"
LABEL_MAP    = FEATURES_DIR / "label_map.csv"

MODELS_DIR   = Path("models")
MODEL_OUT    = MODELS_DIR / "asl_tcn.pth"
LABEL_OUT    = MODELS_DIR / "asl_label_map.csv"

# Feature spec
SEQ_LEN     = 64
FEATURE_DIM = 302
NUM_CLASSES = 105

# Architecture
CHANNELS    = [64, 128, 128, 256]
DILATIONS   = [1, 2, 4, 8]
KERNEL_SIZE = 3
DROPOUT     = 0.2
FC_DROPOUT  = 0.4

# Training
BATCH_SIZE     = 32
MAX_EPOCHS     = 150
LR             = 3e-4
WEIGHT_DECAY   = 1e-4
PATIENCE       = 15       # early stopping
LR_PATIENCE    = 5        # ReduceLROnPlateau patience
LR_FACTOR      = 0.5

# Augmentation (training only)
NOISE_STD      = 0.01
TIME_MASK_MIN  = 3
TIME_MASK_MAX  = 8
# ─────────────────────────────────────────────────────────────────────────────


class SignDataset(Dataset):
    def __init__(
        self,
        features_dir: Path,
        manifest_csv: Path,
        augment: bool = False,
    ) -> None:
        self.features_dir = features_dir
        self.augment      = augment
        self.samples: list[tuple[Path, int]] = []

        with open(manifest_csv, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                npy_path = features_dir / row["npy_file"]
                label_id = int(row["label_id"])
                if npy_path.exists():
                    self.samples.append((npy_path, label_id))

        print(f"  Dataset: {len(self.samples)} sequences from {features_dir.name}/")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        npy_path, label_id = self.samples[idx]
        seq = np.load(str(npy_path)).astype(np.float32)  # (64, 290)

        if self.augment:
            seq = self._augment(seq)

        return torch.from_numpy(seq), torch.tensor(label_id, dtype=torch.long)

    def _augment(self, seq: np.ndarray) -> np.ndarray:
        seq = seq.copy()

        # Gaussian noise on position + velocity features (not flags)
        noise = np.random.normal(0, NOISE_STD, (seq.shape[0], 288)).astype(np.float32)
        seq[:, :288] += noise

        # Time masking — randomly zero out a short block of frames
        mask_len   = np.random.randint(TIME_MASK_MIN, TIME_MASK_MAX + 1)
        mask_start = np.random.randint(0, SEQ_LEN - mask_len)
        seq[mask_start:mask_start + mask_len] = 0.0

        return seq


def load_label_map(path: Path) -> dict[int, str]:
    label_map = {}
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            label_map[int(row["label_id"])] = row["gloss"]
    return label_map


def train_one_epoch(
    model:      nn.Module,
    loader:     DataLoader,
    criterion:  nn.Module,
    optimizer:  torch.optim.Optimizer,
    device:     torch.device,
) -> tuple[float, float]:
    model.train()
    total_loss, correct, total = 0.0, 0, 0

    for x, y in loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        logits = model(x)
        loss   = criterion(logits, y)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item() * x.size(0)
        preds       = logits.argmax(dim=1)
        correct    += (preds == y).sum().item()
        total      += x.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(
    model:     nn.Module,
    loader:    DataLoader,
    criterion: nn.Module,
    device:    torch.device,
) -> tuple[float, float]:
    model.eval()
    total_loss, correct, total = 0.0, 0, 0

    for x, y in loader:
        x, y   = x.to(device), y.to(device)
        logits = model(x)
        loss   = criterion(logits, y)

        total_loss += loss.item() * x.size(0)
        preds       = logits.argmax(dim=1)
        correct    += (preds == y).sum().item()
        total      += x.size(0)

    return total_loss / total, correct / total


def main() -> None:
    print("=" * 65)
    print("  ASL TCN Training")
    print("=" * 65)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n  Device      : {device}")
    print(f"  Seq len     : {SEQ_LEN}")
    print(f"  Feature dim : {FEATURE_DIM}")
    print(f"  Num classes : {NUM_CLASSES}")
    print(f"  Channels    : {CHANNELS}")
    print(f"  Dilations   : {DILATIONS}")
    print(f"  Batch size  : {BATCH_SIZE}")
    print(f"  Max epochs  : {MAX_EPOCHS}")
    print(f"  LR          : {LR}")
    print(f"  Weight decay: {WEIGHT_DECAY}")
    print(f"  ES patience : {PATIENCE}")

    # ── Datasets ──────────────────────────────────────────────────────────────
    print("\n[info] Loading datasets...")
    train_dataset = SignDataset(
        TRAIN_DIR,
        FEATURES_DIR / "train_manifest.csv",
        augment=True,
    )
    val_dataset = SignDataset(
        VAL_DIR,
        FEATURES_DIR / "val_manifest.csv",
        augment=False,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
        pin_memory=(device.type == "cuda"),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        pin_memory=(device.type == "cuda"),
    )

    # ── Model ─────────────────────────────────────────────────────────────────
    print("\n[info] Building model...")
    model = SignTCN(
        feature_dim=FEATURE_DIM,
        num_classes=NUM_CLASSES,
        channels=CHANNELS,
        dilations=DILATIONS,
        kernel_size=KERNEL_SIZE,
        dropout=DROPOUT,
        fc_dropout=FC_DROPOUT,
    ).to(device)

    print(f"  Trainable parameters: {model.count_parameters():,}")

    # ── Training setup ────────────────────────────────────────────────────────
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = ReduceLROnPlateau(
        optimizer,
        mode="min",
        factor=LR_FACTOR,
        patience=LR_PATIENCE,
    )

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    best_val_loss  = float("inf")
    best_val_acc   = 0.0
    patience_count = 0
    best_epoch     = 0

    # ── Training loop ─────────────────────────────────────────────────────────
    log_rows = []

    print(f"\n[info] Training started...\n")
    
    print(f"{'Epoch':>6} {'Train Loss':>11} {'Train Acc':>10} {'Val Loss':>10} {'Val Acc':>9} {'LR':>10} {'Time':>7}")
    print("-" * 70)

    for epoch in range(1, MAX_EPOCHS + 1):
        t0 = time.time()

        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss,   val_acc   = evaluate(model, val_loader, criterion, device)

        scheduler.step(val_loss)
        current_lr = optimizer.param_groups[0]["lr"]
        elapsed    = time.time() - t0

        print(
            f"{epoch:>6} {train_loss:>11.4f} {train_acc*100:>9.2f}% "
            f"{val_loss:>10.4f} {val_acc*100:>8.2f}% "
            f"{current_lr:>10.2e} {elapsed:>6.1f}s"
        )
        # Save training log to CSV
        log_rows.append({
            "epoch":     epoch,
            "train_loss": round(train_loss, 4),
            "train_acc":  round(train_acc * 100, 2),
            "val_loss":   round(val_loss, 4),
            "val_acc":    round(val_acc * 100, 2),
            "lr":         current_lr,
            "time_s":     round(elapsed, 1),
        })

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss  = val_loss
            best_val_acc   = val_acc
            best_epoch     = epoch
            patience_count = 0
            torch.save({
                "epoch":        epoch,
                "model_state":  model.state_dict(),
                "val_loss":     val_loss,
                "val_acc":      val_acc,
                "num_classes":  NUM_CLASSES,
                "feature_dim":  FEATURE_DIM,
                "seq_len":      SEQ_LEN,
                "channels":     CHANNELS,
                "dilations":    DILATIONS,
                "kernel_size":  KERNEL_SIZE,
                "dropout":      DROPOUT,
                "fc_dropout":   FC_DROPOUT,
            }, MODEL_OUT)
        else:
            patience_count += 1
            if patience_count >= PATIENCE:
                print(f"\n[early stop] No improvement for {PATIENCE} epochs. Stopping at epoch {epoch}.")
                break
            
        # Save training log
    log_path = MODELS_DIR / "asl_training_log.csv"
    with open(log_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=log_rows[0].keys())
        writer.writeheader()
        writer.writerows(log_rows)
    print(f"  Training log saved: {log_path}")

    # ── Save label map ────────────────────────────────────────────────────────
    shutil.copy(LABEL_MAP, LABEL_OUT)

    # ── Final summary ─────────────────────────────────────────────────────────
    print(f"\n{'='*65}")
    print(f"[done] Training complete")
    print(f"  Best epoch     : {best_epoch}")
    print(f"  Best val loss  : {best_val_loss:.4f}")
    print(f"  Best val acc   : {best_val_acc*100:.2f}%")
    print(f"  Model saved    : {MODEL_OUT}")
    print(f"  Label map saved: {LABEL_OUT}")
    print(f"\n[next] python -m training.evaluate_asl")


if __name__ == "__main__":
    main()
