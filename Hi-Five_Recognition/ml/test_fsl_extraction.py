"""
FSL Video Frame Extractor
--------------------------
Extracts frames from FSL dataset videos where a hand is detected
and saves them as JPGs into data/word_signs/<label>/ folders.

Usage:
    cd Hi-Five_Recognition/ml
    python test_fsl_extraction.py
"""

import cv2
import csv
import os
import sys
from pathlib import Path
import numpy as np

# ── Config ────────────────────────────────────────────────────────────────────
FSL_DIR      = Path("data/fsl_videos")
CLIPS_DIR    = FSL_DIR / "clips"
LABELS_CSV   = FSL_DIR / "labels.csv"
OUTPUT_DIR   = Path("data/word_signs")

# Signs to extract (folder IDs from labels.csv)
TEST_IDS     = [7, 15, 52]  # THANK YOU, YES, FATHER

FRAME_INTERVAL = 3     # extract every Nth frame
MAX_FRAMES     = 60    # max frames per video to check
JPEG_QUALITY   = 95    # output image quality
# ─────────────────────────────────────────────────────────────────────────────


def load_labels():
    labels = {}
    with open(LABELS_CSV, encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            labels[int(row['id'])] = row['label']
    return labels


def label_to_folder(label: str) -> str:
    return label.lower().replace(' ', '_')


def load_videos_for_ids(ids: list) -> dict:
    videos = {}
    for sign_id in ids:
        clip_folder = CLIPS_DIR / str(sign_id)
        if not clip_folder.exists():
            print(f"[warn] Folder not found: {clip_folder}")
            continue
        video_files = sorted([
            f for f in clip_folder.iterdir()
            if f.suffix.lower() in {'.mov', '.mp4', '.avi', '.mkv'}
        ])
        videos[sign_id] = video_files
    return videos


def main():
    print("=" * 60)
    print("  FSL Frame Extractor")
    print("=" * 60)

    if not FSL_DIR.exists():
        print(f"[error] FSL data directory not found: {FSL_DIR}")
        sys.exit(1)

    print("[info] Loading labels...")
    labels = load_labels()

    print("[info] Loading MediaPipe extractor...")
    sys.path.insert(0, str(Path(__file__).parent))
    from src.landmarks import HandLandmarkExtractor
    extractor = HandLandmarkExtractor(
        model_path="models/hand_landmarker.task",
        num_hands=1,
        min_detection_confidence=0.4,
        min_presence_confidence=0.4,
        min_tracking_confidence=0.4,
    )

    videos_by_id = load_videos_for_ids(TEST_IDS)
    print(f"[info] Signs to process: {[labels.get(i, str(i)) for i in TEST_IDS]}\n")

    grand_total    = 0
    grand_saved    = 0
    grand_skipped  = 0

    for sign_id, video_files in videos_by_id.items():
        label      = labels.get(sign_id, str(sign_id))
        folder_name = label_to_folder(label)
        out_dir    = OUTPUT_DIR / folder_name
        out_dir.mkdir(parents=True, exist_ok=True)

        # Count existing images to avoid overwriting
        existing = len(list(out_dir.glob("*.jpg")))

        print(f"\n{'─'*50}")
        print(f"Sign: {label} → {out_dir}")
        print(f"Videos: {len(video_files)} | Existing images: {existing}")
        print(f"{'─'*50}")

        sign_total  = 0
        sign_saved  = 0
        sign_skipped = 0
        img_counter = existing

        for vid_path in video_files:
            cap = cv2.VideoCapture(str(vid_path))
            if not cap.isOpened():
                print(f"  [warn] Could not open: {vid_path.name}")
                continue

            frame_idx   = 0
            frames_checked = 0

            while frames_checked < MAX_FRAMES:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % FRAME_INTERVAL == 0:
                    frames_checked += 1
                    sign_total     += 1
                    grand_total    += 1

                    rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    result = extractor.extract(np.asarray(rgb, dtype=np.uint8))

                    if result and result.found:
                        out_path = out_dir / f"fsl_{img_counter:04d}.jpg"
                        cv2.imwrite(
                            str(out_path),
                            frame,
                            [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
                        )
                        img_counter  += 1
                        sign_saved   += 1
                        grand_saved  += 1
                    else:
                        sign_skipped  += 1
                        grand_skipped += 1

                frame_idx += 1

            cap.release()

        detection_rate = (sign_saved / sign_total * 100) if sign_total > 0 else 0
        print(f"  Frames checked : {sign_total}")
        print(f"  Saved          : {sign_saved} ({detection_rate:.1f}% detection)")
        print(f"  Skipped        : {sign_skipped}")
        print(f"  Total in folder: {img_counter}")

    print(f"\n{'='*60}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"  Total frames checked : {grand_total}")
    print(f"  Total frames saved   : {grand_saved}")
    print(f"  Total frames skipped : {grand_skipped}")
    overall_rate = (grand_saved / grand_total * 100) if grand_total > 0 else 0
    print(f"  Overall detection    : {overall_rate:.1f}%")
    print(f"\n[done] Frames saved to: {OUTPUT_DIR}")
    print(f"[next] Run: python -m src.train_word_signs")


if __name__ == "__main__":
    main()
