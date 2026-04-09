# Roadmap

## Milestone v0.1: Landing + Positioning

Phases below ship the public narrative site. Later phases assume earlier ones are merged; **Depends on** notes ordering where it matters.

---

### Phase 1: Public Narrative and Conversion Surface
**Depends on:** —  
**Goal:** Baseline hero, story spine, waitlist, and readable layout.  
**Requirements:** POS-01, POS-02 (partial), CONV-01, CONV-02, QLT-01, QLT-02 (partial)  
**Success criteria:**
1. Hero states the “complete artificial nervous system” thesis in one screen.
2. Primary CTA path to waitlist works with inline validation feedback.
3. Page is usable on phone and desktop without horizontal scroll.

---

### Phase 2: PNS / CNS / Fusion Architecture
**Depends on:** 1  
**Goal:** Make the three-layer model explicit (peripheral tactility, central volumetric inference, fusion)—not buried in metaphor alone.  
**Requirements:** NAR-01, NAR-02, NAR-03  
**Success criteria:**
1. Dedicated section labels **PNS**, **CNS**, and **Fusion** (or equivalent clear naming).
2. Each layer has a short, scannable description a new visitor can parse in &lt; 60s.
3. In-page nav links target this section.

---

### Phase 3: Technical Proof and Credibility
**Depends on:** 2  
**Goal:** At least **three** concrete proof points tied to prototype/research status (not generic AI claims).  
**Requirements:** POS-02  
**Success criteria:**
1. Proof section lists ≥3 specifics (e.g. sensing modality, BOM class, ML/signal result).
2. Copy avoids unsubstantiated superlatives; ties claims to repo-backed work where possible.

---

### Phase 4: Wayfinding and Section Model
**Depends on:** 1  
**Goal:** Navigation and heading hierarchy match the story order; users can jump to Architecture, Proof, System, Conversion.  
**Requirements:** QLT-01  
**Success criteria:**
1. Header nav covers major sections with working hash links.
2. One H1; logical H2/H3 order for main content.

---

### Phase 5: Responsive and Mobile Polish
**Depends on:** 4  
**Goal:** Touch-friendly targets, no clipped 3D region, typography scales safely.  
**Requirements:** QLT-01  
**Success criteria:**
1. Explorer + architecture readable at 375px width.
2. Tap targets ≥44px where interactive; nav wraps without overlap.

---

### Phase 6: Accessibility Pass
**Depends on:** 1  
**Goal:** Semantic regions, form labels, FAQ accordion pattern, focus visibility.  
**Requirements:** QLT-02  
**Success criteria:**
1. `main`, `header`, `footer`, section headings associated where helpful.
2. FAQ buttons use `aria-expanded` + answer regions discoverable.
3. Skip link reaches primary content.

---

### Phase 7: 3D and Motion Performance
**Depends on:** 1  
**Goal:** Honor `prefers-reduced-motion`; stable FPS on laptop; no runaway DPR.  
**Requirements:** QLT-01 (performance aspect)  
**Success criteria:**
1. Reduced-motion path disables heavy post/float per implementation.
2. Production build succeeds; lazy chunk loads for 3D.

---

### Phase 8: Conversion UX and Trust
**Depends on:** 1  
**Goal:** Waitlist form feels credible: helper text, success/error copy, privacy-adjacent tone (no backend).  
**Requirements:** CONV-01, CONV-02  
**Success criteria:**
1. Submit shows clear success/failure states.
2. Form purpose is obvious (work email, pilot intent).

---

### Phase 9: Visual Cohesion and Editorial Rhythm
**Depends on:** 5  
**Goal:** Spacing, type scale, and motion timing feel consistent (editorial, not template).  
**Requirements:** QLT-01, QLT-02 (visual clarity)  
**Success criteria:**
1. Section padding and max-width follow a single system.
2. Motion uses one easing family for in-view reveals.

---

### Phase 10: Pre-Ship Verification and Doc Sync
**Depends on:** 2–9  
**Goal:** Requirements traceability, STATE/ROADMAP alignment, ship checklist.  
**Requirements:** (verification of all v1 IDs)  
**Success criteria:**
1. `npm run build` passes for `landing/`.
2. REQUIREMENTS.md checkboxes updated for satisfied IDs.
3. STATE.md records completion and any deferred v2 items.

---

## Progress (autonomous)

| Phase | Focus                         | Status    |
|-------|-------------------------------|-----------|
| 1     | Narrative + conversion shell  | Complete  |
| 2     | PNS/CNS/Fusion section        | Complete  |
| 3     | Technical proof               | Complete  |
| 4     | Wayfinding                    | Complete  |
| 5     | Responsive polish             | Complete  |
| 6     | Accessibility                 | Complete  |
| 7     | 3D / motion perf              | Complete  |
| 8     | Conversion UX                 | Complete  |
| 9     | Visual cohesion               | Complete  |
| 10    | Pre-ship QA + docs            | Complete  |

*Last autonomous pass: 2026-04-09 — roadmap expanded to 10 phases; landing updated for architecture, proof, nav, a11y, form trust; `npm run build` verified.*
