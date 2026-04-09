# SenseProbe — agent memory

Durable workspace facts and repeated preferences from sessions. **No secrets or API keys.** Omit transient troubleshooting.

## Layout

- **Root:** Python ML / ultrasound–stiffness experiments (`experiment.py`, `train_robust.py`, `prepare_data.py`, etc.), `datasets/`, `results/`.
- **`landing/`:** Public narrative site — **Vite + React** (not plain static HTML). Uses **React Three Fiber**, **drei**, **@react-three/postprocessing** (v2), **GSAP**, **maath** for the immersive block; **`three` is pinned to ~0.160.x** so postprocessing bundles cleanly under Vite.
- **`.planning/`:** GSD-style artifacts — `ROADMAP.md` (10 phases for v0.1 landing), `REQUIREMENTS.md`, `STATE.md`, `PROJECT.md`, phase folders.

## Paths and shell

- Repo path includes bracket segments (`[00] GitHub/[01] Active/...`). **Always quote** paths in `cd`, `git`, and tool args.

## Design and quality bar

- For landing and marketing surfaces, follow **frontend-design** and **ui-ux-pro-max** (repo: `.cursor/skills/`). User expects **product-grade** visual and interaction quality (editorial type, scroll/3D immersion), not a minimal demo.
- Official skill sources matter; do not replace with ad-hoc condensed copies without syncing from the plugin originals.

## Planning and delivery

- User wants **GSD-aligned** delivery for major landing work: phased roadmap, explicit narrative (e.g. PNS/CNS/Fusion, proof points), and **verification** (e.g. `npm run build` in `landing/`) before claiming completion.
- Prefer **executing** installs, builds, and git operations in-session rather than only telling the user to run commands.

## Git

- **Default branch:** `main`. If `gh repo create … --remote=origin` fails because **`origin` already exists**, remove or repoint `origin` first, then push.
