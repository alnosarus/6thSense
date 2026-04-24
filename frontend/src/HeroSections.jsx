/**
 * Scrubbed beats inserted between the hero's assemble and form phases.
 * Each is a positioned-absolute layer inside .scroll-hero-sticky, gated by
 * its own progress var written by ScrollStage's rAF tick.
 *
 *   --vulcan-p / --columbia-p / --stanford-p / --meta-p  → QuoteBeat opacity
 *   --pipeline-p                                         → PipelineSection
 *   --video-p                                            → VideoSection
 */

/**
 * Shared typographic "quote + logo" layout used for all four research citations.
 * The progressVar is aliased onto a local --quote-p so .hero-quote's CSS only
 * references one variable regardless of which beat is active.
 */
function QuoteBeat({ progressVar, logoSrc, logoAlt, attribution, children }) {
  return (
    <section
      className="hero-section hero-quote"
      style={{ "--quote-p": `var(${progressVar})` }}
    >
      <p className="hero-quote-text">{children}</p>
      <img
        className="hero-quote-logo"
        src={logoSrc}
        alt={logoAlt}
        loading="lazy"
      />
      {attribution ? (
        <p className="hero-quote-attr">{attribution}</p>
      ) : null}
    </section>
  );
}

export function VulcanQuote() {
  return (
    <QuoteBeat
      progressVar="--vulcan-p"
      logoSrc="/amazon-robotics-logo.png"
      logoAlt="Amazon Robotics"
      attribution="Vulcan · manipulation tasks"
    >
      Vision alone solves <em>30%</em> of manipulation tasks.
      Touch raises it to <em className="hero-quote-accent">90%</em>.
    </QuoteBeat>
  );
}

export function ColumbiaQuote() {
  return (
    <QuoteBeat
      progressVar="--columbia-p"
      logoSrc="/Columbia.png"
      logoAlt="Columbia Engineering · Robotic Manipulation and Mobility Lab"
      attribution="Matei Ciocarlie"
    >
      Robot hands can be highly dexterous —{" "}
      <em className="hero-quote-accent">based on touch sensing alone</em>.
    </QuoteBeat>
  );
}

export function StanfordQuote() {
  return (
    <QuoteBeat
      progressVar="--stanford-p"
      logoSrc="/stanford.avif"
      logoAlt="Stanford"
      attribution="DenseTact · Kennedy Lab"
    >
      Dexterity depends on{" "}
      <em className="hero-quote-accent">continuous, soft-contact</em>{" "}
      touch feedback.
    </QuoteBeat>
  );
}

export function MetaQuote() {
  return (
    <QuoteBeat
      progressVar="--meta-p"
      logoSrc="/Meta.png"
      logoAlt="Meta AI"
      attribution="DIGIT · PyTouch"
    >
      Touch is how robots will{" "}
      <em className="hero-quote-accent">perceive, understand, and interact</em>{" "}
      with the physical world.
    </QuoteBeat>
  );
}

export function PipelineSection() {
  return (
    <section className="hero-section hero-pipeline">
      <h2 className="hero-pipeline-title">
        Label tactile data end&nbsp;to&nbsp;end.
      </h2>
      <ol className="hero-pipeline-row">
        <li>Collect</li>
        <li>Synchronize</li>
        <li>Label</li>
        <li>Validate</li>
        <li>Ship</li>
      </ol>
    </section>
  );
}

export function VideoSection() {
  return (
    <section className="hero-section hero-video">
      <h2 className="hero-video-title">See the data.</h2>
      <div className="hero-video-frame" aria-hidden="true">
        <span className="hero-video-frame-label">Sample dataset preview</span>
      </div>
    </section>
  );
}
