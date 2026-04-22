import { useRef } from "react";
import { ScrollStage } from "./ScrollStage.jsx";
import { HeroBlurbs } from "./HeroBlurbs.jsx";
import { HeroFinale } from "./HeroFinale.jsx";
import { useScrollProgress } from "./useScrollProgress.js";

/**
 * Scroll-scrub hero. Left half: glove canvas counting 1→5. Right half: scroll-
 * driven blurbs during counting, replaced by the reassembled 6-dot logo + CTA
 * during the finale. Brand-moment opener (sessionStorage-gated) lives in
 * OpenerAnimation (mounted in App).
 */
export function ScrollHero() {
  const heroRef = useRef(null);
  const progressRef = useScrollProgress(heroRef);

  return (
    <div className="scroll-hero" ref={heroRef}>
      <div className="scroll-hero-sticky">
        <div className="scroll-hero-canvas-wrap">
          <ScrollStage progressRef={progressRef} heroRef={heroRef} />
        </div>
        <HeroBlurbs />
        <HeroFinale />
      </div>
    </div>
  );
}
