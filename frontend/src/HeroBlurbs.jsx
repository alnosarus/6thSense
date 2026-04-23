/**
 * Right-side copy that swaps with scroll beats. Each blurb has a data-index
 * and is visible only when --active-blurb matches. Selection is done via a
 * chain of CSS rules (see scroll-hero.css) to keep this render-free.
 */
export function HeroBlurbs() {
  return (
    <div className="hero-blurbs" aria-live="polite">
      <p className="hero-blurb" data-index="0">Robots can see.</p>
      <p className="hero-blurb" data-index="1">Hear.</p>
      <p className="hero-blurb" data-index="2">Speak.</p>
      <p className="hero-blurb" data-index="3">Plan.</p>
      <p className="hero-blurb" data-index="4">Move.</p>
      <p className="hero-blurb" data-index="5">Grasp.</p>
      <p className="hero-blurb" data-index="6">
        They still can&rsquo;t feel what they hold.
      </p>
    </div>
  );
}
