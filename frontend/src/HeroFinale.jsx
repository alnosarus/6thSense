/**
 * Finale scene: 5 brown dots rise from fingertip positions and assemble into
 * a compact 6-dot logo stair in the upper-right; the olive 6th dot fades in
 * as the browns settle; the finished logo then shifts slightly right while a
 * "Start a dataset conversation" CTA slides in from off-right.
 *
 * All positioning/opacity driven by --assemble-p and --shift-p, written by
 * ScrollStage.
 *
 * Start positions (%): fingertip spots when the open hand is rendered at
 * x-anchor 0.25. End positions: compact logo stair in upper-right area,
 * above the CTA. Keep the stair tight (~20% viewport span) so it reads
 * as a logo, not a scattered constellation.
 */
const dots = [
  // Mirror opener stair — bottom-left first, top-right last (olive).
  { startLeft: 42, startTop: 54, endLeft: 62, endTop: 42, color: "brown" },  // d1
  { startLeft: 36, startTop: 50, endLeft: 67, endTop: 42, color: "brown" },  // d2
  { startLeft: 30, startTop: 46, endLeft: 67, endTop: 34, color: "brown" },  // d3
  { startLeft: 24, startTop: 50, endLeft: 72, endTop: 34, color: "brown" },  // d4
  { startLeft: 20, startTop: 72, endLeft: 72, endTop: 26, color: "brown" },  // d5 (thumb)
  { startLeft: 77, startTop: 26, endLeft: 77, endTop: 26, color: "olive" }   // d6
];

export function HeroFinale() {
  return (
    <div className="hero-finale" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`finale-dot finale-dot--${d.color}`}
          data-dot={i + 1}
          style={{
            "--start-left": `${d.startLeft}%`,
            "--start-top": `${d.startTop}%`,
            "--end-left": `${d.endLeft}%`,
            "--end-top": `${d.endTop}%`
          }}
        />
      ))}
      <a href="#waitlist" className="hero-finale-cta">
        Start a dataset conversation
        <span aria-hidden="true"> →</span>
      </a>
    </div>
  );
}
