# 6thSense homepage redesign — GSD system spec

Master synthesis for creative, UX, 3D, and implementation. **Execution is phased; this document is the contract.**

---

## Phase 1 — Repo audit

### Findings

| Area | Detail |
|------|--------|
| **Stack** | Vite 5, React 18, Framer Motion 11, R3F 8, drei 9, `@react-three/postprocessing` 2, GSAP 3, maath, **three 0.160.0** (pinned for postprocessing) |
| **Entry** | [`src/main.jsx`](../src/main.jsx) → [`App.jsx`](../src/App.jsx) |
| **Homepage** | Single `App.jsx` (~530 lines): hero, strip, architecture, **explorer** (sticky `ProbeCanvas` + copy), editorial, proof, compare, bento, metrics, verticals, quotes, FAQ, waitlist |
| **3D (pre–Slice 1)** | Primitive capsule assembly + global scroll via [`ScrollContext.jsx`](../src/ScrollContext.jsx) — **replaced** in Slice 1 by section-scoped scroll + clinical proxy model (see Phase 7). `ScrollContext.jsx` is now unused and may be deleted. |
| **Styles** | [`styles.css`](../src/styles.css) — CSS variables; Syne + Cormorant Garamond; warm paper + **rust accent** (`#b83f1a`) |
| **Assets** | No GLB/GLTF; Environment `preset="studio"` only |
| **Constraints** | WebGL + postprocessing cost; mobile low-power branch exists; reduced-motion hooks exist |

### Decisions

1. **Refactor in place** (not greenfield): keep Vite/R3F/drei/GSAP/Framer; replace narrative shell, scroll model, and 3D subject matter incrementally.
2. **Remove global page scroll as the 3D driver** for the flagship story; drive 3D from **section-scoped** progress (`framer-motion` `useScroll` on the device story container).
3. **Replace** abstract primitive assembly with a **clinical proxy model** (Phase A geometry) until a real GLB exists (Phase B).

### Rationale

- Greenfield would discard working a11y, lazy loading, and postprocessing tuning without adding user value.
- Global scroll ties rotation to unrelated sections (FAQ, footer), which breaks “cinematic choreography.”
- A proxy with correct **silhouette + materials** trains layout, lighting, and scroll rig before CAD lands.

### Next actions (audit → done)

- [x] Record stack and file map
- [x] Lock refactor-vs-rebuild decision

---

## Phase 2 — Creative brief

### Brand feeling

**Clinical precision × future diagnostic instrument** — quiet confidence, matte industrial surfaces, one or two restrained futuristic cues (e.g. fine teal signal line), **no** cyberpunk, **no** SaaS gradient hero, **no** toy-like emissive jewelry.

### Target impression

> “Flagship device company — hardware, signal, and interpretation feel like one product story.”

### Narrative arc (“from signal to insight”)

1. **Reveal** — real object, premium lighting, minimal copy.  
2. **Signal** — move closer; expose sensing head; sparse technical callouts.  
3. **Context** — local anatomy / use region; restrained graphic, not stock medical illustration.  
4. **Interpretation** — productized readouts (waveform, map, confidence), calm UI chrome.  
5. **Traction** — early but real (milestones, collaborators, pilots) without overclaiming.  
6. **Platform** — capture → interpret → track → longitudinal value.  
7. **Close** — device or platform echo + single CTA.

### Industrial design direction (proxy Phase A)

- **Silhouette**: Handheld “clinical wand” — tapered polymer body, **distinct sensing head** (slightly larger front cylinder), **single satin metal collar**, optional thin teal accent ring (low emissive).  
- **Proportions**: ~5:1 length:diameter; head ~1.15× body diameter; soft fillets via high-segment cylinders/capsules.  
- **Materials**: Matte charcoal polymer (`meshPhysicalMaterial` roughness high, metalness low); collar satin steel (moderate metalness, low roughness); sensing face dark glass-like (low roughness, very dark albedo).

### Color / material system (digital)

