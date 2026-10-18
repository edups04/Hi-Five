"""
train_fsl_10.py
----------------
Trains a 10-class FSL TCN model on a subset of FSL-105 features.

Classes (remapped to 0-9):
    HELLO, YES, NO, FIVE, TODAY, FATHER, MOTHER, RED, RICE, MILK

Uses:
    data/FSL-105/features/train/   ← training sequences
    data/FSL-105/features/test/    ← test sequences
    data/FSL-105/labels.csv        ← class label mapping

Saves:
    models/fsl_tcn_10.pth          ← best model weights
    models/fsl_label_map_10.csv    ← class label mapping (10 classes)
    models/fsl_training_log_10.csv ← epoch-by-epoch training log

Usage:
    cd Hi-Five_Recognition/ml
    python -m training.train_fsl_10
"""

from __future__ import annotations

import csv
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau

sys.path.insert(0, str(Path(__file__).parent.parent))
from training.tcn import SignTCN

# ── 10-class subset ───────────────────────────────────────────────────────────
# Maps original label_id → new remapped id (0-9)
SELECTED_CLASSES = {
    3:  0,   # HELLO
    15: 1,   # YES
    14: 2,   # NO
    24: 3,   # FIVE
    49: 4,   # TODAY
    52: 5,   # FATHER
    53: 6,   # MOTHER
    74: 7,   # RED
    91: 8,   # RICE
    98: 9,   # MILK
}

CLASS_NAMES = {
    0: "HELLO",
    1: "YES",
    2: "NO",
    3: "FIVE",
    4: "TODAY",
    5: "FATHER",
    6: "MOTHER",
    7: "RED",
    8: "RICE",
    9: "MILK",
}
# ─────────────────────────────────────────────────────────────────────────────

# ── Config ────────────────────────────────────────────────────────────────────
FEATURES_DIR   = Path("data/FSL-105/features")
TRAIN_DIR      = FEATURES_DIR / "train"
TEST_DIR       = FEATURES_DIR / "test"
TRAIN_MANIFEST = FEATURES_DIR / "train_manifest.csv"
TEST_MANIFEST  = FEATURES_DIR / "test_manifest.csv"

MODELS_DIR = Path("models")
MODEL_OUT  = MODELS_DIR / "fsl_tcn_10.pth"
LABEL_OUT  = MODELS_DIR / "fsl_label_map_10.csv"
LOG_OUT    = MODELS_DIR / "fsl_training_log_10.csv"

# Feature spec
SEQ_LEN     = 64
FEATURE_DIM = 302
NUM_CLASSES = 10

# Architecture
CHANNELS    = [64, 128, 128, 256]
DILATIONS   = [1, 2, 4, 8]
KERNEL_SIZE = 3
DROPOUT     = 0.2
FC_DROPOUT  = 0.4

# Training
BATCH_SIZE  = 32
MAX_EPOCHS  = 150
LR          = 3e-4
WEIGHT_DECAY = 1e-4
PATIENCE    = 15
LR_PATIENCE = 5
LR_FACTOR   = 0.5
VAL_SPLIT   = 0.1

# Augmentation
NOISE_STD     = 0.01
TIME_MASK_MIN = 3
TIME_MASK_MAX = 8
# ─────────────────────────────────────────────────────────────────────────────


