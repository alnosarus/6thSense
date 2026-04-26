import { useEffect, useRef } from "react";

/**
 * Publishes 0 → 1 as the target element scrolls past the viewport.
 *
 * Returns a ref whose `.current` is the latest progress value:
 *   0 — element's top is at or below the viewport bottom (not yet entered).
 *   0 → 1 — element is crossing the viewport. Linear, clamped.
 *   1 — element's bottom is at or above the viewport top (fully past).
 *
 * Updates on scroll + resize. Caller is responsible for triggering re-renders
 * or writing CSS variables; this hook just maintains the ref.
 */
export function useElementScrollProgress(elementRef) {
  const progressRef = useRef(0);

  useEffect(() => {
    const compute = () => {
      const el = elementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Travel distance: from "top at viewport bottom" to "bottom at viewport top".
      const total = rect.height + vh;
      if (total <= 0) {
        progressRef.current = 0;
        return;
      }
      // Scrolled = how far past "top at viewport bottom" we are.
      const scrolled = vh - rect.top;
      const p = scrolled / total;
      progressRef.current = p < 0 ? 0 : p > 1 ? 1 : p;
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [elementRef]);

  return progressRef;
}