- **Void**: `#0a0b0d` – `#12151a`  
- **Paper (contrast blocks)**: warm off-white `#f2efe8`  
- **Ink**: `#0e0f12` on paper, `#e8eaef` on void  
- **Accent**: teal/cyan `#3d8f8a` / `#5fb3ad` (sparingly)  
- **Signal green**: `#6b9e7d` only in data/UI mock contexts  
- **Avoid**: loud blue biotech, orange/rust as primary (legacy brand accent phased out for flagship story)

### Motion language

- **Hero**: very slow idle (subtle yaw ±1–2°), optional micro-float amplitude tiny.  
- **Scroll**: **scrubbed** camera + device rotation tied to **story progress** (0–1), ease-smoothed (lerp / damp).  
- **No** free orbit as primary; **no** scrolljacking; pointer may add **subtle** parallax offset only.  
- **Reduced motion**: static pose + instant phase jumps or minimal interpolation.

### What “good” looks like

- First 5s: user believes the object **could** be a real product render.  
- Scroll: each band feels like a **designed camera angle**, not a spinner.  
- Copy and 3D reinforce the **same** beat (signal / context / insight).

### Next actions

- [x] Brief approved as working draft  
- [ ] Matt’s traction bullets → populate `homeNarrative.js` when provided

---

## Phase 3 — Information architecture

| # | Section ID | User job | Primary UI | 3D beat |
|---|------------|----------|------------|---------|
| 1 | `#story` / panels | Orientation + wow | Dark hero copy + sticky canvas | Hero angle, idle |
| 2 | story panel **Signal** | “It measures something real” | Technical callouts (DOM overlay) | Dolly in, tilt to sensing head |
| 3 | story panel **Context** | “Used on a body, clinically” | Local limb graphic + soft zone | Device shifts beside abstract “region” |
| 4 | story panel **Insight** | “Value is interpretation” | Minimal waveform / metric card | Device recedes slightly; UI group fades in |
| 5 | `#traction` | “Early but real” | Timeline / logos / proof list | Optional static device or none |
| 6 | `#platform` | “Bigger than hardware” | 3–4 pillar cards | No 3D requirement |
| 7 | `#cta` / `#waitlist` | Conversion | Headline + form | Echo device optional |

**Nav** (slice 1+): Story, Signal (anchor mid-story), Traction, Platform, Contact.

### Next actions

- [x] Map old sections to new IDs (incremental migration)  
- [ ] Retire or merge redundant blocks (compare, quotes) in later slice

---

## Phase 4 — Visual system

### Typography

- **Display**: Syne (tight tracking, weights 600–800) for headlines / wordmark.  
- **Body**: Cormorant Garamond for editorial length; **consider** adding a neutral sans (e.g. DM Sans) for UI labels / callouts in a later slice for more “instrument” feel.  
- **Scale**: `clamp()` headlines; body ≥16px; callouts caps small with letter-spacing.

### Spacing

- Continue `--space` clamp; increase vertical rhythm in story panels (`min-height: 100vh` per beat).  
- Sticky column: max canvas `min(72vh, 560px)` → may increase slightly on large screens in later polish.

### Surfaces

- Story sticky column: deep charcoal gradient (matches 3D clear color).  
- Paper sections: traction/platform use `--paper` with fine border rules.

### Callouts

- Thin rules + monospace or small caps; optional SVG leader lines in slice 2; **max 3–4** on screen.

### Proof / traction cards

- Muted borders, no heavy shadows; dates + fact + optional “class” label (Lab / Pilot / Partner).

### CTA

- Primary: solid teal on dark; outline on paper. Focus rings visible.

### Next actions

- [x] CSS custom properties for new palette  
- [ ] Add secondary sans for callouts (optional)

---

## Phase 5 — 3D / motion strategy

### Phase A (now)

- **Geometry**: Procedural “clinical wand” (cylinders + caps + collar + sensing face).  
- **Lighting**: Key warm + cool fill; **reduce** bloom vs current; teal rim light subtle.  
- **Rig**: `storyProgress` 0–1 maps to piecewise phases: `hero`, `signal`, `context`, `insight` (thresholds in code).  
- **Camera**: Interpolate position/target per phase; damp in `useFrame`.

