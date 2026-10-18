"""
preprocess_fsl.py
------------------
Preprocesses FSL-105 dataset videos into (64, 290) landmark feature sequences.

Pipeline:
    FSL-105 videos
        ↓
    MediaPipe Hand + Pose
        ↓
    Normalize landmarks
        ↓
    Compute velocity features
        ↓
    Add presence flags
        ↓
    Resample/pad to 64 frames
        ↓
    Save as .npy

Output structure:
    data/FSL-105/features/
        train/
            <label_id>_<video_stem>.npy
        test/
            <label_id>_<video_stem>.npy

Manifest files:
    data/FSL-105/features/train_manifest.csv
    data/FSL-105/features/test_manifest.csv

Usage:
    cd Hi-Five_Recognition/ml
    python -m preprocessing.preprocess_fsl
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from preprocessing.mediapipe_extractor import FrameExtractor
from preprocessing.normalization import normalize_frame
from preprocessing.feature_extractor import process_video_frames

# ── Config ────────────────────────────────────────────────────────────────────
FSL_DIR      = Path("data/FSL-105")
CLIPS_DIR    = FSL_DIR / "clips"
TRAIN_CSV    = FSL_DIR / "train.csv"
TEST_CSV     = FSL_DIR / "test.csv"
LABELS_CSV   = FSL_DIR / "labels.csv"
FEATURES_DIR = FSL_DIR / "features"

HAND_MODEL = "models/hand_landmarker.task"
POSE_MODEL = "models/pose_landmarker.task"

FRAME_STEP = 1   # process every frame (videos are short ~4s at 30fps)
# ─────────────────────────────────────────────────────────────────────────────


def load_labels() -> dict[int, str]:
    """Load id → label mapping from labels.csv."""
    labels = {}
    with open(LABELS_CSV, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            labels[int(row["id"])] = row["label"]
    return labels


def load_split(csv_path: Path) -> list[dict]:
    with open(csv_path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def extract_frames_from_video(
    video_path: Path,
    extractor: FrameExtractor,
    step: int = 1,
) -> list[dict]:
    """
    Extract raw landmark dicts from every `step`-th frame of a video.
    Returns list of raw (unnormalized) frame dicts.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    frames = []
    idx    = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % step == 0:
            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = extractor.extract(rgb)
            frames.append(result)
        idx += 1

    cap.release()
    return frames


def process_split(
    rows: list[dict],
    split_name: str,
    out_dir: Path,
    extractor: FrameExtractor,
    labels: dict[int, str],
) -> list[dict]:
    """
    Process all videos in a split and save .npy files.
    Returns manifest rows.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    total    = len(rows)
    skipped  = 0

    print(f"\n[{split_name}] Processing {total} videos...")

    for i, row in enumerate(rows, 1):
        vid_path_rel = row["vid_path"].replace("\\", "/")
        label_id     = int(row["id_label"])
        label_name   = row["label"]

        video_path = CLIPS_DIR / Path(vid_path_rel).name
        if not video_path.exists():
            video_path = CLIPS_DIR / str(label_id) / Path(vid_path_rel).name
        if not video_path.exists():
            video_path = FSL_DIR / vid_path_rel
        if not video_path.exists():
            print(f"  [skip] Not found: {vid_path_rel}")
            skipped += 1
            continue

        raw_frames = extract_frames_from_video(video_path, extractor, FRAME_STEP)
        if not raw_frames:
            print(f"  [skip] No frames: {video_path.name}")
            skipped += 1
            continue

        norm_frames = [normalize_frame(f) for f in raw_frames]
        sequence    = process_video_frames(norm_frames)  # (64, 290)

        stem     = Path(vid_path_rel).stem
        out_name = f"{label_id:03d}_{stem}.npy"
        out_path = out_dir / out_name
        np.save(str(out_path), sequence)

        manifest.append({
            "npy_file":   out_name,
            "label_id":   label_id,
            "label_name": label_name,
            "video_file": Path(vid_path_rel).name,
            "split":      split_name,
            "n_frames":   len(raw_frames),
        })

        if i % 50 == 0 or i == total:
            print(f"  [{i}/{total}] saved={i - skipped} skipped={skipped}")

    print(f"  Done — saved: {len(manifest)} | skipped: {skipped}")
    return manifest


def save_manifest(manifest: list[dict], out_path: Path) -> None:
    if not manifest:
        return
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=manifest[0].keys())
        writer.writeheader()
        writer.writerows(manifest)
    print(f"[manifest] Saved → {out_path}  ({len(manifest)} rows)")


def main() -> None:
    print("=" * 60)
    print("  FSL-105 Preprocessing")
    print("=" * 60)
    print(f"  Feature shape : (64, 290)")
    print(f"  Hand model    : {HAND_MODEL}")
    print(f"  Pose model    : {POSE_MODEL}")

    print("\n[info] Loading labels...")
    labels = load_labels()
    print(f"  {len(labels)} FSL classes")

    print("[info] Loading CSVs...")
    train_rows = load_split(TRAIN_CSV)
    test_rows  = load_split(TEST_CSV)
    print(f"  Train: {len(train_rows)} | Test: {len(test_rows)}")

    print("\n[info] Initializing MediaPipe extractors...")
    with FrameExtractor(HAND_MODEL, POSE_MODEL) as extractor:
        train_manifest = process_split(
            train_rows, "train",
            FEATURES_DIR / "train",
            extractor, labels,
        )
        test_manifest = process_split(
            test_rows, "test",
            FEATURES_DIR / "test",
            extractor, labels,
        )

    save_manifest(train_manifest, FEATURES_DIR / "train_manifest.csv")
    save_manifest(test_manifest,  FEATURES_DIR / "test_manifest.csv")

    print(f"\n{'='*60}")
    print(f"[done] FSL preprocessing complete")
    print(f"  Train sequences : {len(train_manifest)}")
    print(f"  Test sequences  : {len(test_manifest)}")
    print(f"  Output dir      : {FEATURES_DIR}")
    print(f"\n[next] Run: python -m preprocessing.preprocess_asl")


if __name__ == "__main__":
    main()