def mirror_sequence(seq: np.ndarray) -> np.ndarray:
    """
    Horizontally flip a 302-dim feature sequence so left-hand signers
    produce the same features as right-hand signers.

    Feature layout (302 dims):
        0-62:    left hand positions  (63)
        63-125:  right hand positions (63)
        126-143: pose positions       (18)
        144-149: left hand wrist rel  (3) + presence (1) + right wrist rel (3) + presence (1) -- wait, rechecked:

    Actual layout from feature_extractor.py:
        0-62:    lhand (63)
        63-125:  rhand (63)
        126-143: pose  (18)
        144-146: lhand_wrist_rel (3)
        147-149: rhand_wrist_rel (3)
        150:     left_hand_present
        151:     right_hand_present
        152-301: velocity (150 = 302/2 - 1... actually mirrors positions above)

    Mirror = swap left↔right hand data + negate X coords.
    """
    seq = seq.copy()

    # Position block: swap lhand (0:63) ↔ rhand (63:126)
    lhand = seq[:, 0:63].copy()
    rhand = seq[:, 63:126].copy()
    seq[:, 0:63]   = rhand
    seq[:, 63:126] = lhand

    # Negate X for all hand landmarks (every 3rd dim starting at 0 and 63)
    seq[:, 0:63:3]   *= -1   # lhand X (now was rhand)
    seq[:, 63:126:3] *= -1   # rhand X (now was lhand)

    # Pose: negate X (dims 126,129,132,135,138,141 — every 3rd)
    seq[:, 126:144:3] *= -1

    # Wrist rel: swap lhand_wrist_rel (144:147) ↔ rhand_wrist_rel (147:150)
    lwr = seq[:, 144:147].copy()
    rwr = seq[:, 147:150].copy()
    seq[:, 144:147] = rwr
    seq[:, 147:150] = lwr
    # Negate X of wrist rels
    seq[:, 144] *= -1
    seq[:, 147] *= -1

    # Presence flags: swap left_hand_present (150) ↔ right_hand_present (151)
    lp = seq[:, 150].copy()
    rp = seq[:, 151].copy()
    seq[:, 150] = rp
    seq[:, 151] = lp

    # Velocity block (152:302) mirrors the position block layout
    seq[:, 152:215:3] *= -1   # lhand vel X
    seq[:, 215:278:3] *= -1   # rhand vel X
    seq[:, 278:296:3] *= -1   # pose vel X

    return seq


class SubsetSignDataset(Dataset):
    """Loads only the 10 selected classes from the manifest, with mirror augmentation."""

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
                orig_id = int(row["label_id"])
                if orig_id not in SELECTED_CLASSES:
                    continue
                npy_path = features_dir / row["npy_file"]
                if npy_path.exists():
                    new_id = SELECTED_CLASSES[orig_id]
                    self.samples.append((npy_path, new_id))

        print(f"  Dataset: {len(self.samples)} sequences from {features_dir.name}/ "
              f"(10-class subset)")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        npy_path, label_id = self.samples[idx]
        seq = np.load(str(npy_path)).astype(np.float32)

        if self.augment:
            seq = self._augment(seq)

        return torch.from_numpy(seq), torch.tensor(label_id, dtype=torch.long)

    def _augment(self, seq: np.ndarray) -> np.ndarray:
        seq = seq.copy()

        # Mirror (50% chance) — makes model hand-agnostic
        if np.random.rand() < 0.5:
            seq = mirror_sequence(seq)

        # Gaussian noise on position + velocity features (not flags)
        noise = np.random.normal(0, NOISE_STD, (seq.shape[0], 288)).astype(np.float32)
        seq[:, :288] += noise

        # Time masking
        mask_len   = np.random.randint(TIME_MASK_MIN, TIME_MASK_MAX + 1)
        mask_start = np.random.randint(0, SEQ_LEN - mask_len)
        seq[mask_start:mask_start + mask_len] = 0.0

        return seq


def train_one_epoch(model, loader, criterion, optimizer, device):
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
        correct    += (logits.argmax(1) == y).sum().item()
        total      += x.size(0)
    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    for x, y in loader:
        x, y   = x.to(device), y.to(device)
        logits = model(x)
        loss   = criterion(logits, y)
        total_loss += loss.item() * x.size(0)
        correct    += (logits.argmax(1) == y).sum().item()
        total      += x.size(0)
    return total_loss / total, correct / total


