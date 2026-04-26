import { useRef } from "react";
import { ScrollStage } from "./ScrollStage.jsx";
import { HeroBlurbs } from "./HeroBlurbs.jsx";
import { useScrollProgress } from "./useScrollProgress.js";

/**
 * Hero Stage 1 — the first sticky scroll stage.
 *
 * Hosts the counting (1→5) and assemble (dots fade + glove descend) phases.
 * Owns its own sticky container and progress measurement; ScrollStage writes
 * stage-1 vars (--frames-p, --assemble-*-p, --hand-descend, --active-blurb)
 * onto this stage's root, not the page-level .scroll-hero element.
 */
export function HeroStageOne() {
  const ref = useRef(null);
  const progressRef = useScrollProgress(ref);

  return (
    <div className="hero-stage hero-stage-one" ref={ref}>
      <div className="hero-stage-sticky">
        <div className="scroll-hero-canvas-wrap">
          <ScrollStage progressRef={progressRef} heroRef={ref} />
        </div>
        <HeroBlurbs />
      </div>
    </div>
  );
}
