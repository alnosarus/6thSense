"""
Robust ResNet18 Training
========================
Same architecture, aggressive noise augmentation to survive cheap ultrasound.

Augmentations applied during training:
  - Speckle noise (multiplicative, 3 levels)
  - Gaussian noise (2 levels)
  - Gaussian blur (2 kernel sizes)
  - Contrast jitter
  - Horizontal/vertical flips, small rotation

Usage:
  python train_robust.py --data_dir datasets/processed_full --epochs 50
"""

import argparse
import json
import os
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, Subset
from torchvision import transforms, models
from sklearn.metrics import accuracy_score, r2_score, mean_absolute_error
from PIL import Image, ImageFilter
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


# ============================================================
# Model (identical to before)
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
    backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    feat_dim = backbone.fc.in_features
    backbone.fc = nn.Identity()
    return DualHead(backbone, feat_dim)


# ============================================================
# Ultrasound-specific augmentations (applied on numpy BEFORE torchvision)
# ============================================================

class UltrasoundAugment:
    """Realistic degradation augmentations for ultrasound images."""

    def __call__(self, img_np):
        """img_np: (H, W) uint8 numpy array."""
        img = img_np.astype(np.float32)

        # Speckle noise (multiplicative - the dominant ultrasound noise)
        # Applied 60% of the time at random intensity
        if np.random.random() < 0.6:
            level = np.random.uniform(0.1, 0.5)
            speckle = np.random.exponential(1.0, img.shape).astype(np.float32)
            img = img * (1 + level * (speckle - 1))

        # Gaussian noise (additive)
        if np.random.random() < 0.4:
            sigma = np.random.uniform(5, 25)
            noise = np.random.normal(0, sigma, img.shape).astype(np.float32)
            img = img + noise

        # Gaussian blur
        if np.random.random() < 0.3:
            kernel = np.random.choice([1, 2, 3])
            from scipy.ndimage import gaussian_filter
            img = gaussian_filter(img, sigma=kernel)

        # Contrast variation
        if np.random.random() < 0.4:
            factor = np.random.uniform(0.6, 1.4)
            mean = img.mean()
            img = mean + factor * (img - mean)

        # Brightness shift
        if np.random.random() < 0.3:
            shift = np.random.uniform(-20, 20)
            img = img + shift

        return np.clip(img, 0, 255).astype(np.uint8)


# ============================================================
# Dataset
# ============================================================

class RobustDataset(Dataset):
    def __init__(self, images, stiffness_norm, labels, transform, us_augment=None):
        self.images = images
        self.stiffness_norm = stiffness_norm
        self.labels = labels
        self.transform = transform
        self.us_augment = us_augment

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img = self.images[idx].copy()

        # Apply ultrasound augmentations on raw image
        if self.us_augment is not None:
            img = self.us_augment(img)

        img_rgb = np.stack([img, img, img], axis=-1)
        img_pil = Image.fromarray(img_rgb)
        img_t = self.transform(img_pil)

        return img_t, torch.tensor(self.labels[idx], dtype=torch.long), \
               torch.tensor(self.stiffness_norm[idx], dtype=torch.float32)


# ============================================================
# Evaluation on degraded data
# ============================================================

class CleanDataset(Dataset):
    def __init__(self, images, stiffness_norm, labels, transform):
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
        img_t = self.transform(img_pil)
        return img_t, torch.tensor(self.labels[idx], dtype=torch.long), \
               torch.tensor(self.stiffness_norm[idx], dtype=torch.float32)


@torch.no_grad()
def evaluate(model, loader, device):
    model.eval()
    preds, lbls, rpreds, rtgts = [], [], [], []
    for imgs, labels, stiffness in loader:
        imgs = imgs.to(device)
        cls_out, reg_out = model(imgs)
        preds.extend(cls_out.argmax(1).cpu().numpy())
        lbls.extend(labels.numpy())
        rpreds.extend(reg_out.cpu().numpy())
        rtgts.extend(stiffness.numpy())
    return {
        "accuracy": accuracy_score(lbls, preds),
        "r2": r2_score(rtgts, rpreds),
        "mae": mean_absolute_error(rtgts, rpreds),
    }


