/**
 * Right-side copy that swaps with scroll beats. Each blurb has a data-index
 * and is visible only when --active-blurb matches. Selection is done via a
 * chain of CSS rules (see scroll-hero.css) to keep this render-free.
 */
export function HeroBlurbs() {
  return (
    <div className="hero-blurbs" aria-live="polite">
      <p className="hero-blurb" data-index="0">
        Robots have five senses.
      </p>
      <p className="hero-blurb" data-index="1">Sight</p>
      <p className="hero-blurb" data-index="2">Sound</p>
      <p className="hero-blurb" data-index="3">Smell</p>
      <p className="hero-blurb" data-index="4">Taste</p>
      <p className="hero-blurb" data-index="5">Touch</p>
      <p className="hero-blurb" data-index="6">
        We&rsquo;re building the sixth.
      </p>
    </div>
  );
}
