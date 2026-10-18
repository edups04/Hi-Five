from pathlib import Path
import numpy as np

FEATURE_DIR = Path("data/ASL-Citizen/features")

total = 0
nan_files = []
inf_files = []

for npy_file in FEATURE_DIR.rglob("*.npy"):
    total += 1

    try:
        data = np.load(npy_file)

        if np.isnan(data).any():
            nan_files.append(npy_file)

        if np.isinf(data).any():
            inf_files.append(npy_file)

    except Exception as e:
        print(f"[ERROR] {npy_file}: {e}")

print("=" * 50)
print("ASL FEATURE VALUE VERIFICATION")
print("=" * 50)

print(f"Total .npy files : {total}")
print(f"Files with NaN   : {len(nan_files)}")
print(f"Files with Inf   : {len(inf_files)}")

if not nan_files and not inf_files:
    print("\n[PASS] No NaN or Inf values found!")
else:
    print("\n[FAIL] Invalid values detected.")

    if nan_files:
        print("\nFiles containing NaN:")
        for file in nan_files[:20]:
            print(file)

    if inf_files:
        print("\nFiles containing Inf:")
        for file in inf_files[:20]:
            print(file)