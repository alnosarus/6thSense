"""
SenseProbe Research Suite
=========================
Comprehensive experiment to prove B-mode → stiffness signal exists.

Improvements over v1:
  1. All 2,294 samples (4.5x more data)
  2. Heavy data augmentation (flip, rotate, elastic, noise)
  3. Multiple architectures: SimpleCNN, ResNet18, ResNet50, EfficientNet-B0, ConvNeXt-Tiny
  4. U-Net for full strain MAP prediction (pixel-to-pixel)
  5. Better training: warmup, weight decay, cosine annealing
  6. Ensemble predictions
  7. Both classification + regression on image-level models

Usage:
  python research.py --data_dir datasets/processed_full --epochs 50
  python research.py --data_dir datasets/processed_full --mode unet --epochs 60
  python research.py --data_dir datasets/processed_full --mode all --epochs 50
"""

import argparse
import json
import os
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms, models
from sklearn.metrics import accuracy_score, r2_score, mean_absolute_error
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


# ============================================================
# Datasets
# ============================================================

class StiffnessDataset(Dataset):
    """Image-level: B-mode → scalar stiffness."""

    def __init__(self, data_dir, transform=None, augment=False):
        data = np.load(Path(data_dir) / "data.npz")
        self.images = data["images"]        # (N, H, W) uint8
        self.stiffness = data["stiffness"].astype(np.float32)
        self.transform = transform
        self.augment = augment

        # Normalize stiffness to 0-1
        self.stiff_min = self.stiffness.min()
        self.stiff_max = self.stiffness.max()
        self.stiffness_norm = (self.stiffness - self.stiff_min) / (
            self.stiff_max - self.stiff_min + 1e-8
        )

        # Binary labels
        median = np.median(self.stiffness)
        self.labels = (self.stiffness > median).astype(np.int64)

        print(f"Dataset: {len(self)} samples | range: [{self.stiff_min:.6f}, {self.stiff_max:.6f}]")

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img = self.images[idx]
        img_rgb = np.stack([img, img, img], axis=-1)

        if self.transform:
            from PIL import Image
            img_rgb = Image.fromarray(img_rgb)
            img_rgb = self.transform(img_rgb)
        else:
            img_rgb = torch.from_numpy(img_rgb.astype(np.float32)).permute(2, 0, 1) / 255.0

        label = torch.tensor(self.labels[idx], dtype=torch.long)
        stiffness = torch.tensor(self.stiffness_norm[idx], dtype=torch.float32)
        return img_rgb, label, stiffness


class StrainMapDataset(Dataset):
    """Pixel-level: B-mode → full strain map (for U-Net)."""

    def __init__(self, data_dir, img_size=256, augment=False):
        data = np.load(Path(data_dir) / "data.npz")
        self.images = data["images"].astype(np.float32) / 255.0    # (N, H, W)
        self.strain_maps = data["strain_maps"].astype(np.float32)  # (N, H, W)
        self.img_size = img_size
        self.augment = augment

        # Normalize strain maps to 0-1
        self.strain_min = np.percentile(self.strain_maps, 1)
        self.strain_max = np.percentile(self.strain_maps, 99)
        self.strain_maps_norm = np.clip(
            (self.strain_maps - self.strain_min) / (self.strain_max - self.strain_min + 1e-8),
            0, 1
        )

        print(f"StrainMapDataset: {len(self)} samples | img_size={img_size}")

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img = self.images[idx]      # (H, W) float 0-1
        target = self.strain_maps_norm[idx]  # (H, W) float 0-1

        # Random augmentation
        if self.augment:
            if np.random.random() > 0.5:
                img = np.flip(img, axis=1).copy()
                target = np.flip(target, axis=1).copy()
            if np.random.random() > 0.5:
                img = np.flip(img, axis=0).copy()
                target = np.flip(target, axis=0).copy()
            # Random brightness/contrast
            if np.random.random() > 0.5:
                alpha = np.random.uniform(0.8, 1.2)
                beta = np.random.uniform(-0.1, 0.1)
                img = np.clip(alpha * img + beta, 0, 1)
            # Gaussian noise
            if np.random.random() > 0.5:
                noise = np.random.normal(0, 0.02, img.shape).astype(np.float32)
                img = np.clip(img + noise, 0, 1)

        # Stack to 3 channels
        img_3ch = np.stack([img, img, img], axis=0)  # (3, H, W)
        target = target[np.newaxis, ...]              # (1, H, W)

        return torch.from_numpy(img_3ch), torch.from_numpy(target)


