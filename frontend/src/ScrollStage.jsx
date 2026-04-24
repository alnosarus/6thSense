import { useEffect, useRef } from "react";
import { scrollStages } from "./scrollStages.js";
import { useFramePreloader } from "./useFramePreloader.js";

// Scroll-progress phase boundaries. Six beats fit a 560vh sticky budget.
const FRAMES_END = 0.42;
const ASSEMBLE_START = 0.42;
const ASSEMBLE_END = 0.55;
const STAT_START = 0.55;
const STAT_END = 0.68;
const PIPELINE_START = 0.68;
const PIPELINE_END = 0.81;
const VIDEO_START = 0.81;
const VIDEO_END = 0.92;
const FORM_START = 0.92;
const FORM_END = 1.00;

// Glove canvas layout. Tip-anchored: each frame's highest visible image point
// (PIVOT_U, PER_FRAME_TIP_V[i]) is painted at viewport (PIVOT_X, PER_FRAME_TIP_Y[i]),
// so the asymmetry between the bulky fist and the tall extended-finger poses
// scales with viewport on every screen size.
const GLOVE_ZOOM_BASE = 1.8;    // base paint-time zoom (desktop)
const GLOVE_PIVOT_U = 0.5;      // image horizontal center (all frames ~= 0.5)
const GLOVE_PIVOT_X = 0.30;     // viewport x (fraction of cw)

// Mobile/portrait override: recenter horizontally and bump zoom so the hand
// fills the narrow viewport instead of sitting in a side column.
const MOBILE_MAX_W = 720;
const GLOVE_PIVOT_X_MOBILE = 0.5;
const GLOVE_ZOOM_BASE_MOBILE = 2.6;

function isMobileViewport(cw) {
  return cw < MOBILE_MAX_W;
}

function pivotsFor(cw) {
  if (isMobileViewport(cw)) {
    return {
      pivotX: GLOVE_PIVOT_X_MOBILE,
      zoomBase: GLOVE_ZOOM_BASE_MOBILE
    };
  }
  return {
    pivotX: GLOVE_PIVOT_X,
    zoomBase: GLOVE_ZOOM_BASE
  };
}
// v-coord of each frame's highest visible point. Frames 1–5 extend a finger
// to ~v=0.042 (matches HeroFinale's middle-finger tip dot); frame 0 is a fist
// whose top knuckle sits ~v=0.10.
const PER_FRAME_TIP_V = [0.10, 0.042, 0.042, 0.042, 0.042, 0.042];
// Viewport y fraction where each frame's tip is anchored. Bias the bulky
// fist a touch below center and the extended-finger poses a touch above
// center so the fist body settles into view and the finger reads as
// "reaching up" rather than dipping.
const PER_FRAME_TIP_Y = [0.58, 0.15, 0.15, 0.15, 0.15, 0.15];
// Per-frame zoom multiplier (fist was generated bigger than extended poses).
const PER_FRAME_ZOOM = [0.75, 1.0, 1.0, 1.0, 1.0, 1.0];

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
// Tip-anchored: image point (PIVOT_U, tipV) lands at viewport (PIVOT_X, tipY).
function computePaintRect(iw, ih, cw, ch, zoom, tipV, tipY) {
  const { pivotX } = pivotsFor(cw);
  const scale = Math.min(cw / iw, ch / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = pivotX * cw - GLOVE_PIVOT_U * dw;
  const dy = tipY * ch - tipV * dh;
  return { dx, dy, dw, dh };
}

function paintAnchored(ctx, img, cw, ch, alpha, zoom, tipV, tipY) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const { dx, dy, dw, dh } = computePaintRect(
    img.naturalWidth, img.naturalHeight, cw, ch, zoom, tipV, tipY
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
      const { zoomBase } = pivotsFor(w);
      const refZoom = zoomBase * (PER_FRAME_ZOOM[refIdx] ?? 1);
      const refTipV = PER_FRAME_TIP_V[refIdx] ?? 0.042;
      const refTipY = PER_FRAME_TIP_Y[refIdx] ?? 0.5;
      const { dx, dy, dw, dh } = computePaintRect(
        ref.naturalWidth, ref.naturalHeight, w, h, refZoom, refTipV, refTipY
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

        const { zoomBase } = pivotsFor(cw);
        const zoomFor = (idx) =>
          zoomBase * (PER_FRAME_ZOOM[idx] ?? 1);

        // Snap to the nearest beat — no crossfade between adjacent frames.
        // Per-frame (tipV, tipY) anchors each frame's highest visible point
        // at its own viewport y, biasing the fist down and the extended
        // fingers up.
        const idx = Math.round(framesP * (count - 1));
        paintAnchored(
          ctx, frames[idx], cw, ch, 1,
          zoomFor(idx),
          PER_FRAME_TIP_V[idx] ?? 0.042,
          PER_FRAME_TIP_Y[idx] ?? 0.5
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

      // ---- New beats: each section is visible only while scroll is inside
      //      its window. Binary (in/out) — the CSS transition on
      //      .hero-section smooths the edges. Same pattern as --active-blurb. ----
      const windowP = (start, end) => (p >= start && p < end ? 1 : 0);
      const statP = windowP(STAT_START, STAT_END);
      const pipelineP = windowP(PIPELINE_START, PIPELINE_END);
      const videoP = windowP(VIDEO_START, VIDEO_END);
      // Form is the terminal beat — keep its progressive fade-in so the CTA
      // slides/fades as it settles.
      const formP = reduce
        ? (p >= FORM_START ? 1 : 0)
        : clamp01((p - FORM_START) / (FORM_END - FORM_START));

      // ---- Active blurb index (kept in lockstep with the frame index so the
      //      copy label always matches the pose on screen) ----
      // Blurb 6 ("They still can't feel…") rides the assemble beat; once the
      // stat beat begins all blurbs fade out (no CSS rule matches index 7+).
      let blurb;
      if (p >= STAT_START) blurb = 7;
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
        "--stat-p": statP.toFixed(4),
        "--pipeline-p": pipelineP.toFixed(4),
        "--video-p": videoP.toFixed(4),
        "--form-p": formP.toFixed(4),
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
