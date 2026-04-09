"""
SenseProbe Sanity Check Suite
==============================
Is the model learning real stiffness signal or artifacts?

Tests:
  1. Grad-CAM visualization (where is the model looking?)
  2. Border ablation (mask borders → does it still work?)
  3. Center crop test (only center → does it still work?)
  4. Shuffled label sanity check (random labels → should collapse)
  5. Degradation robustness (noise, blur, resolution, contrast)

Usage:
  python sanity_check.py --data_dir datasets/processed_full --model_path models/ResNet18_best.pth
"""

import argparse
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, Subset, random_split
from torchvision import transforms, models
from sklearn.metrics import accuracy_score, r2_score, mean_absolute_error
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageFilter


# ============================================================
# Model (must match training)
# ============================================================

class DualHead(nn.Module):
    def __init__(self, backbone, feat_dim):
        super().__init__()
        self.backbone = backbone
        self.cls_head = nn.Sequential(nn.Dropout(0.3), nn.Linear(feat_dim, 2))
        self.reg_head = nn.Sequential(
            nn.Dropout(0.3), nn.Linear(feat_dim, 64), nn.ReLU(),
            nn.Linear(64, 1), nn.Sigmoid()
        )
    def forward(self, x):
        feat = self.backbone(x)
        return self.cls_head(feat), self.reg_head(feat).squeeze(-1)

def make_resnet18():
    backbone = models.resnet18(weights=None)
    feat_dim = backbone.fc.in_features
    backbone.fc = nn.Identity()
    return DualHead(backbone, feat_dim)


# ============================================================
# Dataset with flexible transforms
# ============================================================

class FlexDataset(Dataset):
    def __init__(self, images, stiffness_norm, labels, transform=None):
        self.images = images
        self.stiffness_norm = stiffness_norm
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img = self.images[idx]
        img_rgb = np.stack([img, img, img], axis=-1)
        img_pil = Image.fromarray(img_rgb)

        if self.transform:
            img_t = self.transform(img_pil)
        else:
            img_t = transforms.ToTensor()(img_pil)

        return img_t, torch.tensor(self.labels[idx], dtype=torch.long), \
               torch.tensor(self.stiffness_norm[idx], dtype=torch.float32)


# ============================================================
# Evaluation
# ============================================================

@torch.no_grad()
def evaluate_model(model, loader, device):
    model.eval()
    all_preds, all_labels, all_rpreds, all_rtargets = [], [], [], []

    for imgs, labels, stiffness in loader:
        imgs = imgs.to(device)
        cls_out, reg_out = model(imgs)
        all_preds.extend(cls_out.argmax(1).cpu().numpy())
        all_labels.extend(labels.numpy())
        all_rpreds.extend(reg_out.cpu().numpy())
        all_rtargets.extend(stiffness.numpy())

    return {
        "accuracy": accuracy_score(all_labels, all_preds),
        "r2": r2_score(all_rtargets, all_rpreds),
        "mae": mean_absolute_error(all_rtargets, all_rpreds),
    }


# ============================================================
# Test 1: Grad-CAM
# ============================================================

def grad_cam(model, img_tensor, device, target_layer):
    """Compute Grad-CAM heatmap for the given input."""
    model.eval()
    activations = {}
    gradients = {}

    def fwd_hook(module, inp, out):
        activations["value"] = out.detach()

    def bwd_hook(module, grad_in, grad_out):
        gradients["value"] = grad_out[0].detach()

    handle_f = target_layer.register_forward_hook(fwd_hook)
    handle_b = target_layer.register_full_backward_hook(bwd_hook)

    img = img_tensor.unsqueeze(0).to(device).requires_grad_(True)
    cls_out, reg_out = model(img)

    # Use regression output for grad-cam (more relevant than classification)
    reg_out.backward()

    act = activations["value"].squeeze(0)  # (C, H, W)
    grad = gradients["value"].squeeze(0)   # (C, H, W)
    weights = grad.mean(dim=(1, 2))        # (C,)
    cam = (weights[:, None, None] * act).sum(0)  # (H, W)
    cam = torch.relu(cam)
    cam = cam / (cam.max() + 1e-8)

    handle_f.remove()
    handle_b.remove()

    return cam.cpu().numpy()