def main() -> None:
    print("=" * 65)
    print("  FSL TCN Training — 10-class subset")
    print("=" * 65)
    print(f"\n  Classes: {', '.join(CLASS_NAMES.values())}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n  Device      : {device}")
    print(f"  Num classes : {NUM_CLASSES}")
    print(f"  Mirror aug  : YES (50% chance per sample)")

    # ── Datasets ──────────────────────────────────────────────────────────────
    print("\n[info] Loading datasets...")
    full_train = SubsetSignDataset(TRAIN_DIR, TRAIN_MANIFEST, augment=True)
    test_ds    = SubsetSignDataset(TEST_DIR,  TEST_MANIFEST,  augment=False)

    val_size   = int(len(full_train) * VAL_SPLIT)
    train_size = len(full_train) - val_size
    train_subset, val_subset = random_split(
        full_train,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42),
    )

    print(f"  Train       : {train_size} (+ noise/mirror/time-mask augmentation)")
    print(f"  Val         : {val_size} (internal, no augmentation)")
    print(f"  Test        : {len(test_ds)}")

    train_loader = DataLoader(train_subset, batch_size=BATCH_SIZE, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_subset,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader  = DataLoader(test_ds,      batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

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

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = ReduceLROnPlateau(optimizer, mode="min", factor=LR_FACTOR, patience=LR_PATIENCE)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    best_val_loss  = float("inf")
    best_val_acc   = 0.0
    patience_count = 0
    best_epoch     = 0
    log_rows       = []

    # ── Training loop ─────────────────────────────────────────────────────────
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

        log_rows.append({
            "epoch": epoch, "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc * 100, 2), "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc * 100, 2), "lr": current_lr, "time_s": round(elapsed, 1),
        })

        if val_loss < best_val_loss:
            best_val_loss  = val_loss
            best_val_acc   = val_acc
            best_epoch     = epoch
            patience_count = 0
            torch.save({
                "epoch":       epoch,
                "model_state": model.state_dict(),
                "val_loss":    val_loss,
                "val_acc":     val_acc,
                "num_classes": NUM_CLASSES,
                "feature_dim": FEATURE_DIM,
                "seq_len":     SEQ_LEN,
                "channels":    CHANNELS,
                "dilations":   DILATIONS,
                "kernel_size": KERNEL_SIZE,
                "dropout":     DROPOUT,
                "fc_dropout":  FC_DROPOUT,
            }, MODEL_OUT)
        else:
            patience_count += 1
            if patience_count >= PATIENCE:
                print(f"\n[early stop] No improvement for {PATIENCE} epochs. Stopping at epoch {epoch}.")
                break

    # ── Final test evaluation ─────────────────────────────────────────────────
    print(f"\n[info] Evaluating on test set...")
    checkpoint = torch.load(MODEL_OUT, map_location=device)
    model.load_state_dict(checkpoint["model_state"])
    test_loss, test_acc = evaluate(model, test_loader, criterion, device)
    print(f"  Test loss : {test_loss:.4f}")
    print(f"  Test acc  : {test_acc*100:.2f}%")

    # ── Save label map ────────────────────────────────────────────────────────
    with open(LABEL_OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["label_id", "gloss"])
        writer.writeheader()
        for new_id, name in CLASS_NAMES.items():
            writer.writerow({"label_id": new_id, "gloss": name})
    print(f"\n  Label map saved : {LABEL_OUT}")

    with open(LOG_OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=log_rows[0].keys())
        writer.writeheader()
        writer.writerows(log_rows)
    print(f"  Training log    : {LOG_OUT}")

    print(f"\n{'='*65}")
    print(f"[done] FSL 10-class training complete")
    print(f"  Best epoch  : {best_epoch}")
    print(f"  Best val acc: {best_val_acc*100:.2f}%")
    print(f"  Test acc    : {test_acc*100:.2f}%")
    print(f"  Model saved : {MODEL_OUT}")
    print(f"\n[next] To use: set language='fsl' and point to fsl_tcn_10.pth + fsl_label_map_10.csv")


if __name__ == "__main__":
    main()
