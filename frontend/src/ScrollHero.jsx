import { useRef } from "react";
import { ScrollStage } from "./ScrollStage.jsx";
import { useScrollProgress } from "./useScrollProgress.js";

/**
 * Scroll-scrub hero: single glove canvas that counts fingers 1→5, clenches back
 * to a fist, and fires an olive "sixth sense" dot as the payoff. Brand-moment
 * opener lives in OpenerAnimation (mounted in App), not here.
 */
export function ScrollHero() {
  const heroRef = useRef(null);
  const progressRef = useScrollProgress(heroRef);

  return (
    <div className="scroll-hero" ref={heroRef}>
      <div className="scroll-hero-sticky">
        <ScrollStage progressRef={progressRef} heroRef={heroRef} />
        <div className="hero-olive-dot" aria-hidden="true" />
      </div>
    </div>
  );
}
