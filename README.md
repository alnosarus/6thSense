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

## Datasets
See `datasets/README.md` for sources and download instructions.

## Landing Page

Public narrative site is a **React + Vite** app in `landing/`, with **Framer Motion** for scroll-driven hero motion and **React Three Fiber** (`@react-three/fiber`, `drei`, `three`, **`@react-three/postprocessing`**, **GSAP**, **maath**) for an immersive scroll-linked 3D experience (studio HDRI, soft shadows, contact shadows, graded post-FX). **`three` is pinned to ~0.160** so `@react-three/postprocessing` v2 bundles cleanly with Vite (newer `three` builds removed APIs used by optional SSR paths in that stack). Typography uses **Syne** and **Cormorant Garamond** (loaded from Google Fonts in `landing/index.html`).

Run it locally:

```bash
cd landing
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Production build: `cd landing && npm run build` (output in `landing/dist/`).

Core files:
- `landing/src/App.jsx` — page sections and copy
- `landing/src/ProbeCanvas.jsx` — R3F canvas + tone mapping / color space
- `landing/src/ProbeExperience.jsx` — lighting, materials, camera rig, postprocessing, interaction
- `landing/src/ScrollContext.jsx` — document scroll → 0–1 progress for 3D
- `landing/src/styles.css`
- `landing/src/main.jsx`
