import { useRef } from "react";
import { scrollStages } from "./scrollStages.js";
import { ScrollStage } from "./ScrollStage.jsx";
import { ScrollStageSection } from "./ScrollStageSection.jsx";
import { useScrollProgress } from "./useScrollProgress.js";

export function ScrollHero() {
  const heroRef = useRef(null);
  const progressRef = useScrollProgress(heroRef);

  return (
    <div className="scroll-hero" ref={heroRef}>
      <div className="scroll-hero-sticky" aria-hidden="true">
        <ScrollStage progressRef={progressRef} heroRef={heroRef} />
      </div>
      {scrollStages.map((stage, i) => (
        <ScrollStageSection key={stage.id} stage={stage} index={i} />
      ))}
    </div>
  );
}
