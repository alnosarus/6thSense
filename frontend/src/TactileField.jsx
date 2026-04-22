// frontend/src/TactileField.jsx
// Mounts the tactile pressure surface behind the hero content. Drives resize,
// pointer state, and a reduced-motion flag. Falls back to transparent (black
// hero background stays visible) when WebGL is unavailable.

import { useEffect, useRef } from "react";
import { initTactileField } from "./tactileField.js";

const POINTER_FADE_MS = 200;

export function TactileField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const field = initTactileField(canvas);
    if (!field) {
      if (typeof console !== "undefined") {
        console.warn("TactileField: WebGL unavailable, skipping effect.");
      }
      return;
    }

    // Reduced-motion gate for the ambient shimmer.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    field.setReduced(mq.matches);
    const onMq = () => field.setReduced(mq.matches);
    mq.addEventListener("change", onMq);

    // Size tracking. DPR capped at 2 (matches the glove canvas).
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      field.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer state. Pressure decays exponentially when the pointer leaves.
    let pointerX = 2, pointerY = 2;   // NDC; 2 is far offscreen
    let targetPressure = 0;
    let currentPressure = 0;
    let pointerLastSeen = 0;

    const handlePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerX = nx;
      pointerY = ny;
      targetPressure = 1;
      pointerLastSeen = performance.now();
    };
    const handleLeave = () => { targetPressure = 0; };

    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("pointerleave", handleLeave);
    window.addEventListener("pointercancel", handleLeave);

    // Render loop.
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = (now - start) / 1000;
      // Exponential ease toward targetPressure with ~200 ms half-life.
      const dt = Math.min(0.05, (now - (tick._last ?? now)) / 1000);
      tick._last = now;
      const k = 1 - Math.exp(-dt * (1000 / POINTER_FADE_MS) * Math.LN2);
      currentPressure += (targetPressure - currentPressure) * k;
      field.setPointer(pointerX, pointerY, currentPressure);
      field.render(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", onMq);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("pointercancel", handleLeave);
      field.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="tactile-field" aria-hidden="true" />;
}
