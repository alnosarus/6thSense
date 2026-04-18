import { useEffect, useRef, useState } from "react";

function isMobileOrLowPower() {
  if (typeof window === "undefined") return false;
  const w = window.innerWidth;
  const ram = navigator.deviceMemory;
  return w < 768 || (typeof ram === "number" && ram <= 4);
}

function framePath(stage, variant, index) {
  const padded = String(index).padStart(3, "0");
  return `${stage.frameDir}/${variant}/frame-${padded}.webp`;
}

const cache = new Map();

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

// Loads a stage's subject images.
//  · Frame-sequence stage (stage.frameDir + frameCount): fetches WebP sequence.
//  · Placeholder-SVG stage (stage.placeholderSvg): fetches one SVG wrapped in a
//    single-element Image[] so ScrollStage can treat every stage uniformly.
// Results are cached in module scope so re-mounts are free.
export function useFramePreloader(stage, enabled) {
  const [ready, setReady] = useState(false);
  const [frames, setFrames] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (!enabled || !stage) {
      setReady(false);
      setFrames(null);
      return () => {
        aliveRef.current = false;
      };
    }

    const variant = isMobileOrLowPower() ? "mobile" : "full";
    const cacheKey = stage.placeholderSvg
      ? `${stage.id}:svg`
      : `${stage.id}:${variant}`;
    const cached = cache.get(cacheKey);
    if (cached?.ready) {
      setFrames(cached.frames);
      setReady(true);
      return () => {
        aliveRef.current = false;
      };
    }

    let cancelled = false;
    (async () => {
      if (stage.placeholderSvg) {
        const img = await loadImage(stage.placeholderSvg);
        if (cancelled || !aliveRef.current) return;
        const arr = [img];
        cache.set(cacheKey, { ready: true, frames: arr });
        setFrames(arr);
        setReady(true);
        return;
      }

      const count = stage.frameCount;
      const arr = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          loadImage(framePath(stage, variant, i))
        )
      );
      if (cancelled || !aliveRef.current) return;
      cache.set(cacheKey, { ready: true, frames: arr });
      setFrames(arr);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      aliveRef.current = false;
    };
  }, [stage?.id, enabled]);

  return { ready, frames };
}