def run_gradcam(model, images, stiffness_norm, labels, device, save_dir, n=8):
    """Visualize Grad-CAM on correctly predicted samples."""
    print("\n[TEST 1] Grad-CAM Visualization")

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # Find the last conv layer in resnet backbone
    target_layer = model.backbone.layer4[-1].conv2

    fig, axes = plt.subplots(3, n, figsize=(3 * n, 9))

    # Pick diverse samples
    indices = np.linspace(0, len(images) - 1, n * 3, dtype=int)
    shown = 0

    model.eval()
    for idx in indices:
        if shown >= n:
            break

        img = images[idx]
        img_rgb = np.stack([img, img, img], axis=-1)
        img_pil = Image.fromarray(img_rgb)
        img_t = transform(img_pil)

        # Check if correctly predicted
        with torch.no_grad():
            cls_out, reg_out = model(img_t.unsqueeze(0).to(device))
            pred = cls_out.argmax(1).item()

        if pred != labels[idx]:
            continue

        cam = grad_cam(model, img_t, device, target_layer)
        cam_resized = np.array(Image.fromarray((cam * 255).astype(np.uint8)).resize((256, 256))) / 255.0

        axes[0, shown].imshow(img, cmap="gray")
        axes[0, shown].set_title(f"B-mode #{idx}")
        axes[0, shown].axis("off")

        axes[1, shown].imshow(cam_resized, cmap="jet", vmin=0, vmax=1)
        axes[1, shown].set_title("Grad-CAM")
        axes[1, shown].axis("off")

        axes[2, shown].imshow(img, cmap="gray")
        axes[2, shown].imshow(cam_resized, cmap="jet", alpha=0.5, vmin=0, vmax=1)
        label_str = "stiff" if labels[idx] == 1 else "soft"
        axes[2, shown].set_title(f"Overlay ({label_str})")
        axes[2, shown].axis("off")

        shown += 1

    plt.suptitle("Grad-CAM: Where is the model looking?", fontsize=14)
    plt.tight_layout()
    plt.savefig(save_dir / "gradcam.png", dpi=150)
    print(f"  Saved → {save_dir / 'gradcam.png'}")
    print(f"  Interpretation: Check if heatmaps focus on the inclusion (center oval)")
    print(f"  vs borders/corners/text (would indicate artifact learning)")


# ============================================================
# Test 2 & 3: Border ablation + Center crop
# ============================================================

def run_spatial_tests(model, images, stiffness_norm, labels, test_idx, device, save_dir):
    """Test border masking and center cropping."""
    print("\n[TEST 2] Border Ablation")
    print("[TEST 3] Center Crop")

    base_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # Baseline (full image)
    ds_full = FlexDataset(images[test_idx], stiffness_norm[test_idx], labels[test_idx], base_transform)
    loader_full = DataLoader(ds_full, batch_size=32, shuffle=False)
    baseline = evaluate_model(model, loader_full, device)
    print(f"  Baseline (full image):   Acc={baseline['accuracy']:.3f}  R²={baseline['r2']:.3f}")

    results = {"full_image": baseline}

    # Border masks: 10%, 20%, 30%
    for pct in [10, 20, 30]:
        masked_imgs = images[test_idx].copy()
        h, w = masked_imgs.shape[1], masked_imgs.shape[2]
        border = int(min(h, w) * pct / 100)
        # Set borders to mean pixel value
        mean_val = int(masked_imgs.mean())
        masked_imgs[:, :border, :] = mean_val
        masked_imgs[:, -border:, :] = mean_val
        masked_imgs[:, :, :border] = mean_val
        masked_imgs[:, :, -border:] = mean_val

        ds_masked = FlexDataset(masked_imgs, stiffness_norm[test_idx], labels[test_idx], base_transform)
        loader_masked = DataLoader(ds_masked, batch_size=32, shuffle=False)
        m = evaluate_model(model, loader_masked, device)
        results[f"border_mask_{pct}pct"] = m
        print(f"  Border mask {pct}%:        Acc={m['accuracy']:.3f}  R²={m['r2']:.3f}")

    # Center crops: 80%, 60%, 40%
    for crop_pct in [80, 60, 40]:
        h, w = images.shape[1], images.shape[2]
        crop_h = int(h * crop_pct / 100)
        crop_w = int(w * crop_pct / 100)
        y_start = (h - crop_h) // 2
        x_start = (w - crop_w) // 2

        cropped = images[test_idx][:, y_start:y_start+crop_h, x_start:x_start+crop_w].copy()

        # Resize back to original size
        resized = np.array([
            np.array(Image.fromarray(c).resize((w, h))) for c in cropped
        ])

        ds_crop = FlexDataset(resized, stiffness_norm[test_idx], labels[test_idx], base_transform)
        loader_crop = DataLoader(ds_crop, batch_size=32, shuffle=False)
        m = evaluate_model(model, loader_crop, device)
        results[f"center_crop_{crop_pct}pct"] = m
        print(f"  Center crop {crop_pct}%:       Acc={m['accuracy']:.3f}  R²={m['r2']:.3f}")

    return results