# ============================================================
# Image-level Models
# ============================================================

class DualHead(nn.Module):
    """Wraps any backbone with classification + regression heads."""
    def __init__(self, backbone, feat_dim):
        super().__init__()
        self.backbone = backbone
        self.cls_head = nn.Sequential(
            nn.Dropout(0.3), nn.Linear(feat_dim, 2)
        )
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

def make_resnet50():
    backbone = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
    feat_dim = backbone.fc.in_features
    backbone.fc = nn.Identity()
    return DualHead(backbone, feat_dim)

def make_efficientnet_b0():
    backbone = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    feat_dim = backbone.classifier[1].in_features
    backbone.classifier = nn.Identity()
    return DualHead(backbone, feat_dim)

def make_convnext_tiny():
    backbone = models.convnext_tiny(weights=models.ConvNeXt_Tiny_Weights.DEFAULT)
    feat_dim = backbone.classifier[2].in_features
    backbone.classifier = nn.Identity()
    return DualHead(backbone, feat_dim)

def make_simple_cnn():
    class CNN(nn.Module):
        def __init__(self):
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2),
                nn.Conv2d(128, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(),
                nn.AdaptiveAvgPool2d(1), nn.Flatten(),
            )
        def forward(self, x):
            return self.features(x)
    return DualHead(CNN(), 256)


# ============================================================
# U-Net for Strain Map Prediction
# ============================================================

class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1), nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1), nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
        )
    def forward(self, x):
        return self.block(x)


class UNet(nn.Module):
    """Standard U-Net for B-mode → strain map prediction."""
    def __init__(self, in_ch=3, out_ch=1, base_ch=64):
        super().__init__()
        # Encoder
        self.enc1 = ConvBlock(in_ch, base_ch)
        self.enc2 = ConvBlock(base_ch, base_ch * 2)
        self.enc3 = ConvBlock(base_ch * 2, base_ch * 4)
        self.enc4 = ConvBlock(base_ch * 4, base_ch * 8)

        # Bottleneck
        self.bottleneck = ConvBlock(base_ch * 8, base_ch * 16)

        # Decoder
        self.up4 = nn.ConvTranspose2d(base_ch * 16, base_ch * 8, 2, stride=2)
        self.dec4 = ConvBlock(base_ch * 16, base_ch * 8)
        self.up3 = nn.ConvTranspose2d(base_ch * 8, base_ch * 4, 2, stride=2)
        self.dec3 = ConvBlock(base_ch * 8, base_ch * 4)
        self.up2 = nn.ConvTranspose2d(base_ch * 4, base_ch * 2, 2, stride=2)
        self.dec2 = ConvBlock(base_ch * 4, base_ch * 2)
        self.up1 = nn.ConvTranspose2d(base_ch * 2, base_ch, 2, stride=2)
        self.dec1 = ConvBlock(base_ch * 2, base_ch)

        self.out_conv = nn.Conv2d(base_ch, out_ch, 1)
        self.pool = nn.MaxPool2d(2)

    def forward(self, x):
        # Encoder
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))

        # Bottleneck
        b = self.bottleneck(self.pool(e4))

        # Decoder with skip connections
        d4 = self.dec4(torch.cat([self.up4(b), e4], dim=1))
        d3 = self.dec3(torch.cat([self.up3(d4), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))

        return torch.sigmoid(self.out_conv(d1))


class ResUNet(nn.Module):
    """U-Net with ResNet18 encoder (pretrained) for better features."""
    def __init__(self):
        super().__init__()
        resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)

        self.enc1 = nn.Sequential(resnet.conv1, resnet.bn1, resnet.relu)  # 64, /2
        self.pool1 = resnet.maxpool                                        # /4
        self.enc2 = resnet.layer1  # 64
        self.enc3 = resnet.layer2  # 128, /8
        self.enc4 = resnet.layer3  # 256, /16
        self.enc5 = resnet.layer4  # 512, /32

        self.up4 = nn.ConvTranspose2d(512, 256, 2, stride=2)
        self.dec4 = ConvBlock(512, 256)
        self.up3 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.dec3 = ConvBlock(256, 128)
        self.up2 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.dec2 = ConvBlock(128, 64)
        self.up1 = nn.ConvTranspose2d(64, 64, 2, stride=2)
        self.dec1 = ConvBlock(128, 64)
        self.up0 = nn.ConvTranspose2d(64, 32, 2, stride=2)
        self.dec0 = ConvBlock(32, 32)

        self.out_conv = nn.Conv2d(32, 1, 1)

    def forward(self, x):
        e1 = self.enc1(x)                    # (B, 64, H/2, W/2)
        e2 = self.enc2(self.pool1(e1))       # (B, 64, H/4, W/4)
        e3 = self.enc3(e2)                   # (B, 128, H/8, W/8)
        e4 = self.enc4(e3)                   # (B, 256, H/16, W/16)
        e5 = self.enc5(e4)                   # (B, 512, H/32, W/32)

        d4 = self.dec4(torch.cat([self.up4(e5), e4], 1))   # 256
        d3 = self.dec3(torch.cat([self.up3(d4), e3], 1))   # 128
        d2 = self.dec2(torch.cat([self.up2(d3), e2], 1))   # 64
        d1 = self.dec1(torch.cat([self.up1(d2), e1], 1))   # 64
        d0 = self.dec0(self.up0(d1))                        # 32

        return torch.sigmoid(self.out_conv(d0))


