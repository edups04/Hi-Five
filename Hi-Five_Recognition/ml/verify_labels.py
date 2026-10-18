from pathlib import Path
import pandas as pd

TRAIN_MANIFEST = Path("data/ASL-Citizen/features/train_manifest.csv")
LABEL_MAP = Path("data/ASL-Citizen/features/label_map.csv")

manifest = pd.read_csv(TRAIN_MANIFEST)
label_map = pd.read_csv(LABEL_MAP)

print("=" * 60)
print("ASL LABEL VERIFICATION")
print("=" * 60)

# ---------------------------------------------------------
# 1. Basic information
# ---------------------------------------------------------
print(f"Manifest rows : {len(manifest)}")
print(f"Label map rows: {len(label_map)}")

print("\nManifest columns:")
print(manifest.columns.tolist())

# ---------------------------------------------------------
# 2. Check required columns
# ---------------------------------------------------------
required_columns = [
    "npy_file",
    "label_id",
    "gloss",
    "participant",
    "video_file",
    "split"
]

missing_columns = [
    col for col in required_columns
    if col not in manifest.columns
]

if missing_columns:
    print(f"\n[FAIL] Missing columns: {missing_columns}")
else:
    print("\n[PASS] All required manifest columns exist.")

# ---------------------------------------------------------
# 3. Check number of classes
# ---------------------------------------------------------
unique_classes = manifest["label_id"].nunique()

print(f"\nUnique training classes: {unique_classes}")

if unique_classes == 105:
    print("[PASS] Training data contains exactly 105 classes.")
else:
    print("[FAIL] Training data does not contain exactly 105 classes.")

# ---------------------------------------------------------
# 4. Check missing labels
# ---------------------------------------------------------
missing_ids = manifest["label_id"].isna().sum()
missing_gloss = manifest["gloss"].isna().sum()

print(f"\nMissing label IDs : {missing_ids}")
print(f"Missing glosses   : {missing_gloss}")

if missing_ids == 0 and missing_gloss == 0:
    print("[PASS] No missing labels.")
else:
    print("[FAIL] Missing labels found.")

# ---------------------------------------------------------
# 5. Check label map
# ---------------------------------------------------------
manifest_map = (
    manifest[["label_id", "gloss"]]
    .drop_duplicates()
    .sort_values("label_id")
)

label_map_sorted = (
    label_map[["label_id", "gloss"]]
    .drop_duplicates()
    .sort_values("label_id")
)

merged = manifest_map.merge(
    label_map_sorted,
    on="label_id",
    how="outer",
    suffixes=("_manifest", "_map"),
    indicator=True
)

mapping_errors = merged[
    (merged["_merge"] != "both") |
    (merged["gloss_manifest"] != merged["gloss_map"])
]

print(f"\nLabel mapping errors: {len(mapping_errors)}")

if len(mapping_errors) == 0:
    print("[PASS] Manifest labels match label_map.csv.")
else:
    print("[FAIL] Label mapping mismatch detected.")
    print(mapping_errors.head(20).to_string(index=False))

# ---------------------------------------------------------
# 6. Class distribution
# ---------------------------------------------------------
counts = manifest["label_id"].value_counts().sort_index()

print("\nClass distribution:")
print(counts.to_string())

print(f"\nMinimum samples/class: {counts.min()}")
print(f"Maximum samples/class: {counts.max()}")
print(f"Average samples/class: {counts.mean():.2f}")

# ---------------------------------------------------------
# 7. Duplicate checks
# ---------------------------------------------------------
duplicate_npy = manifest["npy_file"].duplicated().sum()
duplicate_video = manifest["video_file"].duplicated().sum()

print(f"\nDuplicate .npy entries  : {duplicate_npy}")
print(f"Duplicate video entries: {duplicate_video}")

if duplicate_npy == 0:
    print("[PASS] No duplicate feature files.")
else:
    print("[FAIL] Duplicate feature files found.")

if duplicate_video == 0:
    print("[PASS] No duplicate video entries.")
else:
    print("[FAIL] Duplicate video entries found.")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)