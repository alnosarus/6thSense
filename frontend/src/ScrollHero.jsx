import { HeroStageOne } from "./HeroStageOne.jsx";
import { HeroStageTwo } from "./HeroStageTwo.jsx";
import { QuoteTimeline } from "./QuoteTimeline.jsx";
import { TactileField } from "./TactileField.jsx";

/**
 * Three-block hero:
 *   [ HeroStageOne (sticky) ]   counting 1→5, assemble (dots + glove descend)
 *   [ QuoteTimeline (normal) ]  vertical timeline of 4 research citations
 *   [ HeroStageTwo (sticky) ]   pipeline, video preview, finale form
 *
 * A single TactileField mounts at the root with absolute positioning so the
 * shader-driven particle background renders continuously across all three
 * blocks. Brand-moment opener (sessionStorage-gated) lives in OpenerAnimation.
 */
export function ScrollHero() {
  return (
    <div className="scroll-hero">
      <TactileField />
      <HeroStageOne />
      <QuoteTimeline />
      <HeroStageTwo />
    </div>
  );
}
