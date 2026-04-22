import { useEffect, useRef } from "react";
import { scrollStages } from "./scrollStages.js";
import { useFramePreloader } from "./useFramePreloader.js";

// Scroll-progress phase boundaries.
const FRAMES_END = 0.55;        // counting 1→5 done by here
const ASSEMBLE_START = 0.55;    // logo dots rise + hand descends start
const ASSEMBLE_END = 0.80;      // dots arrive at logo positions, hand offscreen
const SHIFT_START = 0.80;       // finished logo shifts + CTA slides in
const SHIFT_END = 0.95;

// Glove canvas layout.
const GLOVE_ZOOM_BASE = 0.60;   // base paint-time zoom
const GLOVE_X_ANCHOR = 0.25;    // 25% from left
const GLOVE_Y_ANCHOR = 1.18;    // >1 pushes image below viewport bottom
// Per-frame zoom multiplier (fist was generated bigger than extended poses).
const PER_FRAME_ZOOM = [0.82, 1.0, 1.0, 1.0, 1.0, 1.0];

function usePrefersReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      ref.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return ref;
}

function paintAnchored(ctx, img, cw, ch, alpha, zoom, xAnchor, yAnchor, refCenterX) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Normal x-anchor math, except when refCenterX is provided — then force
  // this frame's horizontal center to land at that reference (keeps the fist
  // and the finger-extended frames aligned despite different zoom factors).
  const dx = refCenterX != null ? refCenterX - dw / 2 : (cw - dw) * xAnchor;
  const dy = (ch - dh) * yAnchor;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.globalAlpha = prev;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function ScrollStage({ progressRef, heroRef }) {
  const canvasRef = useRef(null);
  const reducedRef = usePrefersReducedMotion();
  const s0 = useFramePreloader(scrollStages[0], true);

  const writeVars = (vars) => {
    const root = heroRef.current;
    if (!root) return;
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const tick = () => {
      const p = clamp01(progressRef.current);
      const reduce = reducedRef.current;

      // Frame-sequence progress — counting plays over 0..FRAMES_END.
      const framesP = clamp01(p / FRAMES_END);

      // ---- Paint canvas: crossfade adjacent frames with per-frame zoom ----
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      if (s0.frames) {
        const frames = s0.frames;
        const count = frames.length;
        const rawIndex = framesP * (count - 1);
        const i = Math.floor(rawIndex);
        const f = rawIndex - i;
        const nextI = Math.min(count - 1, i + 1);

        const zoomFor = (idx) =>
          GLOVE_ZOOM_BASE * (PER_FRAME_ZOOM[idx] ?? 1);

        // Pick a reference image center (use frame 1's zoom as the anchor
        // since frames 1–5 share the same zoom). All frames paint at this
        // same center X regardless of their own zoom, so the glove doesn't
        // jump horizontally between the fist and the finger-extended shots.
        const refImg = frames[1] ?? frames[0];
        const refFitScale = Math.min(cw / refImg.naturalWidth, ch / refImg.naturalHeight);
        const refDw = refImg.naturalWidth * refFitScale * zoomFor(1);
        const refCenterX = (cw - refDw) * GLOVE_X_ANCHOR + refDw / 2;

        if (reduce) {
          const idx = Math.round(rawIndex);
          paintAnchored(
            ctx, frames[idx], cw, ch, 1,
            zoomFor(idx), GLOVE_X_ANCHOR, GLOVE_Y_ANCHOR, refCenterX
          );
        } else {
          paintAnchored(
            ctx, frames[i], cw, ch, 1 - f,
            zoomFor(i), GLOVE_X_ANCHOR, GLOVE_Y_ANCHOR, refCenterX
          );
          if (f > 0) {
            paintAnchored(
              ctx, frames[nextI], cw, ch, f,
              zoomFor(nextI), GLOVE_X_ANCHOR, GLOVE_Y_ANCHOR, refCenterX
            );
          }
        }
      }

      // ---- Assemble phase: hand descends, dots fade-in first, then move ----
      const assembleP = reduce
        ? (p >= ASSEMBLE_START ? 1 : 0)
        : clamp01((p - ASSEMBLE_START) / (ASSEMBLE_END - ASSEMBLE_START));
      const handDescendVh = assembleP * 110;
      // Split into two sub-phases so dots pop into existence at fingertips
      // BEFORE drifting to the logo stair. First 30% of the assemble window
      // handles the fade; remaining 70% handles the movement.
      const assembleFadeP = clamp01(assembleP / 0.3);
      const assembleMoveP = clamp01((assembleP - 0.3) / 0.7);

      // ---- Shift phase: finale form fades in on the right ----
      const shiftP = reduce
        ? (p >= SHIFT_START ? 1 : 0)
        : clamp01((p - SHIFT_START) / (SHIFT_END - SHIFT_START));

      // ---- Active blurb index (for the right-side copy) ----
      // 0..5 map to counting beats; 6 = "building the sixth"; 7 = final CTA state.
      let blurb;
      if (p < 0.04) blurb = 0;           // opening tagline fragment
      else if (p < 0.14) blurb = 1;       // 1 finger → Sight
      else if (p < 0.23) blurb = 2;       // 2 → Sound
      else if (p < 0.32) blurb = 3;       // 3 → Smell
      else if (p < 0.41) blurb = 4;       // 4 → Taste
      else if (p < 0.55) blurb = 5;       // 5 → Touch
      else if (p < SHIFT_START) blurb = 6; // "and the sixth"
      else blurb = 7;                    // CTA

      writeVars({
        "--stop-progress": p.toFixed(4),
        "--frames-p": framesP.toFixed(4),
        "--assemble-p": assembleP.toFixed(4),
        "--assemble-fade-p": assembleFadeP.toFixed(4),
        "--assemble-move-p": assembleMoveP.toFixed(4),
        "--shift-p": shiftP.toFixed(4),
        "--hand-descend": `${handDescendVh.toFixed(2)}vh`,
        "--active-blurb": String(blurb)
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s0.ready]);

  return <canvas ref={canvasRef} className="scroll-stage-canvas" aria-hidden="true" />;
}
