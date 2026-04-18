# 6thSense — agent memory

Durable workspace facts and repeated preferences from sessions. **No secrets or API keys.** Omit transient troubleshooting.

## Layout

- **`ml/`:** Training and data prep (`experiment.py`, `train_robust.py`, `prepare_data.py`, `research.py`, `sanity_check.py`). Paths and datasets come from **`config/senseprobe.defaults.yaml`** + env (`SENSEPROBE_*`); see `ml/senseprobe_config.py`.
- **`data/`:** Raw/processed data (mostly gitignored); conventions in `data/README.md`.
- **`frontend/`:** Public narrative site — **Vite + React**. Uses **React Three Fiber**, **drei**, **@react-three/postprocessing** (v2), **GSAP**, **maath**; **`three` is pinned to ~0.160.x** so postprocessing bundles cleanly under Vite.
- **`backend/`:** Minimal FastAPI service (health, future API).
- **`.planning/`:** GSD-style artifacts (local; often untracked) — `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `PROJECT.md`, phase folders.

## Paths and shell

- Repo path includes bracket segments (`[00] GitHub/[01] Active/...`). **Always quote** paths in `cd`, `git`, and tool args.

## Design and quality bar

- For landing and marketing surfaces, follow **frontend-design** and **ui-ux-pro-max** (repo: `.cursor/skills/`). User expects **product-grade** visual and interaction quality (editorial type, scroll/3D immersion), not a minimal demo.
- Official skill sources matter; do not replace with ad-hoc condensed copies without syncing from the plugin originals.

## Planning and delivery

- User wants **GSD-aligned** delivery for major landing work: phased roadmap, explicit narrative (e.g. PNS/CNS/Fusion, proof points), and **verification** (e.g. `npm run build` in `frontend/`) before claiming completion.
- Prefer **executing** installs, builds, and git operations in-session rather than only telling the user to run commands.

## Git

- **Default branch:** `main`. If `gh repo create … --remote=origin` fails because **`origin` already exists**, remove or repoint `origin` first, then push.

## Learned User Preferences

- For major landing or homepage work, sequence decisions before coding: lock product story and page structure, then visual and motion systems, then implementation—avoid jumping straight into implementation without that alignment.
- Use scroll-driven, premium product storytelling (reference: https://wisprflow.ai) as an interaction-depth benchmark alongside **frontend-design** and **ui-ux-pro-max**.
- For in-editor review in Cursor, serve the production build with **`npm run build`** then **`npm run preview`** in **`frontend/`** (default preview port **4173**; dev/preview may use another port if the default is in use).
- Prefer **device-forward hero composition**: the probe/device and WebGL canvas should read as the primary focal point of the viewport, not a side panel next to a text column.
- When iterating on the **frontend or landing**, keep **`npm run dev`** or **`npm run preview`** running and share the URL/port so the page can be reviewed in the browser or Cursor preview—not only code edits without a live build.
- On **long scroll landings**, keep **backgrounds, gradients, and palette** feeling like one system across sections; avoid abrupt tonal jumps and muddy or banded gradients that break the editorial look.

## Learned Workspace Facts

- **Brand / company name:** **6thSense** (public-facing product and landing copy).
- Large raw datasets and generated ML artifacts belong under **`data/`** with strict **`.gitignore`** coverage; accidental tracking inflates uncommitted line counts and should be corrected immediately.
