import { TargetReveal } from "./TargetReveal.jsx";

/**
 * Right-side copy that swaps with scroll beats. Each blurb has a data-index
 * and is visible only when --active-blurb matches. Selection is done via a
 * chain of CSS rules (see scroll-hero.css) to keep this render-free.
 *
 * Five blurbs map 1:1 with the five hand poses in narrative order:
 * pointy, +middle, +ring, +pinky, open palm.
 *
 * Each blurb has 1–2 target words (highlighted in lime via TargetReveal,
 * which slides a vertical line across the word and fades letters in
 * sequentially). Within a blurb, targets play strictly in `order` sequence.
 */
export function HeroBlurbs() {
  return (
    <div className="hero-blurbs" aria-live="polite">
      <p className="hero-blurb" data-index="0">
        Robots can tell the difference between a{" "}
        <TargetReveal text="glass cup" blurbIndex={0} order={0} /> and a{" "}
        <TargetReveal text="paper cup" blurbIndex={0} order={1} />.
      </p>
      <p className="hero-blurb" data-index="1">
        But they do it by{" "}
        <TargetReveal text="looking" blurbIndex={1} order={0} />, not by{" "}
        <TargetReveal text="feeling" blurbIndex={1} order={1} />.
      </p>
      <p className="hero-blurb" data-index="2">
        Vision <TargetReveal text="alone" blurbIndex={2} order={0} /> cannot
        communicate{" "}
        <TargetReveal text="materiality" blurbIndex={2} order={1} />.
      </p>
      <p className="hero-blurb" data-index="3">
        We map <TargetReveal text="tactile" blurbIndex={3} order={0} />{" "}
        signatures to physical{" "}
        <TargetReveal text="intuition" blurbIndex={3} order={1} />.
      </p>
      <p className="hero-blurb" data-index="4">
        We <TargetReveal text="teach" blurbIndex={4} order={0} /> your robots
        how to <TargetReveal text="feel" blurbIndex={4} order={1} />.
      </p>
    </div>
  );
}
