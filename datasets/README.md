# Datasets

## Priority Order (best for our experiment)

### 1. IMPACT Lab Simulation Database (2,400 phantoms) - BEST START
- **URL**: https://www.dropbox.com/sh/3qft4y765tkhu91/AADlMzFP1y1-kLUd0xNvR6hAa?dl=0
- **What**: 2,400 simulated phantoms with hard inclusions. 24 phantom models, 100 images each at 10 strain levels.
- **Ground truth**: YES - inclusions 45-60 kPa, background ~20 kPa. Displacement ground truth included.
- **Format**: Simulated RF data (FIELD II / ABAQUS FEM)
- **Info**: https://users.encs.concordia.ca/~impact/ultrasound-elastography-simulation-database/

### 2. IMPACT Lab CIRS Phantom (2,200 real RF pairs)
- **URL**: https://www.dropbox.com/sh/ictuafvenikw95h/AAC-EqDBy3zP1J0IEngVhjgea?dl=0
- **What**: 2,200 RF data pairs from CIRS Model 059 phantom. Real acquisitions with Alpinion E-Cube R12.
- **Ground truth**: YES - background 20 kPa, inclusions ≥2x background.
- **Format**: Multi-part ZIP (extract from .zip.001)

### 3. SimForSWEI (~20,000 shear wave images)
- **URL**: https://www.synapse.org/SimForSWEI (ID: syn26532931)
- **What**: 150 shear wave propagation simulations = ~20k images. FEM-based.
- **Ground truth**: Known tissue properties from simulation.
- **Format**: Requires free Synapse account.

### 4. StrainNet (~15 GB synthetic + real)
- **URL**: https://github.com/reecehuff/StrainNet
- **What**: Synthetic + real ultrasound with strain ground truth. Includes in-vivo flexor tendon images.
- **Ground truth**: YES for synthetic (strain fields). Force correlation for experimental.
- **Download**: Run `scripts/download.sh` from the repo.

### 5. Borealis Robotically Acquired Phantom
- **URL**: https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP3/ASTGWY
- **What**: 6 acquisition sequences, controlled indentation. Includes stress-strain curves.
- **Ground truth**: YES - measured Young's modulus for phantom materials.
- **Format**: .mat (RF), PNG (B-mode), Excel (metadata)

### 6. Liver Fibrosis Ultrasound (Kaggle - proxy labels)
- **URL**: https://www.kaggle.com/datasets/vibhingupta028/liver-histopathology-fibrosis-ultrasound-images
- **What**: 4,323 B-mode images labeled F0-F4 fibrosis stages. No elastography but fibrosis correlates with stiffness.
- **Format**: JPG, ~215 MB

## Download Instructions
```bash
# Create raw data directory
mkdir -p datasets/raw

# Download into datasets/raw/ - pick one to start with
# Dataset 1 (IMPACT Simulation) is recommended for first experiment
```
