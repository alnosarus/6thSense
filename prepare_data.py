"""
TUFFC CIRS Phantom Data Preparation
====================================
Converts raw .mat files (RF signals + displacement) into:
  - B-mode images (model input / features)
  - Mean strain values (model target / labels)

Each .mat file contains:
  - Data: (2, 1920, 384) = two RF frames (pre and post compression)
  - flow_f_init: (1, 2, 1920, 384) = forward displacement estimate
  - flow_b_init: (1, 2, 1920, 384) = backward displacement estimate

The phantom has:
  - Background tissue: ~20 kPa (soft, high strain under compression)
  - Stiff inclusion: ~40+ kPa (stiff, low strain under compression)

We compute strain from displacement, then derive a single stiffness
label per sample by analyzing the strain distribution.

Usage:
  python prepare_data.py --raw_dir datasets/raw/TUFFC_2022_Bi_Directional_elasto/extracted
"""

import argparse
import os
from pathlib import Path
from glob import glob

import numpy as np
from scipy.signal import hilbert
from scipy.ndimage import median_filter
from tqdm import tqdm


def rf_to_bmode(rf_frame, dynamic_range_db=60):
    """Convert RF signal to B-mode image via envelope detection."""
    envelope = np.abs(hilbert(rf_frame, axis=0))
    envelope = np.clip(envelope, 1e-10, None)
    log_env = 20 * np.log10(envelope / envelope.max())
    log_env = np.clip(log_env, -dynamic_range_db, 0)
    # Normalize to 0-255
    bmode = ((log_env + dynamic_range_db) / dynamic_range_db * 255).astype(np.uint8)
    return bmode


def compute_strain(flow_f, flow_b):
    """
    Compute strain from forward and backward displacement fields.
    Strain = gradient of axial displacement along depth (axis 0).
    Average forward and backward for robustness.
    """
    # Axial displacement (channel 0)
    disp_f = flow_f[0, 0]  # (1920, 384)
    disp_b = flow_b[0, 0]  # (1920, 384)

    # Average forward and backward
    disp_avg = (disp_f - disp_b) / 2.0

    # Strain = spatial derivative of displacement along depth
    strain = np.gradient(disp_avg, axis=0)

    # Smooth to reduce noise
    strain = median_filter(strain, size=5)

    return strain


def strain_to_stiffness_label(strain):
    """
    Convert a strain map to a single scalar stiffness value.

    Physics: stiffness is inversely proportional to strain.
    Under uniform stress, E ~ 1/strain.

    We return the median absolute strain as our label.
    Lower strain = stiffer sample region was dominant.
    Higher strain = softer sample region was dominant.

    We also return spatial statistics that tell us about
    the inclusion (stiff region) vs background (soft region).
    """
    abs_strain = np.abs(strain)

    # Trim extreme outliers (top/bottom 5%)
    p5, p95 = np.percentile(abs_strain, [5, 95])
    trimmed = abs_strain[(abs_strain >= p5) & (abs_strain <= p95)]

    median_strain = float(np.median(trimmed))
    mean_strain = float(np.mean(trimmed))
    std_strain = float(np.std(trimmed))

    # Strain contrast: ratio of high-strain to low-strain regions
    # This captures whether there's a visible inclusion
    p25, p75 = np.percentile(trimmed, [25, 75])
    contrast = p75 / (p25 + 1e-10)

    return {
        "median_strain": median_strain,
        "mean_strain": mean_strain,
        "std_strain": std_strain,
        "contrast": contrast,
    }


def process_mat_file(filepath):
    """Process a single .mat file into B-mode image + strain label."""
    import scipy.io as sio

    d = sio.loadmat(filepath)
    rf_data = d["Data"]        # (2, 1920, 384)
    flow_f = d["flow_f_init"]  # (1, 2, 1920, 384)
    flow_b = d["flow_b_init"]  # (1, 2, 1920, 384)

    # B-mode from pre-compression frame
    bmode = rf_to_bmode(rf_data[0])

    # Strain from displacement
    strain = compute_strain(flow_f, flow_b)

    # Scalar stiffness label
    label_info = strain_to_stiffness_label(strain)

    return bmode, strain, label_info


