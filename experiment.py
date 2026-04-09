"""
SenseProbe ML Experiment
========================
Can a B-mode ultrasound image predict tissue stiffness?

Runs 3 models (ResNet18, EfficientNet-B0, SimpleCNN) on both:
  - Classification: soft vs stiff (binary, median split)
  - Regression: predict normalized stiffness (0-1)

Uses 80/20 train/test split on all available data.

Usage:
  python experiment.py --data_dir datasets/processed --epochs 30
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
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms, models
from sklearn.metrics import accuracy_score, r2_score, mean_absolute_error
from tqdm import tqdm
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


# ============================================================
# Dataset
# ============================================================

class StiffnessDataset(Dataset):
    """Loads preprocessed B-mode images + stiffness labels from data.npz."""

    def __init__(self, data_dir, transform=None):
        data = np.load(Path(data_dir) / "data.npz")
        self.images = data["images"]        # (N, H, W) uint8
        self.stiffness = data["stiffness"].astype(np.float32)  # (N,)
        self.transform = transform

        # Normalize stiffness to 0-1 for regression
        self.stiff_min = self.stiffness.min()
        self.stiff_max = self.stiffness.max()
        self.stiffness_norm = (self.stiffness - self.stiff_min) / (
            self.stiff_max - self.stiff_min + 1e-8
        )

        # Binary labels: above median = stiff (1), below = soft (0)
        median = np.median(self.stiffness)
        self.labels = (self.stiffness > median).astype(np.int64)

        print(f"Dataset: {len(self)} samples")
        print(f"  Stiffness range: {self.stiff_min:.6f} - {self.stiff_max:.6f}")
        print(f"  Class split: {(self.labels==0).sum()} soft / {(self.labels==1).sum()} stiff")

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img = self.images[idx]  # (H, W) uint8

        # Stack to 3 channels for pretrained models
        img_rgb = np.stack([img, img, img], axis=-1)  # (H, W, 3)

        if self.transform:
            from PIL import Image
            img_rgb = Image.fromarray(img_rgb)
            img_rgb = self.transform(img_rgb)
        else:
            img_rgb = torch.from_numpy(img_rgb.astype(np.float32)).permute(2, 0, 1) / 255.0

        label = torch.tensor(self.labels[idx], dtype=torch.long)
        stiffness = torch.tensor(self.stiffness_norm[idx], dtype=torch.float32)

        return img_rgb, label, stiffness


# ============================================================
# Models
# ============================================================

class SimpleCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(128, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(),
            nn.AdaptiveAvgPool2d(4),
        )
        feat_dim = 256 * 4 * 4
        self.cls_head = nn.Sequential(
            nn.Flatten(), nn.Linear(feat_dim, 256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 2),
        )
        self.reg_head = nn.Sequential(
            nn.Flatten(), nn.Linear(feat_dim, 256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 1), nn.Sigmoid(),
        )

    def forward(self, x):
        feat = self.features(x)
        return self.cls_head(feat), self.reg_head(feat).squeeze(-1)


class DualHeadResNet(nn.Module):
    def __init__(self):
        super().__init__()
        backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        feat_dim = backbone.fc.in_features
        backbone.fc = nn.Identity()
        self.backbone = backbone
        self.cls_head = nn.Linear(feat_dim, 2)
        self.reg_head = nn.Sequential(nn.Linear(feat_dim, 1), nn.Sigmoid())

    def forward(self, x):
        feat = self.backbone(x)
        return self.cls_head(feat), self.reg_head(feat).squeeze(-1)


class DualHeadEfficientNet(nn.Module):
    def __init__(self):
        super().__init__()
        backbone = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        feat_dim = backbone.classifier[1].in_features
        backbone.classifier = nn.Identity()
        self.backbone = backbone
        self.cls_head = nn.Linear(feat_dim, 2)
        self.reg_head = nn.Sequential(nn.Linear(feat_dim, 1), nn.Sigmoid())

    def forward(self, x):
        feat = self.backbone(x)
        return self.cls_head(feat), self.reg_head(feat).squeeze(-1)


# ============================================================
# Training
# ============================================================

def train_epoch(model, loader, optimizer, device, cls_w=1.0, reg_w=1.0):
    model.train()
    total_loss = 0
    cls_criterion = nn.CrossEntropyLoss()
    reg_criterion = nn.MSELoss()
    all_preds, all_labels = [], []
    all_rpreds, all_rtargets = [], []

    for imgs, labels, stiffness in loader:
        imgs = imgs.to(device)
        labels = labels.to(device)
        stiffness = stiffness.to(device)

        cls_out, reg_out = model(imgs)
        loss = cls_w * cls_criterion(cls_out, labels) + reg_w * reg_criterion(reg_out, stiffness)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        all_preds.extend(cls_out.argmax(1).cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_rpreds.extend(reg_out.detach().cpu().numpy())
        all_rtargets.extend(stiffness.cpu().numpy())

    n = len(loader)
    return {
        "loss": total_loss / n,
        "accuracy": accuracy_score(all_labels, all_preds),
        "r2": r2_score(all_rtargets, all_rpreds),
        "mae": mean_absolute_error(all_rtargets, all_rpreds),
    }


@torch.no_grad()
def evaluate(model, loader, device, cls_w=1.0, reg_w=1.0):
    model.eval()
    total_loss = 0
    cls_criterion = nn.CrossEntropyLoss()
    reg_criterion = nn.MSELoss()
    all_preds, all_labels = [], []
    all_rpreds, all_rtargets = [], []

    for imgs, labels, stiffness in loader:
        imgs = imgs.to(device)
        labels = labels.to(device)
        stiffness = stiffness.to(device)

        cls_out, reg_out = model(imgs)
        loss = cls_w * cls_criterion(cls_out, labels) + reg_w * reg_criterion(reg_out, stiffness)

        total_loss += loss.item()
        all_preds.extend(cls_out.argmax(1).cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_rpreds.extend(reg_out.cpu().numpy())
        all_rtargets.extend(stiffness.cpu().numpy())

    n = len(loader)
    return {
        "loss": total_loss / n,
        "accuracy": accuracy_score(all_labels, all_preds),
        "r2": r2_score(all_rtargets, all_rpreds),
        "mae": mean_absolute_error(all_rtargets, all_rpreds),
    }


def run_model(name, model, train_loader, test_loader, device, epochs, lr):
    print(f"\n{'='*60}")
    print(f" {name}")
    print(f"{'='*60}")

    model = model.to(device)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = {"train": [], "test": []}
    best_test_loss = float("inf")

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        train_m = train_epoch(model, train_loader, optimizer, device)
        test_m = evaluate(model, test_loader, device)
        scheduler.step()
        elapsed = time.time() - t0

        history["train"].append(train_m)
        history["test"].append(test_m)

        if test_m["loss"] < best_test_loss:
            best_test_loss = test_m["loss"]
            os.makedirs("models", exist_ok=True)
            torch.save(model.state_dict(), f"models/{name}_best.pth")

        if epoch % 5 == 0 or epoch == 1:
            print(
                f"  Epoch {epoch:3d}/{epochs} ({elapsed:.1f}s) | "
                f"Loss: {train_m['loss']:.4f}/{test_m['loss']:.4f} | "
                f"Acc: {test_m['accuracy']:.3f} | "
                f"R²: {test_m['r2']:.3f} | "
                f"MAE: {test_m['mae']:.4f}"
            )

    return history


# ============================================================
# Plotting
# ============================================================

def plot_all(all_history, save_dir="."):
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    for name, h in all_history.items():
        epochs = range(1, len(h["test"]) + 1)
        axes[0, 0].plot(epochs, [m["loss"] for m in h["test"]], label=name)
        axes[0, 1].plot(epochs, [m["accuracy"] for m in h["test"]], label=name)
        axes[1, 0].plot(epochs, [m["r2"] for m in h["test"]], label=name)
        axes[1, 1].plot(epochs, [m["mae"] for m in h["test"]], label=name)

    axes[0, 0].set_title("Test Loss"); axes[0, 0].legend()
    axes[0, 1].set_title("Test Accuracy (Classification)")
    axes[0, 1].axhline(0.5, c="r", ls="--", alpha=0.5, label="Random")
    axes[0, 1].axhline(0.6, c="g", ls="--", alpha=0.5, label="Signal threshold")
    axes[0, 1].legend()
    axes[1, 0].set_title("Test R² (Regression)")
    axes[1, 0].axhline(0.0, c="r", ls="--", alpha=0.5, label="No signal")
    axes[1, 0].axhline(0.3, c="y", ls="--", alpha=0.5, label="Promising")
    axes[1, 0].axhline(0.5, c="g", ls="--", alpha=0.5, label="Very promising")
    axes[1, 0].legend()
    axes[1, 1].set_title("Test MAE (Regression)")
    axes[1, 1].legend()

    for ax in axes.flat:
        ax.set_xlabel("Epoch")
        ax.grid(True, alpha=0.3)

    plt.suptitle("SenseProbe: Can B-mode ultrasound predict stiffness?", fontsize=14)
    plt.tight_layout()
    plt.savefig(Path(save_dir) / "results.png", dpi=150)
    print(f"\nPlots saved to {save_dir}/results.png")


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="datasets/processed")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--img_size", type=int, default=224)
    parser.add_argument("--test_split", type=float, default=0.2)
    args = parser.parse_args()

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "mps" if torch.backends.mps.is_available()
        else "cpu"
    )
    print(f"Device: {device}")

    transform = transforms.Compose([
        transforms.Resize((args.img_size, args.img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    dataset = StiffnessDataset(args.data_dir, transform=transform)

    # 80/20 split
    test_size = int(len(dataset) * args.test_split)
    train_size = len(dataset) - test_size
    train_ds, test_ds = random_split(
        dataset, [train_size, test_size],
        generator=torch.Generator().manual_seed(42),
    )
    print(f"Train: {train_size} | Test: {test_size}")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    # Run all 3 models
    all_history = {}
    model_configs = {
        "SimpleCNN": SimpleCNN(),
        "ResNet18": DualHeadResNet(),
        "EfficientNet-B0": DualHeadEfficientNet(),
    }

    for name, model in model_configs.items():
        history = run_model(name, model, train_loader, test_loader, device, args.epochs, args.lr)
        all_history[name] = history

    # Plot results
    plot_all(all_history)

    # Final summary
    print("\n" + "=" * 70)
    print(" FINAL RESULTS")
    print("=" * 70)
    print(f"{'Model':<20} {'Accuracy':>10} {'R²':>10} {'MAE':>10} {'Loss':>10}")
    print("-" * 70)

    results = {}
    for name, h in all_history.items():
        best = min(h["test"], key=lambda x: x["loss"])
        print(f"{name:<20} {best['accuracy']:>10.3f} {best['r2']:>10.3f} {best['mae']:>10.4f} {best['loss']:>10.4f}")
        results[name] = best

    with open("results.json", "w") as f:
        json.dump(results, f, indent=2)

    # Verdict
    best_acc = max(r["accuracy"] for r in results.values())
    best_r2 = max(r["r2"] for r in results.values())

    print("\n" + "=" * 70)
    print(" VERDICT")
    print("=" * 70)

    if best_acc > 0.6:
        print(f"  Classification: SIGNAL EXISTS (acc={best_acc:.3f})")
    else:
        print(f"  Classification: weak/no signal (acc={best_acc:.3f})")

    if best_r2 > 0.5:
        print(f"  Regression:     VERY PROMISING (R²={best_r2:.3f})")
    elif best_r2 > 0.3:
        print(f"  Regression:     PROMISING (R²={best_r2:.3f})")
    elif best_r2 > 0:
        print(f"  Regression:     weak signal (R²={best_r2:.3f})")
    else:
        print(f"  Regression:     no signal (R²={best_r2:.3f})")

    print("=" * 70)


if __name__ == "__main__":
    main()
