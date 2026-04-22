// frontend/src/TactileField.jsx
// Mounts the constellation background behind the hero content. Drives resize,
// pointer state, and a reduced-motion flag. Falls back to transparent (black
// hero background stays visible) if the 2D context is unavailable.

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
        console.warn("TactileField: 2D context unavailable, skipping effect.");
      }
      return;
    }

    // Reduced-motion gate slows the drift (motion still exists, just calmer).
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    field.setReduced(mq.matches);
    const onMq = () => field.setReduced(mq.matches);
    mq.addEventListener("change", onMq);

    // Size tracking. Module handles DPR internally.
    const resize = () => field.setSize();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer state in CSS pixels relative to the canvas.
    let pointerX = -9999, pointerY = -9999;
    let targetPressure = 0;
    let currentPressure = 0;

    const handlePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      // The emitter is active only where CSS has hidden the real cursor. If
      // the element under the pointer has any other cursor (text, pointer,
      // auto…), let the native cursor do the talking.
      const cursor = e.target
        ? window.getComputedStyle(e.target).cursor
        : "none";
      targetPressure = cursor === "none" ? 1 : 0;
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