### Phase B

- Drop in `public/models/senseprobe-proxy.glb` (Draco) via `useGLTF`; retarget same phase rig to named nodes.

### Phase C

- Exploded view, sectioned cutaway, or shader highlight on sensing stack (only if maintainable).

### Performance

- Keep lazy `Suspense` on canvas; dpr cap; disable N8AO/Bloom on low-power; single canvas instance.  
- **No** second WebGL context for hero.

### Next actions

- [x] Implement Phase A proxy + phase camera  
- [ ] Export GLB when industrial design ready

---

## Phase 6 — Implementation plan

### Components / files

| File | Role |
|------|------|
| [`src/homeNarrative.js`](../src/homeNarrative.js) | Copy, anchors, traction placeholders, headline options |
| [`src/DeviceStory.jsx`](../src/DeviceStory.jsx) | Scroll container, `useScroll`, sticky layout, passes `storyProgress` |
| [`ProbeCanvas.jsx`](../src/ProbeCanvas.jsx) | Accept `storyProgress` |
| [`ProbeExperience.jsx`](../src/ProbeExperience.jsx) | Proxy device, phase rig, lighting, postFX tune |
| [`App.jsx`](../src/App.jsx) | Compose nav, DeviceStory, traction, platform, CTA, trimmed legacy |
| [`styles.css`](../src/styles.css) | Tokens, layout, overlays |

### Animation architecture

- **Source of truth**: `scrollYProgress` from Framer `useScroll({ target, offset: ["start start", "end end"] })`.  
- Bridge to R3F: `useMotionValueEvent` → React state throttled or direct subscription pattern (slice uses state + requestAnimationFrame coalescing optional).  
- **GSAP**: `mapRange` utilities only unless ScrollTrigger added later.

### Dependencies

- No new packages in slice 1.

### Build sequence (executed in slices)

1. **Slice 1** (this PR): Spec doc + narrative JS + `DeviceStory` + 3D proxy + section-scoped scroll + dark hero migration into story + traction scaffold + tokens.  
2. **Slice 2**: DOM callouts + SVG leaders; anatomy zone graphic; interpretation UI mock.  
3. **Slice 3**: GLB swap; polish; optional ScrollTrigger for finer scrub.

---

## Phase 7 — Build log (Slice 1)

**Shipped in repo (initial slice):**

- [`src/DeviceStory.jsx`](../src/DeviceStory.jsx) — `framer-motion` `useScroll` on `#story` (section-scoped 0–1), `StoryProgressProvider` + ref bridge to R3F (no per-frame React re-renders).
- [`src/StoryProgressContext.jsx`](../src/StoryProgressContext.jsx) — progress ref for the canvas.
- [`src/homeNarrative.js`](../src/homeNarrative.js) — story panels, headline options, traction + platform copy (Matt placeholders).
- [`src/ProbeExperience.jsx`](../src/ProbeExperience.jsx) — **Phase A proxy** “clinical wand” (matte polymer + satin collar + sensing face + restrained teal ring), camera / device keyframes over scroll, toned post-FX, context halo + minimal “readout” prop for interpretation beat.
- [`src/App.jsx`](../src/App.jsx) — flagship nav, proof strip, traction timeline, platform grid, slim FAQ, CTA; removed old multi-section marketing stack for coherence.
- [`styles.css`](../src/styles.css) — teal-forward tokens, device-story layout, traction/platform treatments.
- [`docs/HOMEPAGE-REDESIGN-SPEC.md`](./HOMEPAGE-REDESIGN-SPEC.md) — this document.

**Verify**: `npm run build` in `frontend/` (passing).

---

## Success criteria checklist

- [x] 3D reads as **medical-industrial** proxy (replaceable with GLB in Slice 2+)
- [x] Scroll in **`#story` only** drives flagship choreography
- [x] Palette shifted toward **charcoal + teal**
- [x] Traction section accepts copy swaps without layout rewrite
- [x] `prefers-reduced-motion` still respected
- [x] Build passes