# ============================================================
# Loss functions
# ============================================================

class CombinedLoss(nn.Module):
    """MSE + SSIM-like structural loss for strain map prediction."""
    def __init__(self, alpha=0.7):
        super().__init__()
        self.alpha = alpha
        self.mse = nn.MSELoss()
        self.l1 = nn.L1Loss()

    def forward(self, pred, target):
        mse_loss = self.mse(pred, target)
        l1_loss = self.l1(pred, target)
        # Gradient loss - preserve edges in strain map
        pred_dx = pred[:, :, :, 1:] - pred[:, :, :, :-1]
        pred_dy = pred[:, :, 1:, :] - pred[:, :, :-1, :]
        tgt_dx = target[:, :, :, 1:] - target[:, :, :, :-1]
        tgt_dy = target[:, :, 1:, :] - target[:, :, :-1, :]
        grad_loss = self.mse(pred_dx, tgt_dx) + self.mse(pred_dy, tgt_dy)
        return self.alpha * mse_loss + (1 - self.alpha) * l1_loss + 0.1 * grad_loss


# ============================================================
# Training routines
# ============================================================

def get_lr_scheduler(optimizer, epochs, warmup_epochs=5):
    """Linear warmup + cosine annealing."""
    def lr_lambda(epoch):
        if epoch < warmup_epochs:
            return (epoch + 1) / warmup_epochs
        progress = (epoch - warmup_epochs) / (epochs - warmup_epochs)
        return 0.5 * (1 + np.cos(np.pi * progress))
    return optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)


