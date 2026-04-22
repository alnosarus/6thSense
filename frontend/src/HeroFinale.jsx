import { useState } from "react";

/**
 * Finale scene: 5 brown dots rise from fingertip positions to form the 6-dot
 * logo stair on the LEFT side of the viewport. The olive 6th dot materializes
 * as the browns settle. On the RIGHT, a dataset-conversation form fades in.
 *
 * Phase timing (driven by CSS vars from ScrollStage):
 *   0.55–0.85  assemble: hand canvas descends, dots fade in (30%) then
 *              move (70%) to their logo stair positions on the left.
 *   0.80–0.95  shift: waitlist form fades in on the right.
 *
 * Positions are percentages of viewport. Start positions approximate the
 * fingertip spots when the open hand is rendered at x-anchor 0.25.
 */
const dots = [
  // Compact logo stair in upper-left, mirroring the opener's 180px grid.
  // Ordered bottom-left → top-right (olive last).
  { startLeft: 32, startTop: 54, endLeft: 18, endTop: 43, color: "brown" },
  { startLeft: 28, startTop: 48, endLeft: 21, endTop: 43, color: "brown" },
  { startLeft: 25, startTop: 46, endLeft: 21, endTop: 37, color: "brown" },
  { startLeft: 22, startTop: 48, endLeft: 24, endTop: 37, color: "brown" },
  { startLeft: 19, startTop: 56, endLeft: 24, endTop: 30, color: "brown" },
  { startLeft: 28, startTop: 30, endLeft: 28, endTop: 30, color: "olive" }
];

export function HeroFinale() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [tone, setTone] = useState("idle");

  const onSubmit = (event) => {
    event.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("Enter a valid work email.");
      setTone("error");
      return;
    }
    setStatus("Received. The 6thSense team will follow up with a dataset scoping call.");
    setTone("success");
    setEmail("");
  };

  return (
    <div className="hero-finale">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`finale-dot finale-dot--${d.color}`}
          aria-hidden="true"
          style={{
            "--start-left": `${d.startLeft}%`,
            "--start-top": `${d.startTop}%`,
            "--end-left": `${d.endLeft}%`,
            "--end-top": `${d.endTop}%`
          }}
        />
      ))}

      <form className="hero-finale-form" onSubmit={onSubmit} noValidate>
        <h2 className="hero-finale-title">Start a dataset conversation</h2>
        <p className="hero-finale-subtitle">
          Tell us about the task. We&rsquo;ll scope the data.
        </p>
        <label className="hero-finale-label" htmlFor="hero-email">
          Work email
        </label>
        <p className="hero-finale-hint" id="hero-email-hint">
          Used only for technical follow-up and project scoping.
        </p>
        <input
          id="hero-email"
          type="email"
          autoComplete="email"
          value={email}
          aria-describedby="hero-email-hint"
          onChange={(e) => {
            setEmail(e.target.value);
            if (tone === "error") setTone("idle");
          }}
          required
        />
        <button type="submit" className="hero-finale-submit">
          Discuss your dataset
        </button>
        {status ? (
          <p
            className={`hero-finale-status hero-finale-status--${tone}`}
            role="status"
            aria-live="polite"
          >
            {status}
          </p>
        ) : null}
      </form>
    </div>
  );
}
