# Data layout

Large files stay **out of git**. Use `data/incoming/` for archives, `data/raw/` for extracted trees, `data/processed/` for ML-ready artifacts.

## Configuration (paths & datasets)

Layout is driven by **`config/senseprobe.defaults.yaml`** (tracked). Optional overrides:

- **`SENSEPROBE_CONFIG`**: path to an extra YAML file merged on top of defaults (e.g. copy defaults to `config/senseprobe.local.yaml`, gitignored).
- **`SENSEPROBE_DATASET`**: active dataset id (keys under `datasets:` in the YAML), used by ML scripts when you omit `--dataset`.
- **`SENSEPROBE_DATA_ROOT`**, **`SENSEPROBE_RESULTS_DIR`**, **`SENSEPROBE_MODELS_DIR`**: absolute paths or paths relative to the repo root.

To add another dataset, add a new entry under `datasets:` with `raw_slug`, `raw_extracted_subpath`, and `outputs.processed` / `outputs.processed_full`, then run with `--dataset <id>` or set `SENSEPROBE_DATASET`.

Model **run lists** for `ml/research.py` and `ml/experiment.py` live under `training:` in the same YAML (`classifiers`, `unets`, `experiment_classifiers`).

## Directory conventions

| Path | Tracked | Purpose |
|------|---------|---------|
| `data/incoming/` | No | Drop `*.zip` downloads here (optional). |
| `data/raw/` | No | Extracted datasets (e.g. TUFFC `.mat` trees). |
| `data/cache/` | No | Optional intermediates. |
| `data/processed/` | No | Outputs from `ml/prepare_data.py` (e.g. `data.npz`). |
| `data/processed_full/` | No | Full processed splits for robust training. |

## TUFFC CIRS / large zip (~30 GB)

**Do not commit** the archive. Options:

1. **Recommended:** Copy or download the zip to `data/incoming/`, then run:
   ```bash
   python scripts/setup_data.py
   ```
2. Or set an absolute path:
   ```bash
   export SENSEPROBE_DATA_ZIP=/path/to/TUFFC_2022_Bi_Directional_elasto.zip
   python scripts/setup_data.py
   ```
3. Legacy: a `*.zip` at the **repo root** is still discovered (but root clutter is discouraged).

Extraction is **idempotent**: if `data/raw/tuffc_2022_bi_directional_elasto/.extract_ok` exists, the script skips unless you pass `--force`.

After extraction, point `ml/prepare_data.py` at the folder that contains `Data_*.mat` files (often a nested `.../extracted/` path inside the archive). Example:

```bash
# Uses paths from config for dataset `tuffc_2022` (or SENSEPROBE_DATASET)
python ml/prepare_data.py

# Or override paths explicitly:
python ml/prepare_data.py \
  --raw_dir data/raw/tuffc_2022_bi_directional_elasto/TUFFC_2022_Bi_Directional_elasto/extracted \
  --output_dir data/processed
```

Adjust `--raw_dir` if your zip’s internal layout differs (`find data/raw -name 'Data_*.mat' | head`).

## External storage

For teams, prefer **S3 / GDrive / shared drive** and document the download link in your runbook—**not** Git LFS for multi‑GB zips.

---

## Other public datasets (catalog)

The following are **ideas / links** for additional data (same as the old `datasets/README` catalog).

### 1. IMPACT Lab Simulation Database (2,400 phantoms) — strong default
- **URL**: https://www.dropbox.com/sh/3qft4y765tkhu91/AADlMzFP1y1-kLUd0xNvRRehAa?dl=0
- **What**: Simulated phantoms with inclusions; strain levels; displacement GT.
- **Info**: https://users.encs.concordia.ca/~impact/ultrasound-elastography-simulation-database/

### 2. IMPACT Lab CIRS Phantom (2,200 real RF pairs)
- **URL**: https://www.dropbox.com/sh/ictuafvenikw95h/AAC-EqDBy3zP1J0IEngVhjgea?dl=0

### 3. SimForSWEI (~20,000 shear wave images)
- **URL**: https://www.synapse.org/SimForSWEI (ID: syn26532931)

### 4. StrainNet (~15 GB synthetic + real)
- **URL**: https://github.com/reecehuff/StrainNet

### 5. Borealis Robotically Acquired Phantom
- **URL**: https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP3/ASTGWY

### 6. Liver Fibrosis Ultrasound (Kaggle — proxy labels)
- **URL**: https://www.kaggle.com/datasets/vibhingupta028/liver-histopathology-fibrosis-ultrasound-images

```bash
mkdir -p data/incoming data/raw
# Download chosen dataset into data/incoming/ or another path, then extract or run setup scripts as appropriate.
```

**Note:** Fix any stale Dropbox URLs when you download; verify links in a browser.
