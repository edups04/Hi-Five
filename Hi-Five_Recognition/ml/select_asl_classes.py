"""
ASL Citizen Class Selector — Improved
--------------------------------------
Selects the best 105 classes from ASL Citizen dataset for TCN training.

Workflow:
    ASL Citizen CSVs
        ↓
    quality filtering
        ↓
    class scoring
        ↓
    select best 105 classes
        ↓
    save selected_105_classes.csv
    save selected_train.csv
    save selected_val.csv
    save selected_test.csv

Usage:
    cd Hi-Five_Recognition/ml
    python select_asl_classes.py
"""

import csv
import math
from collections import defaultdict
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
DATA_DIR   = Path("data/ASL-Citizen/splits")
TRAIN_CSV  = DATA_DIR / "train.csv"
VAL_CSV    = DATA_DIR / "val.csv"
TEST_CSV   = DATA_DIR / "test.csv"

OUT_CLASSES   = DATA_DIR / "selected_105_classes.csv"
OUT_TRAIN     = DATA_DIR / "selected_train.csv"
OUT_VAL       = DATA_DIR / "selected_val.csv"
OUT_TEST      = DATA_DIR / "selected_test.csv"

TARGET_COUNT  = 105

# ── Hard filter minimums ──────────────────────────────────────────────────────
# These are deliberately moderate — tightened only if enough classes survive.
MIN_TRAIN_VIDEOS = 8    # enough to learn from
MIN_VAL_VIDEOS   = 2    # must appear in val
MIN_TEST_VIDEOS  = 3    # must appear in test
MIN_TRAIN_PARTS  = 4    # signer diversity in train
MIN_VAL_PARTS    = 1    # at least one val signer
MIN_TEST_PARTS   = 1    # at least one test signer

# ── Scoring weights (sum to 1.0) ──────────────────────────────────────────────
# Coverage weight removed — already enforced by hard filters.
# Weight redistributed to participant diversity and video availability.
W_PARTICIPANT = 0.45   # highest — signer diversity is most important
W_VIDEO       = 0.30   # video availability
W_BALANCE     = 0.25   # distribution close to overall dataset ratios

# Participant totals per split (signer-independent structure)
TRAIN_TOTAL_PARTS = 35
VAL_TOTAL_PARTS   = 6
TEST_TOTAL_PARTS  = 11
# ─────────────────────────────────────────────────────────────────────────────


def load_csv(path: Path) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def compute_overall_ratios(
    n_train: int, n_val: int, n_test: int
) -> tuple[float, float, float]:
    total = n_train + n_val + n_test
    return n_train / total, n_val / total, n_test / total


def compute_balance_score(
    train: int, val: int, test: int,
    ideal_train: float, ideal_val: float, ideal_test: float,
) -> float:
    """
    Score how close a class's split distribution is to the overall dataset ratios.
    Returns 1.0 for a perfect match, lower for deviation.
    """
    total = train + val + test
    if total == 0:
        return 0.0
    r_train = train / total
    r_val   = val   / total
    r_test  = test  / total

    # Mean absolute deviation from ideal ratios
    mad = (abs(r_train - ideal_train) +
           abs(r_val   - ideal_val)   +
           abs(r_test  - ideal_test)) / 3.0

    # Convert to 0-1 score (MAD of 0 = perfect, MAD of 0.33 = worst case)
    return max(0.0, 1.0 - mad * 3.0)


def compute_participant_score(
    train_parts: int, val_parts: int, test_parts: int
) -> float:
    """
    Reward classes that have good signer diversity in each split,
    weighted by the number of available participants per split.
    """
    train_score = train_parts / TRAIN_TOTAL_PARTS
    val_score   = val_parts   / VAL_TOTAL_PARTS
    test_score  = test_parts  / TEST_TOTAL_PARTS

    # Weighted average — train has most participants so it carries more weight
    return (0.60 * train_score + 0.20 * val_score + 0.20 * test_score)


