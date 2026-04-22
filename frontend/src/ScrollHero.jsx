import { useRef } from "react";
import { scrollStages } from "./scrollStages.js";
import { ScrollStage } from "./ScrollStage.jsx";
import { ScrollStageSection } from "./ScrollStageSection.jsx";
import { useScrollProgress } from "./useScrollProgress.js";

/**
 * Scroll-scrub hero: canvas tour (glove → optics → compute → delivery)
 * plus per-stop revealed copy inside each ScrollStageSection.
 *
 * Brand moment lives in OpenerAnimation (mounted in App), not here.
 */
export function ScrollHero() {
  const heroRef = useRef(null);
  const progressRef = useScrollProgress(heroRef);

  return (
    <div className="scroll-hero" ref={heroRef}>
      <div className="scroll-hero-sticky">
        <ScrollStage progressRef={progressRef} heroRef={heroRef} />
      </div>
      {scrollStages.map((stage, i) => (
        <ScrollStageSection key={stage.id} stage={stage} index={i} />
      ))}
    </div>
  );
}