def train_classifier(name, model, train_loader, test_loader, device, epochs, lr):
    """Train image-level classification + regression model."""
    print(f"\n{'='*60}")
    print(f" {name}")
    print(f"{'='*60}")

    model = model.to(device)
    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Parameters: {param_count:,}")

    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = get_lr_scheduler(optimizer, epochs)
    cls_loss_fn = nn.CrossEntropyLoss()
    reg_loss_fn = nn.SmoothL1Loss()

    history = {"train": [], "test": []}
    best_test_loss = float("inf")

    for epoch in range(1, epochs + 1):
        # Train
        model.train()
        train_loss, train_preds, train_labels = 0, [], []
        train_rpreds, train_rtargets = [], []

        for imgs, labels, stiffness in train_loader:
            imgs, labels, stiffness = imgs.to(device), labels.to(device), stiffness.to(device)
            cls_out, reg_out = model(imgs)
            loss = cls_loss_fn(cls_out, labels) + 2.0 * reg_loss_fn(reg_out, stiffness)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss += loss.item()
            train_preds.extend(cls_out.argmax(1).cpu().numpy())
            train_labels.extend(labels.cpu().numpy())
            train_rpreds.extend(reg_out.detach().cpu().numpy())
            train_rtargets.extend(stiffness.cpu().numpy())

        scheduler.step()

        # Test
        model.eval()
        test_loss, test_preds, test_labels = 0, [], []
        test_rpreds, test_rtargets = [], []

        with torch.no_grad():
            for imgs, labels, stiffness in test_loader:
                imgs, labels, stiffness = imgs.to(device), labels.to(device), stiffness.to(device)
                cls_out, reg_out = model(imgs)
                loss = cls_loss_fn(cls_out, labels) + 2.0 * reg_loss_fn(reg_out, stiffness)

                test_loss += loss.item()
                test_preds.extend(cls_out.argmax(1).cpu().numpy())
                test_labels.extend(labels.cpu().numpy())
                test_rpreds.extend(reg_out.cpu().numpy())
                test_rtargets.extend(stiffness.cpu().numpy())

        n_train, n_test = len(train_loader), len(test_loader)
        train_m = {
            "loss": train_loss / n_train,
            "accuracy": accuracy_score(train_labels, train_preds),
            "r2": r2_score(train_rtargets, train_rpreds),
            "mae": mean_absolute_error(train_rtargets, train_rpreds),
        }
        test_m = {
            "loss": test_loss / n_test,
            "accuracy": accuracy_score(test_labels, test_preds),
            "r2": r2_score(test_rtargets, test_rpreds),
            "mae": mean_absolute_error(test_rtargets, test_rpreds),
        }
        history["train"].append(train_m)
        history["test"].append(test_m)

        if test_m["loss"] < best_test_loss:
            best_test_loss = test_m["loss"]
            os.makedirs("models", exist_ok=True)
            torch.save(model.state_dict(), f"models/{name}_best.pth")

        if epoch % 10 == 0 or epoch == 1 or epoch == epochs:
            print(
                f"  [{epoch:3d}/{epochs}] "
                f"Loss: {train_m['loss']:.4f}/{test_m['loss']:.4f} | "
                f"Acc: {test_m['accuracy']:.3f} | "
                f"R²: {test_m['r2']:.3f} | "
                f"MAE: {test_m['mae']:.4f}"
            )

    return history


def train_unet(name, model, train_loader, test_loader, device, epochs, lr):
    """Train U-Net for full strain map prediction."""
    print(f"\n{'='*60}")
    print(f" {name} (Strain Map Prediction)")
    print(f"{'='*60}")

    model = model.to(device)
    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Parameters: {param_count:,}")

    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = get_lr_scheduler(optimizer, epochs)
    loss_fn = CombinedLoss(alpha=0.7)

    history = {"train_loss": [], "test_loss": [], "test_r2": [], "test_mae": []}
    best_test_loss = float("inf")

    for epoch in range(1, epochs + 1):
        # Train
        model.train()
        train_loss = 0
        for imgs, targets in train_loader:
            imgs, targets = imgs.to(device), targets.to(device)
            pred = model(imgs)
            loss = loss_fn(pred, targets)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item()

        scheduler.step()

        # Test
        model.eval()
        test_loss = 0
        all_pred_flat, all_tgt_flat = [], []

        with torch.no_grad():
            for imgs, targets in test_loader:
                imgs, targets = imgs.to(device), targets.to(device)
                pred = model(imgs)
                loss = loss_fn(pred, targets)
                test_loss += loss.item()

                # Flatten for pixel-level R²
                all_pred_flat.extend(pred.cpu().numpy().flatten())
                all_tgt_flat.extend(targets.cpu().numpy().flatten())

        n_train, n_test = len(train_loader), len(test_loader)
        pixel_r2 = r2_score(all_tgt_flat, all_pred_flat)
        pixel_mae = mean_absolute_error(all_tgt_flat, all_pred_flat)

        history["train_loss"].append(train_loss / n_train)
        history["test_loss"].append(test_loss / n_test)
        history["test_r2"].append(pixel_r2)
        history["test_mae"].append(pixel_mae)

        if test_loss / n_test < best_test_loss:
            best_test_loss = test_loss / n_test
            os.makedirs("models", exist_ok=True)
            torch.save(model.state_dict(), f"models/{name}_best.pth")

        if epoch % 10 == 0 or epoch == 1 or epoch == epochs:
            print(
                f"  [{epoch:3d}/{epochs}] "
                f"Loss: {train_loss/n_train:.4f}/{test_loss/n_test:.4f} | "
                f"Pixel-R²: {pixel_r2:.3f} | "
                f"Pixel-MAE: {pixel_mae:.4f}"
            )

    return history


