import { useEffect, useRef } from "react";

export function useScrollProgress(heroRef) {
  const progressRef = useRef(0);

  useEffect(() => {
    const compute = () => {
      const el = heroRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        progressRef.current = rect.top <= 0 ? 1 : 0;
        return;
      }
      const scrolled = -rect.top;
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
  }, [heroRef]);

  return progressRef;
}
