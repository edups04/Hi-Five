"""
preprocess_asl.py
------------------
Preprocesses selected ASL Citizen videos into (64, 290) landmark feature sequences.

Uses:
    selected_train.csv
    selected_val.csv
    selected_test.csv

Pipeline:
    ASL Citizen videos
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
    data/ASL-Citizen/features/
        train/
            <label_id>_<participant>_<video_stem>.npy
        val/
            <label_id>_<participant>_<video_stem>.npy
        test/
            <label_id>_<participant>_<video_stem>.npy

Manifest files:
    data/ASL-Citizen/features/train_manifest.csv
    data/ASL-Citizen/features/val_manifest.csv
    data/ASL-Citizen/features/test_manifest.csv

Label map:
    data/ASL-Citizen/features/label_map.csv

Usage:
    cd Hi-Five_Recognition/ml
    python -m preprocessing.preprocess_asl
"""

from __future__ import annotations

import csv
import sys
import traceback
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from preprocessing.mediapipe_extractor import FrameExtractor
from preprocessing.normalization import normalize_frame
from preprocessing.feature_extractor import process_video_frames, SEQUENCE_LEN, FEATURE_DIM

# ── Config ────────────────────────────────────────────────────────────────────
ASL_DIR      = Path("data/ASL-Citizen")
VIDEOS_DIR   = ASL_DIR / "videos"
SPLITS_DIR   = ASL_DIR / "splits"
TRAIN_CSV    = SPLITS_DIR / "selected_train.csv"
VAL_CSV      = SPLITS_DIR / "selected_val.csv"
TEST_CSV     = SPLITS_DIR / "selected_test.csv"
FEATURES_DIR = ASL_DIR / "features"

HAND_MODEL = "models/hand_landmarker.task"
POSE_MODEL = "models/pose_landmarker.task"

FRAME_STEP     = 1      # process every frame
EXPECTED_CLASSES = 105  # hard check
# ─────────────────────────────────────────────────────────────────────────────


def load_split(csv_path: Path) -> list[dict]:
    with open(csv_path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def build_label_map(rows_list: list[list[dict]]) -> dict[str, int]:
    """Build a stable gloss → integer label mapping sorted alphabetically."""
    glosses = sorted({
        row["Gloss"].strip()
        for rows in rows_list
        for row in rows
    })
    return {g: i for i, g in enumerate(glosses)}


def save_label_map(label_map: dict[str, int], out_path: Path) -> None:
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["label_id", "gloss"])
        writer.writeheader()
        for gloss, lid in sorted(label_map.items(), key=lambda x: x[1]):
            writer.writerow({"label_id": lid, "gloss": gloss})
    print(f"[label_map] Saved → {out_path}  ({len(label_map)} classes)")


def extract_frames_from_video(
    video_path: Path,
    extractor: FrameExtractor,
    step: int = 1,
) -> list[dict]:
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


def make_output_name(label_id: int, participant: str, video_file: str) -> str:
    """
    Generate a unique output filename including participant ID
    to avoid collisions when multiple participants sign the same word.

    Example: 017_P23_15890366051589533-APPLE.npy
    """
    stem = Path(video_file).stem
    return f"{label_id:03d}_{participant}_{stem}.npy"