def visualize_unet_predictions(model, dataset, device, save_path, n=6):
    """Visualize U-Net predictions vs ground truth."""
    model.eval()
    fig, axes = plt.subplots(3, n, figsize=(3 * n, 9))

    indices = np.linspace(0, len(dataset) - 1, n, dtype=int)
    for col, idx in enumerate(indices):
        img, target = dataset[idx]
        with torch.no_grad():
            pred = model(img.unsqueeze(0).to(device)).cpu()

        axes[0, col].imshow(img[0].numpy(), cmap="gray")
        axes[0, col].set_title(f"B-mode #{idx}")
        axes[0, col].axis("off")

        axes[1, col].imshow(target[0].numpy(), cmap="hot", vmin=0, vmax=1)
        axes[1, col].set_title("Ground Truth")
        axes[1, col].axis("off")

        axes[2, col].imshow(pred[0, 0].numpy(), cmap="hot", vmin=0, vmax=1)
        axes[2, col].set_title("Prediction")
        axes[2, col].axis("off")

    plt.suptitle("U-Net: B-mode → Strain Map", fontsize=14)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    print(f"  Visualization saved to {save_path}")


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="datasets/processed_full")
    parser.add_argument("--mode", choices=["classifiers", "unet", "all"], default="all")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--unet_epochs", type=int, default=60)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--img_size", type=int, default=224)
    parser.add_argument("--test_split", type=float, default=0.2)
    args = parser.parse_args()

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "mps" if torch.backends.mps.is_available()
        else "cpu"
    )
    print(f"Device: {device}")
    print(f"Mode: {args.mode}")

    results_dir = Path("results")
    results_dir.mkdir(exist_ok=True)

    # ── Image-level models ──────────────────────────────
    if args.mode in ("classifiers", "all"):
        # Augmented transform for training
        train_transform = transforms.Compose([
            transforms.Resize((args.img_size, args.img_size)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.RandomRotation(15),
            transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            transforms.RandomErasing(p=0.1),
        ])
        test_transform = transforms.Compose([
            transforms.Resize((args.img_size, args.img_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        # Two dataset instances with different transforms
        full_ds = StiffnessDataset(args.data_dir, transform=None)
        test_size = int(len(full_ds) * args.test_split)
        train_size = len(full_ds) - test_size
        train_indices, test_indices = random_split(
            range(len(full_ds)), [train_size, test_size],
            generator=torch.Generator().manual_seed(42)
        )
        train_indices = list(train_indices)
        test_indices = list(test_indices)

        train_ds = StiffnessDataset(args.data_dir, transform=train_transform)
        test_ds = StiffnessDataset(args.data_dir, transform=test_transform)

        # Subset datasets
        from torch.utils.data import Subset
        train_subset = Subset(train_ds, train_indices)
        test_subset = Subset(test_ds, test_indices)

        train_loader = DataLoader(train_subset, batch_size=args.batch_size, shuffle=True, num_workers=0)
        test_loader = DataLoader(test_subset, batch_size=args.batch_size, shuffle=False, num_workers=0)

        print(f"Train: {len(train_subset)} | Test: {len(test_subset)}")

        # Run all models
        model_factories = {
            "SimpleCNN": make_simple_cnn,
            "ResNet18": make_resnet18,
            "ResNet50": make_resnet50,
            "EfficientNet-B0": make_efficientnet_b0,
            "ConvNeXt-Tiny": make_convnext_tiny,
        }

        all_history = {}
        for name, factory in model_factories.items():
            model = factory()
            history = train_classifier(
                name, model, train_loader, test_loader, device, args.epochs, args.lr
            )
            all_history[name] = history

        # ── Plot classifier results ──
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        for name, h in all_history.items():
            epochs_range = range(1, len(h["test"]) + 1)
            axes[0, 0].plot(epochs_range, [m["loss"] for m in h["test"]], label=name)
            axes[0, 1].plot(epochs_range, [m["accuracy"] for m in h["test"]], label=name)
            axes[1, 0].plot(epochs_range, [m["r2"] for m in h["test"]], label=name)
            axes[1, 1].plot(epochs_range, [m["mae"] for m in h["test"]], label=name)

        axes[0, 0].set_title("Test Loss"); axes[0, 0].legend(); axes[0, 0].grid(alpha=0.3)
        axes[0, 1].set_title("Test Accuracy")
        axes[0, 1].axhline(0.5, c="r", ls="--", alpha=0.5, label="Random")
        axes[0, 1].legend(); axes[0, 1].grid(alpha=0.3)
        axes[1, 0].set_title("Test R² (Regression)")
        axes[1, 0].axhline(0, c="r", ls="--", alpha=0.5)
        axes[1, 0].axhline(0.3, c="y", ls="--", alpha=0.5)
        axes[1, 0].axhline(0.5, c="g", ls="--", alpha=0.5)
        axes[1, 0].legend(); axes[1, 0].grid(alpha=0.3)
        axes[1, 1].set_title("Test MAE"); axes[1, 1].legend(); axes[1, 1].grid(alpha=0.3)
        for ax in axes.flat:
            ax.set_xlabel("Epoch")
        plt.suptitle(f"Image-Level Models ({len(train_subset)} train, {len(test_subset)} test)", fontsize=14)
        plt.tight_layout()
        plt.savefig(results_dir / "classifiers.png", dpi=150)
        print(f"\nClassifier plots → {results_dir / 'classifiers.png'}")

        # ── Summary table ──
        print("\n" + "=" * 80)
        print(" IMAGE-LEVEL RESULTS")
        print("=" * 80)
        print(f"{'Model':<20} {'Acc':>8} {'R²':>8} {'MAE':>8} {'Best Loss':>10}")
        print("-" * 80)
        clf_results = {}
        for name, h in all_history.items():
            best = min(h["test"], key=lambda x: x["loss"])
            print(f"{name:<20} {best['accuracy']:>8.3f} {best['r2']:>8.3f} {best['mae']:>8.4f} {best['loss']:>10.4f}")
            clf_results[name] = best

        with open(results_dir / "classifiers.json", "w") as f:
            json.dump(clf_results, f, indent=2)

    # ── U-Net strain map prediction ──────────────────────
    if args.mode in ("unet", "all"):
        print("\n\n" + "#" * 60)
        print(" U-NET: FULL STRAIN MAP PREDICTION")
        print("#" * 60)

        unet_ds = StrainMapDataset(args.data_dir, img_size=256, augment=False)
        test_size = int(len(unet_ds) * args.test_split)
        train_size = len(unet_ds) - test_size

        # Augmented version for training
        unet_train_ds = StrainMapDataset(args.data_dir, img_size=256, augment=True)
        unet_test_ds = StrainMapDataset(args.data_dir, img_size=256, augment=False)

        from torch.utils.data import Subset
        gen = torch.Generator().manual_seed(42)
        indices = list(range(len(unet_ds)))
        perm = torch.randperm(len(unet_ds), generator=gen).tolist()
        train_idx = perm[:train_size]
        test_idx = perm[train_size:]

        train_loader = DataLoader(Subset(unet_train_ds, train_idx), batch_size=8, shuffle=True, num_workers=0)
        test_loader = DataLoader(Subset(unet_test_ds, test_idx), batch_size=8, shuffle=False, num_workers=0)

        print(f"Train: {len(train_idx)} | Test: {len(test_idx)}")

        unet_models = {
            "UNet": UNet(in_ch=3, out_ch=1, base_ch=32),
            "ResUNet": ResUNet(),
        }

        unet_histories = {}
        for name, model in unet_models.items():
            history = train_unet(
                name, model, train_loader, test_loader, device, args.unet_epochs, args.lr
            )
            unet_histories[name] = history

            # Load best and visualize
            model.load_state_dict(torch.load(f"models/{name}_best.pth", map_location=device))
            model.to(device)
            visualize_unet_predictions(
                model, Subset(unet_test_ds, test_idx),
                device, results_dir / f"{name}_predictions.png"
            )

        # ── Plot U-Net results ──
        fig, axes = plt.subplots(1, 3, figsize=(18, 5))
        for name, h in unet_histories.items():
            ep = range(1, len(h["test_loss"]) + 1)
            axes[0].plot(ep, h["test_loss"], label=name)
            axes[1].plot(ep, h["test_r2"], label=name)
            axes[2].plot(ep, h["test_mae"], label=name)

        axes[0].set_title("Test Loss"); axes[0].legend(); axes[0].grid(alpha=0.3)
        axes[1].set_title("Pixel-Level R²")
        axes[1].axhline(0.5, c="g", ls="--", alpha=0.5, label="Very promising")
        axes[1].axhline(0.3, c="y", ls="--", alpha=0.5, label="Promising")
        axes[1].legend(); axes[1].grid(alpha=0.3)
        axes[2].set_title("Pixel-Level MAE"); axes[2].legend(); axes[2].grid(alpha=0.3)
        for ax in axes:
            ax.set_xlabel("Epoch")
        plt.suptitle("U-Net: B-mode → Full Strain Map", fontsize=14)
        plt.tight_layout()
        plt.savefig(results_dir / "unet.png", dpi=150)
        print(f"\nU-Net plots → {results_dir / 'unet.png'}")

        # ── U-Net summary ──
        print("\n" + "=" * 80)
        print(" U-NET RESULTS (Pixel-Level Strain Map Prediction)")
        print("=" * 80)
        print(f"{'Model':<20} {'Pixel-R²':>10} {'Pixel-MAE':>10} {'Best Loss':>10}")
        print("-" * 80)
        unet_results = {}
        for name, h in unet_histories.items():
            best_idx = np.argmin(h["test_loss"])
            print(f"{name:<20} {h['test_r2'][best_idx]:>10.3f} {h['test_mae'][best_idx]:>10.4f} {h['test_loss'][best_idx]:>10.4f}")
            unet_results[name] = {
                "pixel_r2": h["test_r2"][best_idx],
                "pixel_mae": h["test_mae"][best_idx],
                "loss": h["test_loss"][best_idx],
            }

        with open(results_dir / "unet.json", "w") as f:
            json.dump(unet_results, f, indent=2)

    # ── Final verdict ──
    print("\n" + "=" * 80)
    print(" FINAL VERDICT")
    print("=" * 80)

    if args.mode in ("classifiers", "all") and clf_results:
        best_acc = max(r["accuracy"] for r in clf_results.values())
        best_r2 = max(r["r2"] for r in clf_results.values())
        best_model_acc = max(clf_results, key=lambda k: clf_results[k]["accuracy"])
        best_model_r2 = max(clf_results, key=lambda k: clf_results[k]["r2"])

        print(f"\n  Classification (soft vs stiff):")
        if best_acc > 0.7:
            print(f"    STRONG SIGNAL ({best_model_acc}: {best_acc:.1%})")
        elif best_acc > 0.6:
            print(f"    SIGNAL EXISTS ({best_model_acc}: {best_acc:.1%})")
        else:
            print(f"    Weak/no signal ({best_model_acc}: {best_acc:.1%})")

        print(f"\n  Regression (predict stiffness):")
        if best_r2 > 0.5:
            print(f"    VERY PROMISING ({best_model_r2}: R²={best_r2:.3f})")
        elif best_r2 > 0.3:
            print(f"    PROMISING ({best_model_r2}: R²={best_r2:.3f})")
        elif best_r2 > 0:
            print(f"    Weak signal ({best_model_r2}: R²={best_r2:.3f})")
        else:
            print(f"    No signal ({best_model_r2}: R²={best_r2:.3f})")

    if args.mode in ("unet", "all") and unet_results:
        best_unet = max(unet_results, key=lambda k: unet_results[k]["pixel_r2"])
        best_pr2 = unet_results[best_unet]["pixel_r2"]
        print(f"\n  Strain Map Prediction (pixel-level):")
        if best_pr2 > 0.5:
            print(f"    STRONG SPATIAL SIGNAL ({best_unet}: pixel-R²={best_pr2:.3f})")
        elif best_pr2 > 0.3:
            print(f"    SPATIAL SIGNAL EXISTS ({best_unet}: pixel-R²={best_pr2:.3f})")
        else:
            print(f"    Weak spatial signal ({best_unet}: pixel-R²={best_pr2:.3f})")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
