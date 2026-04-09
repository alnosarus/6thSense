# SenseProbe

Proving that B-mode ultrasound images contain recoverable stiffness signals using ML — eliminating the need for expensive elastography machines.

## Goal
Can we predict tissue stiffness (kPa) from standard ultrasound images alone?

## Approach
1. Train models on paired B-mode + elastography data
2. Classification: soft vs stiff
3. Regression: predict stiffness (kPa)
4. Models: ResNet18, EfficientNet-B0, basic CNN

## Evaluation Targets
- Classification: accuracy > 60% = signal exists
- Regression: R² > 0.3 = promising, R² > 0.5 = very promising

## Monorepo layout

| Area | Path |
|------|------|
| Public site (Vite + React) | `frontend/` |
| Minimal API (FastAPI) | `backend/` |
| Training / data prep | `ml/` |
| Data bootstrap | `scripts/setup_data.py` |
| Paths, datasets, model run lists | `config/senseprobe.defaults.yaml` |

## Data & ML configuration

- **`data/README.md`** — where to place zips, extraction, and dataset catalog links.
- **`config/senseprobe.defaults.yaml`** — dataset registry (`datasets:`), roots (`paths:`), and which models `ml/research.py` / `ml/experiment.py` run (`training:`). Override with **`SENSEPROBE_CONFIG`**, **`SENSEPROBE_DATASET`**, **`SENSEPROBE_DATA_ROOT`**, **`SENSEPROBE_RESULTS_DIR`**, **`SENSEPROBE_MODELS_DIR`** (see `.env.example`).

Typical flow:

```bash
python scripts/setup_data.py
python ml/prepare_data.py
python ml/experiment.py
```

Use `--dataset <id>` on ML scripts to switch entries in the config without editing files.

## Backend

```bash
cd backend && pip install -r ../requirements-backend.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`GET /health` returns `{"status":"ok"}`. See `backend/README.md`.

## Frontend

Public narrative site is a **React + Vite** app in `frontend/`, with **Framer Motion** for scroll-driven hero motion and **React Three Fiber** (`@react-three/fiber`, `drei`, `three`, **`@react-three/postprocessing`**, **GSAP**, **maath**) for an immersive scroll-linked 3D experience. **`three` is pinned to ~0.160** so `@react-three/postprocessing` v2 bundles cleanly with Vite. Typography uses **Syne** and **Cormorant Garamond** (Google Fonts in `frontend/index.html`).

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Production build: `cd frontend && npm run build` (output in `frontend/dist/`).

Core files: `frontend/src/App.jsx`, `ProbeCanvas.jsx`, `ProbeExperience.jsx`, `ScrollContext.jsx`, `styles.css`, `main.jsx`.
