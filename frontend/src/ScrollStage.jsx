import { useEffect, useRef } from "react";
import { scrollStages } from "./scrollStages.js";
import { useFramePreloader } from "./useFramePreloader.js";

// Scroll-progress phase boundaries.
const FRAMES_END = 0.55;        // counting 1→5 done by here
const ASSEMBLE_START = 0.55;    // logo dots rise + hand descends start
const ASSEMBLE_END = 0.80;      // dots arrive at logo positions, hand offscreen
const SHIFT_START = 0.80;       // finished logo shifts + CTA slides in
const SHIFT_END = 0.95;

// Glove canvas layout. Pivot-based anchoring: each frame's wrist-bottom
// (PIVOT_U, PER_FRAME_PIVOT_V[i]) is painted at viewport (PIVOT_X, PIVOT_Y).
// Anchoring on the wrist keeps the hand vertically aligned across frames even
// though the fist image (frame 0) has its visible pixels cropped ~5% earlier
// than the extended-finger frames.
const GLOVE_ZOOM_BASE = 1.8;    // base paint-time zoom
const GLOVE_PIVOT_U = 0.5;      // image horizontal center (all frames ~= 0.5)
const GLOVE_PIVOT_X = 0.30;     // viewport x (fraction of cw)
const GLOVE_PIVOT_Y = 1.95;     // viewport y (fraction of ch) — wrist-bottom lands well below viewport, keeping fingers visible up top
// v-coord of each frame's visible wrist bottom (measured by alpha-scan).
const PER_FRAME_PIVOT_V = [0.9505, 0.9993, 0.9993, 0.9993, 0.9993, 0.9993];
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

// Computes the destination rect (in canvas pixels) the image paints into.
// Pivot-based: image point (PIVOT_U, pivotV) lands at viewport (PIVOT_X, PIVOT_Y),
// so the glove grows around a fixed viewport anchor as zoom changes.
function computePaintRect(iw, ih, cw, ch, zoom, pivotV) {
  const scale = Math.min(cw / iw, ch / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = GLOVE_PIVOT_X * cw - GLOVE_PIVOT_U * dw;
  const dy = GLOVE_PIVOT_Y * ch - pivotV * dh;
  return { dx, dy, dw, dh };
}

function paintAnchored(ctx, img, cw, ch, alpha, zoom, pivotV) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const { dx, dy, dw, dh } = computePaintRect(
    img.naturalWidth, img.naturalHeight, cw, ch, zoom, pivotV
  );
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

    const publishGloveRect = (w, h) => {
      const frames = s0.frames;
      if (!frames) return;
      // Dots are measured in the open-hand frame (index 5) — publish its rect.
      const refIdx = 5;
      const ref = frames[refIdx] ?? frames[0];
      if (!ref || !ref.naturalWidth) return;
      const refZoom = GLOVE_ZOOM_BASE * (PER_FRAME_ZOOM[refIdx] ?? 1);
      const refPivotV = PER_FRAME_PIVOT_V[refIdx] ?? 0.9993;
      const { dx, dy, dw, dh } = computePaintRect(
        ref.naturalWidth, ref.naturalHeight, w, h, refZoom, refPivotV
      );
      writeVars({
        "--glove-x": `${(dx / w * 100).toFixed(3)}%`,
        "--glove-y": `${(dy / h * 100).toFixed(3)}%`,
        "--glove-w": `${(dw / w * 100).toFixed(3)}%`,
        "--glove-h": `${(dh / h * 100).toFixed(3)}%`
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      publishGloveRect(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const tick = () => {
      const p = clamp01(progressRef.current);
      const reduce = reducedRef.current;

      // Frame-sequence progress — counting plays over 0..FRAMES_END.
      const framesP = clamp01(p / FRAMES_END);

      // ---- Paint canvas: snap to nearest beat (no crossfade) ----
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      if (s0.frames) {
        const frames = s0.frames;
        const count = frames.length;

        const zoomFor = (idx) =>
          GLOVE_ZOOM_BASE * (PER_FRAME_ZOOM[idx] ?? 1);

        // Snap to the nearest beat — no crossfade between adjacent frames.
        // Per-frame pivotV aligns each frame's wrist bottom at (PIVOT_X, PIVOT_Y)
        // so the hand stays vertically locked across poses.
        const idx = Math.round(framesP * (count - 1));
        paintAnchored(
          ctx, frames[idx], cw, ch, 1,
          zoomFor(idx), PER_FRAME_PIVOT_V[idx] ?? 0.9993
        );
      }

      // ---- Assemble phase: dots fade in at fingertips first, then move
      //      while hand descends off-screen ----
      const assembleP = reduce
        ? (p >= ASSEMBLE_START ? 1 : 0)
        : clamp01((p - ASSEMBLE_START) / (ASSEMBLE_END - ASSEMBLE_START));
      // Sub-phases:
      //   0.0 → 0.3  fade:  dots materialize at fingertips, glove stationary
      //   0.3 → 1.0  move:  dots drift to logo, glove descends simultaneously
      const assembleFadeP = clamp01(assembleP / 0.3);
      const assembleMoveP = clamp01((assembleP - 0.3) / 0.7);
      const handDescendVh = assembleMoveP * 110;

      // ---- Shift phase: finale form fades in on the right ----
      const shiftP = reduce
        ? (p >= SHIFT_START ? 1 : 0)
        : clamp01((p - SHIFT_START) / (SHIFT_END - SHIFT_START));

      // ---- Active blurb index (kept in lockstep with the frame index so the
      //      copy label always matches the pose on screen) ----
      let blurb;
      if (p >= SHIFT_START) blurb = 7;
      else if (p >= ASSEMBLE_START) blurb = 6;
      else if (s0.frames) {
        const count = s0.frames.length;
        blurb = Math.round(framesP * (count - 1)); // 0..5 ↔ fist..Touch
      } else {
        blurb = 0;
      }

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
