import { GlassCupReveal } from "./GlassCupReveal.jsx";

/**
 * Right-side copy that swaps with scroll beats. Each blurb has a data-index
 * and is visible only when --active-blurb matches. Selection is done via a
 * chain of CSS rules (see scroll-hero.css) to keep this render-free.
 *
 * Five blurbs map 1:1 with the five hand poses in narrative order:
 * pointy, +middle, +ring, +pinky, open palm.
 *
 * Blurb 0 contains an inline animation on the phrase "glass cup" — see
 * GlassCupReveal.jsx for the choreography.
 */
export function HeroBlurbs() {
  return (
    <div className="hero-blurbs" aria-live="polite">
      <p className="hero-blurb" data-index="0">
        Robots can tell the difference between a <GlassCupReveal /> and a paper cup.
      </p>
      <p className="hero-blurb" data-index="1">
        But they do it by looking, not by feeling.
      </p>
      <p className="hero-blurb" data-index="2">
        Vision alone cannot communicate materiality.
      </p>
      <p className="hero-blurb" data-index="3">
        We map tactile signatures to physical intuition.
      </p>
      <p className="hero-blurb" data-index="4">
        We teach your robots how to feel.
      </p>
    </div>
  );
}
