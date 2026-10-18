"""
verify_splits.py
-----------------
Verifies cross-split label consistency:
    1. All 105 classes present in train, val, and test
    2. Label IDs are consistent across all splits
    3. No signer appears in more than one split (signer independence)
    4. Sequence counts per split

Usage:
    cd Hi-Five_Recognition/ml
    python verify_splits.py
"""

from pathlib import Path
import csv
from collections import defaultdict

FEATURES_DIR   = Path("data/ASL-Citizen/features")
TRAIN_MANIFEST = FEATURES_DIR / "train_manifest.csv"
VAL_MANIFEST   = FEATURES_DIR / "val_manifest.csv"
TEST_MANIFEST  = FEATURES_DIR / "test_manifest.csv"
LABEL_MAP      = FEATURES_DIR / "label_map.csv"

EXPECTED_CLASSES = 105


def load_manifest(path: Path) -> list[dict]:
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def load_label_map(path: Path) -> dict[int, str]:
    result = {}
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            result[int(row["label_id"])] = row["gloss"]
    return result


def main():
    print("=" * 60)
    print("  ASL CROSS-SPLIT VERIFICATION")
    print("=" * 60)

    train = load_manifest(TRAIN_MANIFEST)
    val   = load_manifest(VAL_MANIFEST)
    test  = load_manifest(TEST_MANIFEST)
    label_map = load_label_map(LABEL_MAP)

    print(f"\n  Train sequences : {len(train)}")
    print(f"  Val sequences   : {len(val)}")
    print(f"  Test sequences  : {len(test)}")
    print(f"  Total           : {len(train) + len(val) + len(test)}")

    # ── 1. Class coverage per split ───────────────────────────────────────────
    print("\n" + "-" * 60)
    print("1. CLASS COVERAGE PER SPLIT")
    print("-" * 60)

    train_classes = set(int(r["label_id"]) for r in train)
    val_classes   = set(int(r["label_id"]) for r in val)
    test_classes  = set(int(r["label_id"]) for r in test)
    map_classes   = set(label_map.keys())

    print(f"  Classes in train    : {len(train_classes)}")
    print(f"  Classes in val      : {len(val_classes)}")
    print(f"  Classes in test     : {len(test_classes)}")
    print(f"  Classes in label map: {len(map_classes)}")

    all_same = train_classes == val_classes == test_classes == map_classes
    print(f"\n  All splits have same {EXPECTED_CLASSES} classes: {'[PASS]' if all_same else '[FAIL]'}")

    if not all_same:
        missing_val  = train_classes - val_classes
        missing_test = train_classes - test_classes
        if missing_val:
            print(f"  Missing in val  ({len(missing_val)}): {sorted(missing_val)[:10]}")
        if missing_test:
            print(f"  Missing in test ({len(missing_test)}): {sorted(missing_test)[:10]}")

    # ── 2. Label ID consistency ───────────────────────────────────────────────
    print("\n" + "-" * 60)
    print("2. LABEL ID CONSISTENCY ACROSS SPLITS")
    print("-" * 60)

    # Build gloss → label_id mapping from each split
    def get_gloss_map(rows):
        m = {}
        for r in rows:
            g  = r["gloss"]
            lid = int(r["label_id"])
            if g in m and m[g] != lid:
                print(f"  [FAIL] Inconsistent label_id for '{g}': {m[g]} vs {lid}")
            m[g] = lid
        return m

    train_map = get_gloss_map(train)
    val_map   = get_gloss_map(val)
    test_map  = get_gloss_map(test)

    conflicts = 0
    for gloss in train_map:
        if gloss in val_map and train_map[gloss] != val_map[gloss]:
            print(f"  [FAIL] '{gloss}' label_id differs: train={train_map[gloss]} val={val_map[gloss]}")
            conflicts += 1
        if gloss in test_map and train_map[gloss] != test_map[gloss]:
            print(f"  [FAIL] '{gloss}' label_id differs: train={train_map[gloss]} test={test_map[gloss]}")
            conflicts += 1

    if conflicts == 0:
        print("  [PASS] Label IDs are consistent across all splits.")
    else:
        print(f"  [FAIL] {conflicts} label ID conflicts found.")

    # ── 3. Signer independence ────────────────────────────────────────────────
    print("\n" + "-" * 60)
    print("3. SIGNER INDEPENDENCE CHECK")
    print("-" * 60)

    train_parts = set(r["participant"] for r in train)
    val_parts   = set(r["participant"] for r in val)
    test_parts  = set(r["participant"] for r in test)

    print(f"  Train participants : {len(train_parts)}")
    print(f"  Val participants   : {len(val_parts)}")
    print(f"  Test participants  : {len(test_parts)}")

    train_val_overlap  = train_parts & val_parts
    train_test_overlap = train_parts & test_parts
    val_test_overlap   = val_parts   & test_parts

    print(f"\n  Train ∩ Val  overlap : {len(train_val_overlap)}")
    print(f"  Train ∩ Test overlap : {len(train_test_overlap)}")
    print(f"  Val   ∩ Test overlap : {len(val_test_overlap)}")

    no_overlap = (
        len(train_val_overlap)  == 0 and
        len(train_test_overlap) == 0 and
        len(val_test_overlap)   == 0
    )
    print(f"\n  Signer independence: {'[PASS] No signer appears in more than one split.' if no_overlap else '[FAIL] Signer overlap detected!'}")

    if not no_overlap:
        if train_val_overlap:
            print(f"  Train/Val overlap: {sorted(train_val_overlap)}")
        if train_test_overlap:
            print(f"  Train/Test overlap: {sorted(train_test_overlap)}")
        if val_test_overlap:
            print(f"  Val/Test overlap: {sorted(val_test_overlap)}")

    # ── 4. Sequences per class per split ─────────────────────────────────────
    print("\n" + "-" * 60)
    print("4. SEQUENCES PER CLASS PER SPLIT")
    print("-" * 60)

    train_counts = defaultdict(int)
    val_counts   = defaultdict(int)
    test_counts  = defaultdict(int)

    for r in train: train_counts[int(r["label_id"])] += 1
    for r in val:   val_counts[int(r["label_id"])]   += 1
    for r in test:  test_counts[int(r["label_id"])]  += 1

    print(f"  Train — min: {min(train_counts.values())}  max: {max(train_counts.values())}  avg: {sum(train_counts.values())/len(train_counts):.1f}")
    print(f"  Val   — min: {min(val_counts.values())}   max: {max(val_counts.values())}   avg: {sum(val_counts.values())/len(val_counts):.1f}")
    print(f"  Test  — min: {min(test_counts.values())}  max: {max(test_counts.values())}  avg: {sum(test_counts.values())/len(test_counts):.1f}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    all_passed = all_same and conflicts == 0 and no_overlap
    print(f"  {'[PASS] All split checks passed!' if all_passed else '[WARN] Some checks need attention — review above.'}")
    print("=" * 60)


if __name__ == "__main__":
    main()
