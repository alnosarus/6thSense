/**
 * Three scrubbed beats inserted between the hero's assemble and form phases.
 * Each is a positioned-absolute layer inside .scroll-hero-sticky, gated by
 * its own progress var (--stat-p / --pipeline-p / --video-p) written by
 * ScrollStage's rAF tick. Pipeline and Video are added in subsequent tasks.
 */

export function StatSection() {
  return (
    <section
      className="hero-section hero-stat"
      aria-label="Vision alone solves 30 percent of manipulation tasks; with touch, 90 percent. Amazon Vulcan."
    >
      <div className="hero-finale-stat">
        <div className="hero-finale-stat-unit">
          <span className="hero-finale-stat-label hero-finale-stat-label--left">
            vision<br />alone
          </span>
          <span className="hero-finale-stat-num">
            30<span className="hero-finale-stat-pct">%</span>
          </span>
        </div>
        <span className="hero-finale-stat-arrow" aria-hidden="true">→</span>
        <div className="hero-finale-stat-unit hero-finale-stat-unit--accent">
          <span className="hero-finale-stat-num">
            90<span className="hero-finale-stat-pct">%</span>
          </span>
          <span className="hero-finale-stat-label hero-finale-stat-label--right">
            with<br />touch
          </span>
        </div>
      </div>
      <p className="hero-finale-stat-attr">
        Amazon Vulcan &middot; manipulation tasks
      </p>
    </section>
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