def main():
    print("=" * 65)
    print("  ASL Citizen Class Selector")
    print("=" * 65)

    # ── Load CSVs ─────────────────────────────────────────────────────────────
    print("\n[info] Loading CSVs...")
    train_rows = load_csv(TRAIN_CSV)
    val_rows   = load_csv(VAL_CSV)
    test_rows  = load_csv(TEST_CSV)

    n_train = len(train_rows)
    n_val   = len(val_rows)
    n_test  = len(test_rows)
    n_total = n_train + n_val + n_test

    ideal_train, ideal_val, ideal_test = compute_overall_ratios(n_train, n_val, n_test)

    print(f"  Train : {n_train:>6} rows ({ideal_train*100:.1f}%)")
    print(f"  Val   : {n_val:>6} rows ({ideal_val*100:.1f}%)")
    print(f"  Test  : {n_test:>6} rows ({ideal_test*100:.1f}%)")
    print(f"  Total : {n_total:>6} rows")
    print(f"\n  Overall ratios → Train: {ideal_train:.3f} | Val: {ideal_val:.3f} | Test: {ideal_test:.3f}")

    # ── Build per-class stats ─────────────────────────────────────────────────
    stats: dict[str, dict] = defaultdict(lambda: {
        "train_videos":  0,
        "val_videos":    0,
        "test_videos":   0,
        "train_parts":   set(),
        "val_parts":     set(),
        "test_parts":    set(),
    })

    for row in train_rows:
        g = row["Gloss"].strip()
        if not g:
            continue
        stats[g]["train_videos"] += 1
        stats[g]["train_parts"].add(row["Participant ID"].strip())

    for row in val_rows:
        g = row["Gloss"].strip()
        if not g:
            continue
        stats[g]["val_videos"] += 1
        stats[g]["val_parts"].add(row["Participant ID"].strip())

    for row in test_rows:
        g = row["Gloss"].strip()
        if not g:
            continue
        stats[g]["test_videos"] += 1
        stats[g]["test_parts"].add(row["Participant ID"].strip())

    all_classes = len(stats)
    print(f"\n[info] Total unique classes: {all_classes}")

    # ── Hard filters ──────────────────────────────────────────────────────────
    print("\n[info] Applying hard filters...")

    pool = dict(stats)

    # Filter: minimum train videos
    pool = {g: s for g, s in pool.items() if s["train_videos"] >= MIN_TRAIN_VIDEOS}
    print(f"  After train video filter  (>= {MIN_TRAIN_VIDEOS}): {len(pool)}")

    # Filter: minimum val videos
    pool = {g: s for g, s in pool.items() if s["val_videos"] >= MIN_VAL_VIDEOS}
    print(f"  After val video filter    (>= {MIN_VAL_VIDEOS}):   {len(pool)}")

    # Filter: minimum test videos
    pool = {g: s for g, s in pool.items() if s["test_videos"] >= MIN_TEST_VIDEOS}
    print(f"  After test video filter   (>= {MIN_TEST_VIDEOS}):   {len(pool)}")

    # Filter: minimum train participants
    pool = {g: s for g, s in pool.items() if len(s["train_parts"]) >= MIN_TRAIN_PARTS}
    print(f"  After train parts filter  (>= {MIN_TRAIN_PARTS}):   {len(pool)}")

    # Filter: minimum val participants
    pool = {g: s for g, s in pool.items() if len(s["val_parts"]) >= MIN_VAL_PARTS}
    print(f"  After val parts filter    (>= {MIN_VAL_PARTS}):   {len(pool)}")

    # Filter: minimum test participants
    pool = {g: s for g, s in pool.items() if len(s["test_parts"]) >= MIN_TEST_PARTS}
    print(f"  After test parts filter   (>= {MIN_TEST_PARTS}):   {len(pool)}")

    # Filter: empty gloss
    pool = {g: s for g, s in pool.items() if g.strip()}
    print(f"  After empty gloss filter        : {len(pool)}")

    print(f"\n  Final candidates: {len(pool)}")

    if len(pool) < TARGET_COUNT:
        print(f"\n[warn] Only {len(pool)} candidates — less than {TARGET_COUNT} target. "
            f"Consider relaxing filters.")

    # ── Scoring ───────────────────────────────────────────────────────────────
    max_videos = max(
        s["train_videos"] + s["val_videos"] + s["test_videos"]
        for s in pool.values()
    ) if pool else 1

    scored = []
    for gloss, s in pool.items():
        tv = s["train_videos"]
        vv = s["val_videos"]
        te = s["test_videos"]
        total = tv + vv + te

        tp = len(s["train_parts"])
        vp = len(s["val_parts"])
        ep = len(s["test_parts"])

        participant_score = compute_participant_score(tp, vp, ep)
        video_score       = total / max_videos
        balance_score     = compute_balance_score(tv, vv, te, ideal_train, ideal_val, ideal_test)

        total_score = (
            W_PARTICIPANT * participant_score +
            W_VIDEO       * video_score       +
            W_BALANCE     * balance_score
        )

        scored.append({
            "gloss":             gloss,
            "total_score":       round(total_score,       4),
            "participant_score": round(participant_score, 4),
            "video_score":       round(video_score,       4),
            "balance_score":     round(balance_score,     4),
            "total_videos":      total,
            "train_parts":       tp,
            "val_parts":         vp,
            "test_parts":        ep,
            "total_parts":       tp + vp + ep,
            "train_videos":      tv,
            "val_videos":        vv,
            "test_videos":       te,
        })

    scored.sort(key=lambda x: x["total_score"], reverse=True)
    selected = scored[:TARGET_COUNT]

    # ── Print top results ─────────────────────────────────────────────────────
    print(f"\n[result] Top {TARGET_COUNT} selected classes:\n")
    print(f"{'#':<4} {'Gloss':<22} {'Score':<7} {'Videos':<8} "
          f"{'T-Pts':<7} {'V-Pts':<7} {'E-Pts':<7} "
          f"{'Train':<7} {'Val':<5} {'Test'}")
    print("-" * 80)
    for i, c in enumerate(selected, 1):
        print(f"{i:<4} {c['gloss']:<22} {c['total_score']:<7} "
              f"{c['total_videos']:<8} {c['train_parts']:<7} "
              f"{c['val_parts']:<7} {c['test_parts']:<7} "
              f"{c['train_videos']:<7} {c['val_videos']:<5} {c['test_videos']}")

    # ── Save selected_105_classes.csv ─────────────────────────────────────────
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "class_id", "rank", "gloss",
        "total_score", "participant_score", "video_score", "balance_score",
        "total_videos", "train_videos", "val_videos", "test_videos",
        "train_parts", "val_parts", "test_parts", "total_parts",
    ]
    selected_glosses = {c["gloss"] for c in selected}

    with open(OUT_CLASSES, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for i, c in enumerate(selected, 1):
            writer.writerow({"class_id": i - 1, "rank": i, **c})
    print(f"\n[saved] {OUT_CLASSES}")

    # ── Save filtered train/val/test CSVs ─────────────────────────────────────
    def filter_and_save(rows: list[dict], out_path: Path, label: str):
        filtered = [r for r in rows if r["Gloss"].strip() in selected_glosses]
        if filtered:
            with open(out_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=filtered[0].keys())
                writer.writeheader()
                writer.writerows(filtered)
        print(f"[saved] {out_path}  ({len(filtered)} rows from {label})")
        return filtered

    sel_train = filter_and_save(train_rows, OUT_TRAIN, "train")
    sel_val   = filter_and_save(val_rows,   OUT_VAL,   "val")
    sel_test  = filter_and_save(test_rows,  OUT_TEST,  "test")

    # ── Validation checks ─────────────────────────────────────────────────────
    print(f"\n[validation]")
    sel_train_glosses = {r["Gloss"].strip() for r in sel_train}
    sel_val_glosses   = {r["Gloss"].strip() for r in sel_val}
    sel_test_glosses  = {r["Gloss"].strip() for r in sel_test}
    sel_class_glosses = {c["gloss"] for c in selected}

    checks = [
        ("Exactly 105 unique classes",           len(sel_class_glosses) == TARGET_COUNT),
        ("All selected in train",                 sel_class_glosses == sel_train_glosses),
        ("All selected in val",                   sel_class_glosses == sel_val_glosses),
        ("All selected in test",                  sel_class_glosses == sel_test_glosses),
        ("No duplicate glosses",                  len(selected) == len(sel_class_glosses)),
        ("No empty gloss names",                  all(c["gloss"].strip() for c in selected)),
        ("Train CSV filtered correctly",          all(r["Gloss"].strip() in sel_class_glosses for r in sel_train)),
        ("Val CSV filtered correctly",            all(r["Gloss"].strip() in sel_class_glosses for r in sel_val)),
        ("Test CSV filtered correctly",           all(r["Gloss"].strip() in sel_class_glosses for r in sel_test)),
    ]

    all_passed = True
    for name, result in checks:
        status = "✓" if result else "✗"
        print(f"  {status} {name}")
        if not result:
            all_passed = False

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n[summary]")
    print(f"  Classes selected   : {len(selected)}")
    print(f"  Avg total score    : {sum(c['total_score'] for c in selected) / len(selected):.4f}")
    print(f"  Avg total videos   : {sum(c['total_videos'] for c in selected) / len(selected):.1f}")
    print(f"  Avg train parts    : {sum(c['train_parts'] for c in selected) / len(selected):.1f} / {TRAIN_TOTAL_PARTS}")
    print(f"  Avg val parts      : {sum(c['val_parts'] for c in selected) / len(selected):.1f} / {VAL_TOTAL_PARTS}")
    print(f"  Avg test parts     : {sum(c['test_parts'] for c in selected) / len(selected):.1f} / {TEST_TOTAL_PARTS}")
    print(f"  Selected train rows: {len(sel_train)}")
    print(f"  Selected val rows  : {len(sel_val)}")
    print(f"  Selected test rows : {len(sel_test)}")
    print(f"\n  {'All checks passed!' if all_passed else 'Some checks FAILED — review output.'}")
    print(f"\n[done] Next step: preprocess_asl.py")


if __name__ == "__main__":
    main()
