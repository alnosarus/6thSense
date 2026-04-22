import { useEffect, useRef } from "react";
import { scrollStages } from "./scrollStages.js";
import { useFramePreloader } from "./useFramePreloader.js";

// Paint-time zoom on the glove frames.
const GLOVE_ZOOM = 0.8;
// Vertical anchor in [0, 1]: 0 = top-align, 0.5 = center, 1 = bottom-align.
const GLOVE_Y_ANCHOR = 1.0;

// Olive-dot ignition zone (fraction of total scroll progress).
const IGNITE_START = 0.80;

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

function paintCentered(ctx, img, cw, ch, alpha, zoom = 1, yAnchor = 0.5) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
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

      // ---- Paint canvas: crossfade between adjacent frames ----
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      if (s0.frames) {
        const frames = s0.frames;
        const count = frames.length;
        const rawIndex = p * (count - 1);
        const i = Math.floor(rawIndex);
        const f = rawIndex - i;
        const nextI = Math.min(count - 1, i + 1);

        if (reduce) {
          // Reduced motion: snap to nearest frame, no crossfade.
          const idx = Math.round(rawIndex);
          paintCentered(ctx, frames[idx], cw, ch, 1, GLOVE_ZOOM, GLOVE_Y_ANCHOR);
        } else {
          paintCentered(ctx, frames[i], cw, ch, 1 - f, GLOVE_ZOOM, GLOVE_Y_ANCHOR);
          if (f > 0) paintCentered(ctx, frames[nextI], cw, ch, f, GLOVE_ZOOM, GLOVE_Y_ANCHOR);
        }
      }

      // ---- Olive dot ignite vars (final 20% of scroll) ----
      // opacity: fades in 0→1 across first half of ignite zone, holds at 1.
      // glow-scale: 0 → 1 across first 60% of ignite, 1 → 0 across last 40%.
      let oliveOpacity = 0;
      let oliveGlowScale = 0;
      if (!reduce && p >= IGNITE_START) {
        const ip = clamp01((p - IGNITE_START) / (1 - IGNITE_START));
        oliveOpacity = Math.min(1, ip / 0.5);
        oliveGlowScale = ip < 0.6 ? ip / 0.6 : Math.max(0, 1 - (ip - 0.6) / 0.4);
      } else if (reduce && p >= 0.95) {
        oliveOpacity = 1;
        oliveGlowScale = 0;
      }

      writeVars({
        "--stop-progress": p.toFixed(4),
        "--olive-opacity": oliveOpacity.toFixed(3),
        "--olive-glow-scale": oliveGlowScale.toFixed(3)
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
