/**
 * Scrubbed beats inside HeroStageTwo's sticky window. Each is a positioned-
 * absolute layer gated by its own progress var written by HeroStageTwo's
 * rAF tick.
 *
 *   --pipeline-p   → PipelineSection
 *   --video-p      → VideoSection
 */

export function PipelineSection() {
  return (
    <section className="hero-section hero-pipeline">
      <h2 className="hero-pipeline-title">
        We label tactile data end&nbsp;to&nbsp;end.
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
