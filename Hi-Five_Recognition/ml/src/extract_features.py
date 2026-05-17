from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from tqdm import tqdm

from .landmarks import FEATURE_DIM, HandLandmarkExtractor

EXPECTED_CLASSES = (
    [chr(c) for c in range(ord("A"), ord("Z") + 1)]
    + ["space", "del"]
)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp"}


def find_classes(data_dir: Path) -> list[str]:
    """Return the subset of EXPECTED_CLASSES that actually exist on disk."""
    found = []
    missing = []
    for cls in EXPECTED_CLASSES:
        if (data_dir / cls).is_dir():
            found.append(cls)
        else:
            missing.append(cls)
    if missing:
        print(f"[warn] Expected class folders not found, will be skipped: {missing}")
    if not found:
        raise FileNotFoundError(
            f"No expected class folders found in {data_dir}. "
            f"Expected subfolders like A/, B/, ..., space/, del/."
        )
    return found


def load_already_processed(output_path: Path) -> set[str]:
    """For --resume: return the set of image paths already in the CSV."""
    if not output_path.exists():
        return set()
    done = set()
    with output_path.open("r", newline="") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return set()
        try:
            src_idx = header.index("source_image")
        except ValueError:
            print(
                "[warn] Existing CSV has no `source_image` column; "
                "cannot resume. Will overwrite.",
                file=sys.stderr,
            )
            return set()
        for row in reader:
            if len(row) > src_idx:
                done.add(row[src_idx])
    return done


def extract_dataset(
    data_dir: Path,
    output_path: Path,
    resume: bool = False,
    limit_per_class: int | None = None,
) -> None:
    classes = find_classes(data_dir)

    already_done = load_already_processed(output_path) if resume else set()
    open_mode = "a" if (resume and already_done) else "w"

    if open_mode == "w":
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", newline="") as f:
            writer = csv.writer(f)
            feature_cols = [f"f{i}" for i in range(FEATURE_DIM)]
            writer.writerow(feature_cols + ["label", "source_image"])

    detected_per_class: dict[str, int] = defaultdict(int)
    total_per_class: dict[str, int] = defaultdict(int)
    failed_per_class: dict[str, int] = defaultdict(int)

    t_start = time.time()

    with HandLandmarkExtractor() as extractor, output_path.open("a", newline="") as f:
        writer = csv.writer(f)

        for cls in classes:
            cls_dir = data_dir / cls
            images = sorted(
                p for p in cls_dir.iterdir()
                if p.suffix.lower() in IMAGE_EXTS and p.is_file()
            )
            if limit_per_class is not None:
                images = images[:limit_per_class]

            for img_path in tqdm(images, desc=f"{cls:>5}", unit="img"):
                rel_key = f"{cls}/{img_path.name}"
                if rel_key in already_done:
                    continue

                total_per_class[cls] += 1

                bgr = cv2.imread(str(img_path))
                if bgr is None:
                    failed_per_class[cls] += 1
                    continue
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

                try:
                    result = extractor.extract(rgb)
                except Exception as e:  
                    failed_per_class[cls] += 1
                    print(f"[warn] MediaPipe error on {img_path}: {e}", file=sys.stderr)
                    continue

                if not result.found:
                    continue

                detected_per_class[cls] += 1
                writer.writerow(
                    list(result.normalized.tolist()) + [cls, rel_key]
                )

            f.flush()

    elapsed = time.time() - t_start
    print(f"\n[done] Extracted in {elapsed:.1f}s")
    print(f"{'class':>6}  {'total':>7}  {'detected':>9}  {'rate':>6}")
    grand_total = 0
    grand_detected = 0
    for cls in classes:
        tot = total_per_class[cls]
        det = detected_per_class[cls]
        rate = (det / tot * 100.0) if tot else 0.0
        flag = "  <-- low" if tot and rate < 60.0 else ""
        print(f"{cls:>6}  {tot:>7}  {det:>9}  {rate:>5.1f}%{flag}")
        grand_total += tot
        grand_detected += det
    overall = (grand_detected / grand_total * 100.0) if grand_total else 0.0
    print(f"{'TOTAL':>6}  {grand_total:>7}  {grand_detected:>9}  {overall:>5.1f}%")
    print(f"\nCSV written to: {output_path}")


def main() -> None:
    p = argparse.ArgumentParser(description="Extract MediaPipe landmarks from ASL dataset.")
    p.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data/asl_alphabet_train"),
        help="Path to the dataset root (containing A/, B/, ... subfolders).",
    )
    p.add_argument(
        "--output",
        type=Path,
        default=Path("data/landmarks.csv"),
        help="Path to write the CSV.",
    )
    p.add_argument(
        "--resume",
        action="store_true",
        help="Skip images already present in the output CSV.",
    )
    p.add_argument(
        "--limit-per-class",
        type=int,
        default=None,
        help="For quick smoke tests: process at most N images per class.",
    )
    args = p.parse_args()

    extract_dataset(
        data_dir=args.data_dir,
        output_path=args.output,
        resume=args.resume,
        limit_per_class=args.limit_per_class,
    )


if __name__ == "__main__":
    main()