def eval_degraded(model, images, stiffness_norm, labels, test_idx, device):
    """Run full degradation suite on a model."""
    base_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    def make_loader(imgs):
        ds = CleanDataset(imgs, stiffness_norm[test_idx], labels[test_idx], base_tf)
        return DataLoader(ds, batch_size=32, shuffle=False)

    test_imgs = images[test_idx]
    results = {}

    # Clean baseline
    results["clean"] = evaluate(model, make_loader(test_imgs), device)

    # Resolution
    for scale in [0.5, 0.25]:
        h, w = test_imgs.shape[1], test_imgs.shape[2]
        nh, nw = int(h * scale), int(w * scale)
        deg = np.array([np.array(Image.fromarray(i).resize((nw, nh)).resize((w, h))) for i in test_imgs])
        results[f"res_{scale}x"] = evaluate(model, make_loader(deg), device)

    # Gaussian noise
    for sigma in [15, 30]:
        deg = np.clip(test_imgs.astype(float) + np.random.normal(0, sigma, test_imgs.shape), 0, 255).astype(np.uint8)
        results[f"gauss_σ{sigma}"] = evaluate(model, make_loader(deg), device)

    # Speckle noise
    for level in [0.3, 0.6]:
        speckle = np.random.exponential(1.0, test_imgs.shape).astype(np.float32)
        deg = np.clip(test_imgs.astype(float) * (1 + level * (speckle - 1)), 0, 255).astype(np.uint8)
        results[f"speckle_{level}"] = evaluate(model, make_loader(deg), device)

    # Blur
    for radius in [2, 5]:
        deg = np.array([np.array(Image.fromarray(i).filter(ImageFilter.GaussianBlur(radius))) for i in test_imgs])
        results[f"blur_r{radius}"] = evaluate(model, make_loader(deg), device)

    # Contrast
    for factor in [0.5, 0.25]:
        mean = test_imgs.astype(float).mean(axis=(1, 2), keepdims=True)
        deg = np.clip(mean + factor * (test_imgs.astype(float) - mean), 0, 255).astype(np.uint8)
        results[f"contrast_{factor}x"] = evaluate(model, make_loader(deg), device)

    return results


# ============================================================
# Training
# ============================================================