def main():
    parser = argparse.ArgumentParser(description="Prepare TUFFC data for ML experiment")
    parser.add_argument("--raw_dir", type=str,
                        default="datasets/raw/TUFFC_2022_Bi_Directional_elasto/extracted")
    parser.add_argument("--output_dir", type=str, default="datasets/processed")
    parser.add_argument("--img_size", type=int, default=256,
                        help="Resize images to this square size")
    parser.add_argument("--max_samples", type=int, default=0,
                        help="Limit number of samples (0 = all)")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    mat_files = sorted(glob(str(raw_dir / "Data_*.mat")),
                       key=lambda x: int(Path(x).stem.split("_")[1]))

    if not mat_files:
        print(f"No .mat files found in {raw_dir}")
        return

    if args.max_samples > 0:
        mat_files = mat_files[:args.max_samples]

    print(f"Processing {len(mat_files)} files from {raw_dir}")

    from PIL import Image

    images = []
    strain_maps = []
    labels = []
    failed = 0

    for filepath in tqdm(mat_files, desc="Processing"):
        try:
            bmode, strain, label_info = process_mat_file(filepath)

            # Resize B-mode
            pil_img = Image.fromarray(bmode)
            pil_img = pil_img.resize((args.img_size, args.img_size), Image.BILINEAR)
            bmode_resized = np.array(pil_img)

            # Resize strain map
            from scipy.ndimage import zoom
            h_scale = args.img_size / strain.shape[0]
            w_scale = args.img_size / strain.shape[1]
            strain_resized = zoom(strain, (h_scale, w_scale), order=1)

            images.append(bmode_resized)
            strain_maps.append(strain_resized)
            labels.append(label_info)

        except Exception as e:
            failed += 1
            if failed <= 5:
                print(f"Failed on {filepath}: {e}")
            continue

    print(f"\nProcessed: {len(images)} | Failed: {failed}")

    if not images:
        print("No data processed!")
        return

    images = np.array(images, dtype=np.uint8)
    strain_maps = np.array(strain_maps, dtype=np.float32)

    # Extract scalar labels
    median_strains = np.array([l["median_strain"] for l in labels], dtype=np.float32)
    mean_strains = np.array([l["mean_strain"] for l in labels], dtype=np.float32)
    contrasts = np.array([l["contrast"] for l in labels], dtype=np.float32)

    # Save everything
    np.savez_compressed(
        output_dir / "data.npz",
        images=images,              # (N, 256, 256) B-mode images
        strain_maps=strain_maps,    # (N, 256, 256) full strain maps
        stiffness=median_strains,   # (N,) scalar label (median strain)
        mean_strain=mean_strains,   # (N,) alternative label
        contrast=contrasts,         # (N,) inclusion contrast
    )

    print(f"\nSaved to {output_dir / 'data.npz'}")
    print(f"  Images shape: {images.shape}")
    print(f"  Strain maps shape: {strain_maps.shape}")
    print(f"  Median strain range: [{median_strains.min():.6f}, {median_strains.max():.6f}]")
    print(f"  Contrast range: [{contrasts.min():.2f}, {contrasts.max():.2f}]")

    # Quick sanity visualization
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(2, 4, figsize=(16, 8))
    for i in range(4):
        idx = i * (len(images) // 4)
        axes[0, i].imshow(images[idx], cmap="gray")
        axes[0, i].set_title(f"B-mode #{idx}")
        axes[0, i].axis("off")
        axes[1, i].imshow(strain_maps[idx], cmap="hot")
        axes[1, i].set_title(f"Strain (med={median_strains[idx]:.4f})")
        axes[1, i].axis("off")
    plt.suptitle("Sample B-mode (input) vs Strain (target)")
    plt.tight_layout()
    plt.savefig(output_dir / "data_preview.png", dpi=150)
    print(f"Preview saved to {output_dir / 'data_preview.png'}")

    # Distribution plot
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    axes[0].hist(median_strains, bins=50)
    axes[0].set_title("Median Strain Distribution")
    axes[0].set_xlabel("Median Absolute Strain")
    axes[1].hist(contrasts, bins=50)
    axes[1].set_title("Strain Contrast Distribution")
    axes[1].set_xlabel("Contrast (p75/p25)")
    plt.tight_layout()
    plt.savefig(output_dir / "label_distribution.png", dpi=150)
    print(f"Distribution saved to {output_dir / 'label_distribution.png'}")


if __name__ == "__main__":
    main()
