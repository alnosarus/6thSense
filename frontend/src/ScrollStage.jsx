import { useEffect, useRef } from "react";
import { scrollStages, STOP_COUNT, TRANSITION_ZONE } from "./scrollStages.js";
import { useFramePreloader } from "./useFramePreloader.js";

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

// Draw an Image centered inside a canvas context, preserving aspect ratio
// (contain-fit). Called per rAF tick for the active stop.
function paintCentered(ctx, img, cw, ch, alpha) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.globalAlpha = prev;
}

export function ScrollStage({ progressRef, heroRef }) {
  const canvasRef = useRef(null);
  const reducedRef = usePrefersReducedMotion();

  // Eagerly preload stop 0 (glove) and stop 1 (camera). Further stops load
  // when their section crosses ≥50% viewport (wired up in ScrollHero).
  const s0 = useFramePreloader(scrollStages[0], true);
  const s1 = useFramePreloader(scrollStages[1], true);
  const s2 = useFramePreloader(scrollStages[2], true);
  const s3 = useFramePreloader(scrollStages[3], true);
  const stopData = [s0, s1, s2, s3];

  // Keep stage metrics on the hero root as CSS custom properties so each
  // ScrollStageSection can fade headlines without a React re-render.
  const writeHeroVars = (activeStop, stopProgress, blend) => {
    const root = heroRef.current;
    if (!root) return;
    root.style.setProperty("--active-stop", String(activeStop));
    root.style.setProperty("--stop-progress", stopProgress.toFixed(4));
    root.style.setProperty("--transition-blend", blend.toFixed(4));
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
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const tick = () => {
      const p = progressRef.current;
      const scaled = p * STOP_COUNT;
      const activeStop = Math.min(STOP_COUNT - 1, Math.floor(scaled));
      const stopProgress = Math.min(1, Math.max(0, scaled - activeStop));

      const stage = scrollStages[activeStop];
      const stageFrames = stopData[activeStop]?.frames;

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      // Placeholder stages have one frame; frame stages have many.
      // Reduced motion: freeze on midpoint; skip crossfade.
      const count = stage.placeholderSvg ? 1 : stage.frameCount;
      const frameIndex = reducedRef.current
        ? Math.min(count - 1, Math.floor(count / 2))
        : Math.round(stopProgress * (count - 1));

      // Transition zone: last TRANSITION_ZONE of a stop crossfades into
      // next stop's frame 0. Suppressed for reduced motion and on the
      // final stop (no next stage to blend into).
      let blend = 0;
      if (
        !reducedRef.current &&
        activeStop < STOP_COUNT - 1 &&
        stopProgress > 1 - TRANSITION_ZONE
      ) {
        blend = (stopProgress - (1 - TRANSITION_ZONE)) / TRANSITION_ZONE;
      }

      if (stageFrames?.[frameIndex]) {
        paintCentered(ctx, stageFrames[frameIndex], cw, ch, 1 - blend);
      }
      if (blend > 0) {
        const nextFrames = stopData[activeStop + 1]?.frames;
        if (nextFrames?.[0]) paintCentered(ctx, nextFrames[0], cw, ch, blend);
      }

      writeHeroVars(activeStop, stopProgress, blend);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // stopData identity changes per render; we only need the mount-time refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s0.ready, s1.ready, s2.ready, s3.ready]);

  return <canvas ref={canvasRef} className="scroll-stage-canvas" aria-hidden="true" />;
}
