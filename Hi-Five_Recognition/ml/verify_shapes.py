from pathlib import Path
import numpy as np

# Change this if your feature folder is somewhere else
FEATURE_DIR = Path("data/ASL-Citizen/features")

EXPECTED_SHAPE = (64, 302)

total = 0
correct = 0
incorrect = []

for npy_file in FEATURE_DIR.rglob("*.npy"):
    total += 1

    try:
        data = np.load(npy_file, allow_pickle=False)
        
        if data.shape == EXPECTED_SHAPE:
            correct += 1
        else:
            incorrect.append((npy_file, data.shape))

    except Exception as e:
        incorrect.append((npy_file, f"ERROR: {e}"))

print("=" * 50)
print("ASL FEATURE SHAPE VERIFICATION")
print("=" * 50)

print(f"Total .npy files : {total}")
print(f"Correct shape   : {correct}")
print(f"Incorrect shape : {len(incorrect)}")
print(f"Expected shape  : {EXPECTED_SHAPE}")

if incorrect:
    print("\nIncorrect files:")
    for file, shape in incorrect[:20]:
        print(f"{file} -> {shape}")

    if len(incorrect) > 20:
        print(f"... and {len(incorrect) - 20} more")
else:
    print("\n[PASS] Every .npy file has the correct shape!")