def process_split(
    rows: list[dict],
    split_name: str,
    out_dir: Path,
    extractor: FrameExtractor,
    label_map: dict[str, int],
    failed_log: list[dict],
) -> list[dict]:
    """
    Process all videos in a split and save .npy files.

    Features:
    - Skips already-processed videos (resume support)
    - Catches per-video errors without crashing the whole job
    - Includes participant ID in filename to avoid collisions
    - Returns manifest rows
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest  = []
    total     = len(rows)
    skipped   = 0
    already   = 0
    failed    = 0

    print(f"\n[{split_name}] Processing {total} videos...")

    for i, row in enumerate(rows, 1):
        video_file  = row["Video file"].strip()
        gloss       = row["Gloss"].strip()
        participant = row["Participant ID"].strip()
        asl_lex     = row.get("ASL-LEX Code", "").strip()
        label_id    = label_map.get(gloss, -1)

        if label_id == -1:
            print(f"  [skip] Unknown gloss: {gloss}")
            skipped += 1
            continue

        video_path = VIDEOS_DIR / video_file
        if not video_path.exists():
            print(f"  [skip] Not found: {video_file}")
            skipped += 1
            continue

        out_name = make_output_name(label_id, participant, video_file)
        out_path = out_dir / out_name

        # Resume support — skip already processed
        if out_path.exists():
            already += 1
            manifest.append({
                "npy_file":     out_name,
                "label_id":     label_id,
                "gloss":        gloss,
                "participant":  participant,
                "asl_lex_code": asl_lex,
                "video_file":   video_file,
                "split":        split_name,
                "n_frames":     -1,  # unknown, already processed
            })
            continue

        try:
            raw_frames = extract_frames_from_video(video_path, extractor, FRAME_STEP)
            if not raw_frames:
                print(f"  [skip] No frames: {video_file}")
                skipped += 1
                continue

            norm_frames = [normalize_frame(f) for f in raw_frames]
            sequence    = process_video_frames(norm_frames)  # (64, 290)

            # Verify shape before saving
            assert sequence.shape == (SEQUENCE_LEN, FEATURE_DIM), (
                f"Unexpected shape {sequence.shape} for {video_file}"
            )

            np.save(str(out_path), sequence)

            manifest.append({
                "npy_file":     out_name,
                "label_id":     label_id,
                "gloss":        gloss,
                "participant":  participant,
                "asl_lex_code": asl_lex,
                "video_file":   video_file,
                "split":        split_name,
                "n_frames":     len(raw_frames),
            })

        except Exception as e:
            failed += 1
            err_msg = traceback.format_exc()
            print(f"  [error] {video_file}: {e}")
            failed_log.append({
                "split":      split_name,
                "video_file": video_file,
                "gloss":      gloss,
                "error":      str(e),
            })
            continue

        if i % 200 == 0 or i == total:
            print(
                f"  [{i}/{total}] "
                f"saved={len(manifest) - already} "
                f"resumed={already} "
                f"skipped={skipped} "
                f"failed={failed}"
            )

    print(
        f"  Done — "
        f"saved: {len(manifest) - already} | "
        f"resumed: {already} | "
        f"skipped: {skipped} | "
        f"failed: {failed}"
    )
    return manifest


def save_manifest(manifest: list[dict], out_path: Path) -> None:
    if not manifest:
        return
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=manifest[0].keys())
        writer.writeheader()
        writer.writerows(manifest)
    print(f"[manifest] Saved → {out_path}  ({len(manifest)} rows)")


def save_failed_log(failed_log: list[dict], out_path: Path) -> None:
    if not failed_log:
        return
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["split", "video_file", "gloss", "error"])
        writer.writeheader()
        writer.writerows(failed_log)
    print(f"[failed_log] Saved → {out_path}  ({len(failed_log)} failures)")


def verify_video_paths(rows: list[dict], sample_size: int = 5) -> None:
    """
    Spot-check a few video paths before running the full job.
    Prints found/missing status for first sample_size rows.
    """
    print(f"\n[verify] Checking first {sample_size} video paths...")
    for row in rows[:sample_size]:
        video_file = row["Video file"].strip()
        path       = VIDEOS_DIR / video_file
        status     = "✓ found" if path.exists() else "✗ MISSING"
        print(f"  {status}: {path}")


def main() -> None:
    print("=" * 65)
    print("  ASL Citizen Preprocessing (Selected 105 Classes)")
    print("=" * 65)
    print(f"  Feature shape    : ({SEQUENCE_LEN}, {FEATURE_DIM})")
    print(f"  Expected classes : {EXPECTED_CLASSES}")
    print(f"  Hand model       : {HAND_MODEL}")
    print(f"  Pose model       : {POSE_MODEL}")
    print(f"  Videos dir       : {VIDEOS_DIR}")

    # ── Load CSVs ─────────────────────────────────────────────────────────────
    print("\n[info] Loading selected CSVs...")
    train_rows = load_split(TRAIN_CSV)
    val_rows   = load_split(VAL_CSV)
    test_rows  = load_split(TEST_CSV)
    print(f"  Train: {len(train_rows)} | Val: {len(val_rows)} | Test: {len(test_rows)}")

    # ── Spot-check video paths ────────────────────────────────────────────────
    verify_video_paths(train_rows, sample_size=5)

    # ── Build label map ───────────────────────────────────────────────────────
    print("\n[info] Building label map...")
    label_map = build_label_map([train_rows, val_rows, test_rows])
    print(f"  Unique classes found: {len(label_map)}")

    # Hard check — must be exactly 105
    if len(label_map) != EXPECTED_CLASSES:
        raise ValueError(
            f"Expected {EXPECTED_CLASSES} ASL classes, found {len(label_map)}. "
            f"Check selected_train/val/test.csv files."
        )
    print(f"  ✓ Exactly {EXPECTED_CLASSES} classes confirmed")

    FEATURES_DIR.mkdir(parents=True, exist_ok=True)
    save_label_map(label_map, FEATURES_DIR / "label_map.csv")

    # ── Process splits ────────────────────────────────────────────────────────
    failed_log: list[dict] = []

    print("\n[info] Initializing MediaPipe extractors...")
    with FrameExtractor(HAND_MODEL, POSE_MODEL) as extractor:
        train_manifest = process_split(
            train_rows, "train",
            FEATURES_DIR / "train",
            extractor, label_map, failed_log,
        )
        val_manifest = process_split(
            val_rows, "val",
            FEATURES_DIR / "val",
            extractor, label_map, failed_log,
        )
        test_manifest = process_split(
            test_rows, "test",
            FEATURES_DIR / "test",
            extractor, label_map, failed_log,
        )

    # ── Save manifests ────────────────────────────────────────────────────────
    save_manifest(train_manifest, FEATURES_DIR / "train_manifest.csv")
    save_manifest(val_manifest,   FEATURES_DIR / "val_manifest.csv")
    save_manifest(test_manifest,  FEATURES_DIR / "test_manifest.csv")
    save_failed_log(failed_log,   FEATURES_DIR / "failed_log.csv")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*65}")
    print(f"[done] ASL preprocessing complete")
    print(f"  Train sequences : {len(train_manifest)}")
    print(f"  Val sequences   : {len(val_manifest)}")
    print(f"  Test sequences  : {len(test_manifest)}")
    print(f"  Failed videos   : {len(failed_log)}")
    print(f"  Output dir      : {FEATURES_DIR}")
    print(f"\n[next] python -m training.train_asl")


if __name__ == "__main__":
    main()