def train(model, train_loader, test_loader, device, epochs, lr):
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    # Warmup + cosine
    def lr_lambda(epoch):
        if epoch < 5:
            return (epoch + 1) / 5
        return 0.5 * (1 + np.cos(np.pi * (epoch - 5) / (epochs - 5)))
    scheduler = optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)

    cls_fn = nn.CrossEntropyLoss()
    reg_fn = nn.SmoothL1Loss()
    best_loss = float("inf")

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0
        for imgs, lbls, stf in train_loader:
            imgs, lbls, stf = imgs.to(device), lbls.to(device), stf.to(device)
            cls_out, reg_out = model(imgs)
            loss = cls_fn(cls_out, lbls) + 2.0 * reg_fn(reg_out, stf)
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item()

        scheduler.step()

        # Quick eval every 10 epochs
        if epoch % 10 == 0 or epoch == 1 or epoch == epochs:
            model.eval()
            test_loss = 0
            preds, lbls_all, rpreds, rtgts = [], [], [], []
            with torch.no_grad():
                for imgs, lbls, stf in test_loader:
                    imgs, lbls, stf = imgs.to(device), lbls.to(device), stf.to(device)
                    cls_out, reg_out = model(imgs)
                    loss = cls_fn(cls_out, lbls) + 2.0 * reg_fn(reg_out, stf)
                    test_loss += loss.item()
                    preds.extend(cls_out.argmax(1).cpu().numpy())
                    lbls_all.extend(lbls.cpu().numpy())
                    rpreds.extend(reg_out.cpu().numpy())
                    rtgts.extend(stf.cpu().numpy())

            acc = accuracy_score(lbls_all, preds)
            r2 = r2_score(rtgts, rpreds)
            tl = test_loss / len(test_loader)
            print(f"  [{epoch:3d}/{epochs}] Train: {total_loss/len(train_loader):.4f} | Test: {tl:.4f} | Acc: {acc:.3f} | R²: {r2:.3f}")

            if tl < best_loss:
                best_loss = tl
                torch.save(model.state_dict(), "models/ResNet18_robust_best.pth")


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="datasets/processed_full")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    args = parser.parse_args()

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "mps" if torch.backends.mps.is_available()
        else "cpu"
    )
    print(f"Device: {device}")

    # Load data
    data = np.load(Path(args.data_dir) / "data.npz")
    images = data["images"]
    stiffness = data["stiffness"].astype(np.float32)
    stiff_min, stiff_max = stiffness.min(), stiffness.max()
    stiffness_norm = (stiffness - stiff_min) / (stiff_max - stiff_min + 1e-8)
    labels = (stiffness > np.median(stiffness)).astype(np.int64)
    print(f"Loaded {len(images)} samples")

    # Same split as before
    n = len(images)
    gen = torch.Generator().manual_seed(42)
    perm = torch.randperm(n, generator=gen).numpy()
    test_size = int(n * 0.2)
    train_idx = perm[:n - test_size]
    test_idx = perm[n - test_size:]
    print(f"Train: {len(train_idx)} | Test: {len(test_idx)}")

    # Transforms
    train_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(10),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    test_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    # Datasets
    us_aug = UltrasoundAugment()
    train_ds = RobustDataset(images[train_idx], stiffness_norm[train_idx], labels[train_idx], train_tf, us_aug)
    test_ds = CleanDataset(images[test_idx], stiffness_norm[test_idx], labels[test_idx], test_tf)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    # ── Train robust model ──
    print("\n" + "=" * 60)
    print(" TRAINING ROBUST ResNet18")
    print(" (with speckle, gaussian noise, blur, contrast augmentation)")
    print("=" * 60)

    model = make_resnet18().to(device)
    train(model, train_loader, test_loader, device, args.epochs, args.lr)

    # ── Load best and evaluate ──
    model.load_state_dict(torch.load("models/ResNet18_robust_best.pth", map_location=device))
    model.to(device)

    print("\n" + "=" * 60)
    print(" DEGRADATION COMPARISON: ORIGINAL vs ROBUST")
    print("=" * 60)

    # Load original model
    orig_model = make_resnet18().to(device)
    orig_model.load_state_dict(torch.load("models/ResNet18_best.pth", map_location=device))

    print("\nEvaluating original model...")
    orig_results = eval_degraded(orig_model, images, stiffness_norm, labels, test_idx, device)

    print("Evaluating robust model...")
    robust_results = eval_degraded(model, images, stiffness_norm, labels, test_idx, device)

    # ── Print comparison table ──
    print("\n" + "=" * 85)
    print(f"{'Test':<22} {'ORIGINAL Acc':>12} {'ORIGINAL R²':>12} {'ROBUST Acc':>12} {'ROBUST R²':>12} {'Δ Acc':>8}")
    print("-" * 85)

    for key in orig_results:
        o = orig_results[key]
        r = robust_results[key]
        delta_acc = r["accuracy"] - o["accuracy"]
        marker = "  ↑" if delta_acc > 0.02 else ("  ↓" if delta_acc < -0.02 else "")
        print(f"{key:<22} {o['accuracy']:>12.3f} {o['r2']:>12.3f} {r['accuracy']:>12.3f} {r['r2']:>12.3f} {delta_acc:>+8.3f}{marker}")

    # ── Summary ──
    print("\n" + "=" * 60)
    print(" SUMMARY")
    print("=" * 60)

    clean_orig = orig_results["clean"]["accuracy"]
    clean_robust = robust_results["clean"]["accuracy"]
    clean_drop = clean_robust - clean_orig

    # Average accuracy across all degraded conditions (excluding clean)
    deg_keys = [k for k in orig_results if k != "clean"]
    avg_orig = np.mean([orig_results[k]["accuracy"] for k in deg_keys])
    avg_robust = np.mean([robust_results[k]["accuracy"] for k in deg_keys])
    avg_improvement = avg_robust - avg_orig

    # Speckle specifically
    speckle_orig = np.mean([orig_results[k]["accuracy"] for k in ["speckle_0.3", "speckle_0.6"]])
    speckle_robust = np.mean([robust_results[k]["accuracy"] for k in ["speckle_0.3", "speckle_0.6"]])

    print(f"  Clean accuracy:     {clean_orig:.3f} → {clean_robust:.3f} (Δ {clean_drop:+.3f})")
    print(f"  Avg degraded acc:   {avg_orig:.3f} → {avg_robust:.3f} (Δ {avg_improvement:+.3f})")
    print(f"  Speckle avg acc:    {speckle_orig:.3f} → {speckle_robust:.3f} (Δ {speckle_robust - speckle_orig:+.3f})")
    print()

    if clean_drop > -0.03 and avg_improvement > 0.05:
        print("  VERDICT: Robustness improved with minimal clean accuracy loss")
    elif clean_drop > -0.03 and avg_improvement > 0:
        print("  VERDICT: Marginal robustness improvement, clean accuracy maintained")
    elif clean_drop <= -0.05:
        print("  VERDICT: Clean accuracy dropped too much — augmentation too aggressive")
    else:
        print("  VERDICT: Mixed results — check per-degradation breakdown")

    print("=" * 60)

    # Save results
    save_dir = Path("results/robust")
    save_dir.mkdir(parents=True, exist_ok=True)
    with open(save_dir / "comparison.json", "w") as f:
        json.dump({"original": orig_results, "robust": robust_results}, f, indent=2)
    print(f"\nResults saved to {save_dir / 'comparison.json'}")


if __name__ == "__main__":
    main()