# ============================================================
# Test 4: Shuffled labels
# ============================================================

def run_shuffled_labels(images, stiffness_norm, labels, train_idx, test_idx, device, save_dir):
    """Train on random labels - should collapse to ~50% accuracy."""
    print("\n[TEST 4] Shuffled Label Sanity Check")

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # Shuffle labels
    rng = np.random.RandomState(99)
    shuffled_labels = labels.copy()
    rng.shuffle(shuffled_labels)
    shuffled_stiffness = stiffness_norm.copy()
    rng.shuffle(shuffled_stiffness)

    train_ds = FlexDataset(images[train_idx], shuffled_stiffness[train_idx], shuffled_labels[train_idx], transform)
    test_ds = FlexDataset(images[test_idx], shuffled_stiffness[test_idx], shuffled_labels[test_idx], transform)
    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False)

    # Quick model - only 10 epochs
    model = make_resnet18().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-4)
    cls_loss_fn = nn.CrossEntropyLoss()
    reg_loss_fn = nn.SmoothL1Loss()

    for epoch in range(10):
        model.train()
        for imgs, lbl, stf in train_loader:
            imgs, lbl, stf = imgs.to(device), lbl.to(device), stf.to(device)
            cls_out, reg_out = model(imgs)
            loss = cls_loss_fn(cls_out, lbl) + 2.0 * reg_loss_fn(reg_out, stf)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

    m = evaluate_model(model, test_loader, device)
    print(f"  Shuffled labels (10 epochs): Acc={m['accuracy']:.3f}  R²={m['r2']:.3f}")
    print(f"  Expected: Acc ~0.50, R² ~0.0 (random)")

    if m['accuracy'] < 0.55 and m['r2'] < 0.1:
        print(f"  PASS: Model cannot learn from random labels")
    else:
        print(f"  WARNING: Model showing signal on random labels - possible data leak")

    return m


# ============================================================
# Test 5: Degradation robustness
# ============================================================

