import { useEffect, useRef, useState } from "react";

function framePath(stage, index) {
  const padded = String(index).padStart(3, "0");
  return `${stage.frameDir}/frame-${padded}.webp`;
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

// Loads a stage's frame sequence (flat layout: stage.frameDir/frame-XXX.webp).
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

    const cacheKey = stage.id;
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
      const count = stage.frameCount;
      const arr = await Promise.all(
        Array.from({ length: count }, (_, i) => loadImage(framePath(stage, i)))
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
