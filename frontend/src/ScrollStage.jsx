import { useEffect, useRef } from "react";
import { scrollStages, STOP_COUNT, TRANSITION_ZONE } from "./scrollStages.js";
import { useFramePreloader } from "./useFramePreloader.js";

// Stop 0 → Stop 1 flip zone (fraction of stop 0's own progress).
const FLIP_START = 0.65;
const FLIP_END = 0.85;
const LIFT_END = 0.55; // stop 0 glove finishes lifting at 55%

// Stop 1 zoom level.
const STOP1_SCALE = 2.4;

function usePrefersReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { ref.current = mq.matches; };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return ref;
}

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

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function ScrollStage({ progressRef, heroRef }) {
  const gloveCanvasRef = useRef(null);
  const mainCanvasRef = useRef(null);
  const reducedRef = usePrefersReducedMotion();

  // Preloaders — glove belongs to its own canvas; the rest feed the main canvas.
  const s0 = useFramePreloader(scrollStages[0], true);
  const s1 = useFramePreloader(scrollStages[1], true);
  const s2 = useFramePreloader(scrollStages[2], true);
  const s3 = useFramePreloader(scrollStages[3], true);
  const mainStopData = [null, s1, s2, s3]; // indexed by activeStop; entry 0 unused

  const writeVars = (vars) => {
    const root = heroRef.current;
    if (!root) return;
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  };

  useEffect(() => {
    const gloveCanvas = gloveCanvasRef.current;
    const mainCanvas = mainCanvasRef.current;
    if (!gloveCanvas || !mainCanvas) return;
    const gCtx = gloveCanvas.getContext("2d");
    const mCtx = mainCanvas.getContext("2d");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const canvas of [gloveCanvas, mainCanvas]) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const tick = () => {
      const p = progressRef.current;
      const scaled = p * STOP_COUNT;
      const activeStop = Math.min(STOP_COUNT - 1, Math.floor(scaled));
      const stopProgress = clamp01(scaled - activeStop);
      const reduce = reducedRef.current;

      // ---- Paint glove canvas (only ever shows stop 0) ----
      const gw = gloveCanvas.clientWidth;
      const gh = gloveCanvas.clientHeight;
      gCtx.clearRect(0, 0, gw, gh);
      if (activeStop === 0 && s0.frames) {
        const stage = scrollStages[0];
        const count = stage.frameCount;
        const frameIndex = reduce
          ? Math.min(count - 1, Math.floor(count / 2))
          : Math.round(stopProgress * (count - 1));
        paintCentered(gCtx, s0.frames[frameIndex], gw, gh, 1);
      }

      // ---- Paint main canvas (stops 1,2,3 with crossfade between them) ----
      const mw = mainCanvas.clientWidth;
      const mh = mainCanvas.clientHeight;
      mCtx.clearRect(0, 0, mw, mh);

      // During activeStop 0 we preview stop 1 frame 0 (only ever visible under
      // --main-opacity driven by the flip — otherwise invisible).
      const mainActive = activeStop === 0 ? 1 : activeStop;
      const currentStage = scrollStages[mainActive];
      const currentFrames = mainStopData[mainActive]?.frames;
      const count = currentStage.placeholderSvg ? 1 : currentStage.frameCount;

      const progressForMain = activeStop === 0 ? 0 : stopProgress;
      const frameIdx = reduce
        ? Math.min(count - 1, Math.floor(count / 2))
        : Math.round(progressForMain * (count - 1));

      // Crossfade between main-canvas stops (1→2, 2→3). Only while activeStop >= 1.
      let blend = 0;
      if (
        !reduce &&
        activeStop >= 1 &&
        activeStop < STOP_COUNT - 1 &&
        stopProgress > 1 - TRANSITION_ZONE
      ) {
        blend = (stopProgress - (1 - TRANSITION_ZONE)) / TRANSITION_ZONE;
      }

      if (currentFrames?.[frameIdx]) {
        paintCentered(mCtx, currentFrames[frameIdx], mw, mh, 1 - blend);
      }
      if (blend > 0) {
        const nextFrames = mainStopData[mainActive + 1]?.frames;
        if (nextFrames?.[0]) paintCentered(mCtx, nextFrames[0], mw, mh, blend);
      }

      // ---- Compute CSS vars for transforms ----
      let gloveLift = 0;      // % of canvas height (negative = up)
      let gloveOpacity = 1;
      let mainRotateY = -90;  // deg
      let mainOpacity = 0;
      let mainScale = 1;

      if (activeStop === 0) {
        // Phase A: lift (0 → LIFT_END)
        const liftP = clamp01(stopProgress / LIFT_END);
        gloveLift = -115 * liftP;

        if (stopProgress >= FLIP_START) {
          const flipP = clamp01((stopProgress - FLIP_START) / (FLIP_END - FLIP_START));
          gloveOpacity = 1 - flipP;
          mainRotateY = -90 + flipP * 90;
          mainOpacity = clamp01((flipP - 0.4) / 0.6);
          mainScale = 1 + flipP * (STOP1_SCALE - 1);
        }
      } else if (activeStop === 1) {
        gloveOpacity = 0;
        mainRotateY = 0;
        mainOpacity = 1;
        mainScale = STOP1_SCALE;
      } else {
        // Stops 2, 3
        gloveOpacity = 0;
        mainRotateY = 0;
        mainOpacity = 1;
        mainScale = 1;
      }

      if (reduce) {
        // Reduced motion: no lift, no flip — just crossfade canvas visibility.
        gloveLift = 0;
        gloveOpacity = activeStop === 0 ? 1 : 0;
        mainRotateY = 0;
        mainOpacity = activeStop >= 1 ? 1 : 0;
        mainScale = activeStop === 1 ? STOP1_SCALE : 1;
      }

      writeVars({
        "--active-stop": String(activeStop),
        "--stop-progress": stopProgress.toFixed(4),
        "--transition-blend": blend.toFixed(4),
        "--glove-lift": `${gloveLift.toFixed(2)}%`,
        "--glove-opacity": gloveOpacity.toFixed(3),
        "--main-rotateY": `${mainRotateY.toFixed(2)}deg`,
        "--main-opacity": mainOpacity.toFixed(3),
        "--main-scale": mainScale.toFixed(3)
      });

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

  return (
    <>
      <canvas
        ref={gloveCanvasRef}
        className="scroll-stage-canvas scroll-stage-canvas--glove"
        aria-hidden="true"
      />
      <canvas
        ref={mainCanvasRef}
        className="scroll-stage-canvas scroll-stage-canvas--main"
        aria-hidden="true"
      />
    </>
  );
}