def run_degradation_suite(model, images, stiffness_norm, labels, test_idx, device, save_dir):
    """Test model on degraded inputs."""
    print("\n[TEST 5] Degradation Robustness Suite")

    base_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # Baseline
    ds = FlexDataset(images[test_idx], stiffness_norm[test_idx], labels[test_idx], base_transform)
    loader = DataLoader(ds, batch_size=32, shuffle=False)
    baseline = evaluate_model(model, loader, device)
    print(f"  Baseline:              Acc={baseline['accuracy']:.3f}  R²={baseline['r2']:.3f}")

    results = {"baseline": baseline}

    degradations = {}

    # Resolution: 0.5x and 0.25x
    for scale in [0.5, 0.25]:
        h, w = images.shape[1], images.shape[2]
        new_h, new_w = int(h * scale), int(w * scale)
        degraded = np.array([
            np.array(Image.fromarray(img).resize((new_w, new_h)).resize((w, h)))
            for img in images[test_idx]
        ])
        degradations[f"resolution_{scale}x"] = degraded

    # Gaussian noise
    for sigma in [15, 30]:
        degraded = images[test_idx].astype(np.float32)
        noise = np.random.normal(0, sigma, degraded.shape)
        degraded = np.clip(degraded + noise, 0, 255).astype(np.uint8)
        degradations[f"gaussian_noise_σ{sigma}"] = degraded

    # Speckle noise (multiplicative - realistic for ultrasound)
    for level in [0.3, 0.6]:
        degraded = images[test_idx].astype(np.float32)
        speckle = np.random.exponential(1.0, degraded.shape)
        degraded = np.clip(degraded * (1 + level * (speckle - 1)), 0, 255).astype(np.uint8)
        degradations[f"speckle_noise_{level}"] = degraded

    # Gaussian blur
    for radius in [2, 5]:
        degraded = np.array([
            np.array(Image.fromarray(img).filter(ImageFilter.GaussianBlur(radius)))
            for img in images[test_idx]
        ])
        degradations[f"blur_r{radius}"] = degraded

    # Contrast reduction
    for factor in [0.5, 0.25]:
        degraded = images[test_idx].astype(np.float32)
        mean = degraded.mean(axis=(1, 2), keepdims=True)
        degraded = np.clip(mean + factor * (degraded - mean), 0, 255).astype(np.uint8)
        degradations[f"contrast_{factor}x"] = degraded

    for name, deg_imgs in degradations.items():
        ds_deg = FlexDataset(deg_imgs, stiffness_norm[test_idx], labels[test_idx], base_transform)
        loader_deg = DataLoader(ds_deg, batch_size=32, shuffle=False)
        m = evaluate_model(model, loader_deg, device)
        results[name] = m

        acc_drop = baseline["accuracy"] - m["accuracy"]
        r2_drop = baseline["r2"] - m["r2"]
        print(f"  {name:<25s} Acc={m['accuracy']:.3f} (Δ{acc_drop:+.3f})  R²={m['r2']:.3f} (Δ{r2_drop:+.3f})")

    # Visualization of degradations
    fig, axes = plt.subplots(2, 6, figsize=(24, 8))
    sample_idx = 0
    orig = images[test_idx[sample_idx]]
    axes[0, 0].imshow(orig, cmap="gray"); axes[0, 0].set_title("Original"); axes[0, 0].axis("off")
    axes[1, 0].imshow(orig, cmap="gray"); axes[1, 0].set_title("Original"); axes[1, 0].axis("off")

    deg_names = list(degradations.keys())
    for i, dname in enumerate(deg_names[:5]):
        row = 0 if i < 5 else 1
        col = (i % 5) + 1
        axes[0, col].imshow(degradations[dname][sample_idx], cmap="gray")
        m = results[dname]
        axes[0, col].set_title(f"{dname}\nAcc={m['accuracy']:.2f} R²={m['r2']:.2f}", fontsize=8)
        axes[0, col].axis("off")

    for i, dname in enumerate(deg_names[5:10]):
        col = (i % 5) + 1
        axes[1, col].imshow(degradations[dname][sample_idx], cmap="gray")
        m = results[dname]
        axes[1, col].set_title(f"{dname}\nAcc={m['accuracy']:.2f} R²={m['r2']:.2f}", fontsize=8)
        axes[1, col].axis("off")

    plt.suptitle("Degradation Robustness", fontsize=14)
    plt.tight_layout()
    plt.savefig(save_dir / "degradation.png", dpi=150)
    print(f"  Saved → {save_dir / 'degradation.png'}")

    return results


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="datasets/processed_full")
    parser.add_argument("--model_path", default="models/ResNet18_best.pth")
    args = parser.parse_args()

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "mps" if torch.backends.mps.is_available()
        else "cpu"
    )
    print(f"Device: {device}")

    save_dir = Path("results/sanity")
    save_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    data = np.load(Path(args.data_dir) / "data.npz")
    images = data["images"]
    stiffness = data["stiffness"].astype(np.float32)
    stiff_min, stiff_max = stiffness.min(), stiffness.max()
    stiffness_norm = (stiffness - stiff_min) / (stiff_max - stiff_min + 1e-8)
    labels = (stiffness > np.median(stiffness)).astype(np.int64)

    print(f"Loaded {len(images)} samples")

    # Split (same as training)
    n = len(images)
    test_size = int(n * 0.2)
    train_size = n - test_size
    gen = torch.Generator().manual_seed(42)
    all_idx = torch.randperm(n, generator=gen).numpy()
    train_idx = all_idx[:train_size]
    test_idx = all_idx[train_size:]
    print(f"Train: {len(train_idx)} | Test: {len(test_idx)}")

    # Load model
    model = make_resnet18()
    model.load_state_dict(torch.load(args.model_path, map_location=device))
    model = model.to(device)
    print(f"Loaded model from {args.model_path}")

    # ── Run all tests ──
    print("\n" + "=" * 60)
    print(" SANITY CHECK SUITE")
    print("=" * 60)

    # 1. Grad-CAM
    run_gradcam(model, images, stiffness_norm, labels, device, save_dir)

    # 2 & 3. Spatial tests
    spatial_results = run_spatial_tests(model, images, stiffness_norm, labels, test_idx, device, save_dir)

    # 4. Shuffled labels
    shuffled_results = run_shuffled_labels(images, stiffness_norm, labels, train_idx, test_idx, device, save_dir)

    # 5. Degradation
    deg_results = run_degradation_suite(model, images, stiffness_norm, labels, test_idx, device, save_dir)

    # ── Summary Table ──
    print("\n" + "=" * 70)
    print(" SUMMARY TABLE")
    print("=" * 70)
    print(f"{'Test':<30} {'Acc':>8} {'R²':>8} {'Interpretation':<30}")
    print("-" * 70)

    baseline_acc = spatial_results["full_image"]["accuracy"]
    baseline_r2 = spatial_results["full_image"]["r2"]

    rows = [
        ("Full image (baseline)", baseline_acc, baseline_r2, "Reference"),
    ]

    for key in ["border_mask_10pct", "border_mask_20pct", "border_mask_30pct"]:
        m = spatial_results[key]
        drop = baseline_acc - m["accuracy"]
        interp = "Borders matter" if drop > 0.1 else "Robust to border masking"
        rows.append((key.replace("_", " "), m["accuracy"], m["r2"], interp))

    for key in ["center_crop_80pct", "center_crop_60pct", "center_crop_40pct"]:
        m = spatial_results[key]
        interp = "Center has signal" if m["accuracy"] > 0.6 else "Signal not in center"
        rows.append((key.replace("_", " "), m["accuracy"], m["r2"], interp))

    rows.append(("Shuffled labels", shuffled_results["accuracy"], shuffled_results["r2"],
                  "PASS" if shuffled_results["accuracy"] < 0.55 else "WARNING"))

    for key in ["resolution_0.5x", "resolution_0.25x", "gaussian_noise_σ15", "gaussian_noise_σ30",
                 "speckle_noise_0.3", "speckle_noise_0.6", "blur_r2", "blur_r5",
                 "contrast_0.5x", "contrast_0.25x"]:
        if key in deg_results:
            m = deg_results[key]
            drop = baseline_acc - m["accuracy"]
            if drop > 0.15:
                interp = "FRAGILE"
            elif drop > 0.05:
                interp = "Moderate degradation"
            else:
                interp = "Robust"
            rows.append((key, m["accuracy"], m["r2"], interp))

    for test, acc, r2, interp in rows:
        print(f"{test:<30} {acc:>8.3f} {r2:>8.3f} {interp:<30}")

    # ── Verdict ──
    print("\n" + "=" * 70)
    print(" VERDICT")
    print("=" * 70)

    # Check indicators
    border_robust = all(
        spatial_results[f"border_mask_{p}pct"]["accuracy"] > baseline_acc - 0.1
        for p in [10, 20]
    )
    center_has_signal = spatial_results["center_crop_60pct"]["accuracy"] > 0.6
    shuffled_collapsed = shuffled_results["accuracy"] < 0.55
    mild_degradation_ok = all(
        deg_results.get(k, {}).get("accuracy", 0) > baseline_acc - 0.15
        for k in ["resolution_0.5x", "gaussian_noise_σ15", "blur_r2", "contrast_0.5x"]
    )

    signals = [border_robust, center_has_signal, shuffled_collapsed, mild_degradation_ok]
    pass_count = sum(signals)

    if pass_count >= 3:
        verdict = "LIKELY REAL SIGNAL"
    elif pass_count >= 2:
        verdict = "LIKELY REAL but some concerns"
    elif pass_count >= 1:
        verdict = "UNCLEAR - needs investigation"
    else:
        verdict = "LIKELY ARTIFACT-DRIVEN"

    print(f"\n  Border robust:           {'PASS' if border_robust else 'FAIL'}")
    print(f"  Center has signal:       {'PASS' if center_has_signal else 'FAIL'}")
    print(f"  Shuffled labels collapse:{'PASS' if shuffled_collapsed else 'FAIL'}")
    print(f"  Mild degradation robust: {'PASS' if mild_degradation_ok else 'FAIL'}")
    print(f"\n  CONCLUSION: {verdict}")
    print("=" * 70)

    # Save all results
    import json
    all_results = {
        "spatial": {k: v for k, v in spatial_results.items()},
        "shuffled": shuffled_results,
        "degradation": {k: v for k, v in deg_results.items()},
        "verdict": verdict,
    }
    with open(save_dir / "results.json", "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nAll results saved to {save_dir / 'results.json'}")


if __name__ == "__main__":
    main()
