"""
verify_statistics.py
---------------------
Verifies feature statistics across all .npy files:
    1. Feature value ranges (position, velocity, flags)
    2. Zero-sequence detection
    3. Hand presence flag validity (only 0 or 1)
    4. Velocity non-zero check for motion frames

Usage:
    cd Hi-Five_Recognition/ml
    python verify_statistics.py
"""

from pathlib import Path
import numpy as np

FEATURE_DIR = Path("data/ASL-Citizen/features")

# Feature slice indices
LHAND_POS  = slice(0,   63)
RHAND_POS  = slice(63,  126)
POSE_POS   = slice(126, 144)
LHAND_VEL  = slice(144, 207)
RHAND_VEL  = slice(207, 270)
POSE_VEL   = slice(270, 288)
LHAND_FLAG = 288
RHAND_FLAG = 289

def main():
    print("=" * 60)
    print("  ASL FEATURE STATISTICS VERIFICATION")
    print("=" * 60)

    npy_files = list(FEATURE_DIR.rglob("*.npy"))
    total = len(npy_files)
    print(f"\nTotal .npy files: {total}\n")

    pos_mins, pos_maxs   = [], []
    vel_mins, vel_maxs   = [], []
    zero_sequences       = []
    bad_flag_files       = []
    zero_velocity_files  = []
    lhand_present_counts = 0
    rhand_present_counts = 0
    total_frames         = 0

    for npy_file in npy_files:
        try:
            data = np.load(npy_file)

            if np.all(data == 0):
                zero_sequences.append(npy_file)
                continue

            pos = np.concatenate([
                data[:, LHAND_POS].flatten(),
                data[:, RHAND_POS].flatten(),
                data[:, POSE_POS].flatten(),
            ])
            pos_mins.append(float(pos.min()))
            pos_maxs.append(float(pos.max()))

            vel = np.concatenate([
                data[:, LHAND_VEL].flatten(),
                data[:, RHAND_VEL].flatten(),
                data[:, POSE_VEL].flatten(),
            ])
            vel_mins.append(float(vel.min()))
            vel_maxs.append(float(vel.max()))

            lflags = data[:, LHAND_FLAG]
            rflags = data[:, RHAND_FLAG]
            if not np.all(np.isin(lflags, [0.0, 1.0])) or \
               not np.all(np.isin(rflags, [0.0, 1.0])):
                bad_flag_files.append(npy_file)

            lhand_present_counts += int(lflags.sum())
            rhand_present_counts += int(rflags.sum())
            total_frames         += data.shape[0]

            vel_frames = vel[64:]
            if np.all(vel_frames == 0):
                zero_velocity_files.append(npy_file)

        except Exception as e:
            print(f"  [ERROR] {npy_file}: {e}")

    print("-" * 60)
    print("1. ZERO SEQUENCE CHECK")
    print("-" * 60)
    print(f"  Fully zero sequences : {len(zero_sequences)}")
    if zero_sequences:
        print("  [WARN] These files may indicate MediaPipe failed entirely:")
        for f in zero_sequences[:10]:
            print(f"    {f.name}")
    else:
        print("  [PASS] No fully zero sequences found.")

    print("\n" + "-" * 60)
    print("2. POSITION FEATURE RANGES")
    print("-" * 60)
    if pos_mins:
        print(f"  Global min : {min(pos_mins):.4f}")
        print(f"  Global max : {max(pos_maxs):.4f}")
        reasonable = min(pos_mins) > -20.0 and max(pos_maxs) < 20.0
        print(f"  Range check: {'[PASS] values look reasonable' if reasonable else '[WARN] extreme values detected'}")

    print("\n" + "-" * 60)
    print("3. VELOCITY FEATURE RANGES")
    print("-" * 60)
    if vel_mins:
        print(f"  Global min : {min(vel_mins):.4f}")
        print(f"  Global max : {max(vel_maxs):.4f}")
        reasonable = min(vel_mins) > -20.0 and max(vel_maxs) < 20.0
        print(f"  Range check: {'[PASS] values look reasonable' if reasonable else '[WARN] extreme values detected'}")

    print("\n" + "-" * 60)
    print("4. HAND PRESENCE FLAGS")
    print("-" * 60)
    print(f"  Files with invalid flags : {len(bad_flag_files)}")
    if bad_flag_files:
        print("  [FAIL] These files have flags outside {0, 1}:")
        for f in bad_flag_files[:10]:
            print(f"    {f.name}")
    else:
        print("  [PASS] All presence flags are 0 or 1.")

    if total_frames > 0:
        lhand_rate = lhand_present_counts / total_frames * 100
        rhand_rate = rhand_present_counts / total_frames * 100
        print(f"\n  Left hand detected  : {lhand_present_counts}/{total_frames} frames ({lhand_rate:.1f}%)")
        print(f"  Right hand detected : {rhand_present_counts}/{total_frames} frames ({rhand_rate:.1f}%)")

    print("\n" + "-" * 60)
    print("5. VELOCITY NON-ZERO CHECK")
    print("-" * 60)
    print(f"  Files with all-zero velocity: {len(zero_velocity_files)}")
    if zero_velocity_files:
        print("  [WARN] These files may have incorrect velocity computation:")
        for f in zero_velocity_files[:10]:
            print(f"    {f.name}")
    else:
        print("  [PASS] All sequences have non-zero velocity.")

    print("\n" + "=" * 60)
    all_passed = (
        len(zero_sequences)      == 0 and
        len(bad_flag_files)      == 0 and
        len(zero_velocity_files) == 0
    )
    print(f"  {'[PASS] All statistics checks passed!' if all_passed else '[WARN] Some checks need attention.'}")
    print("=" * 60)


if __name__ == "__main__":
    main()
