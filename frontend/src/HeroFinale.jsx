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
// Start positions (%): measured fingertip spots on the open-hand frame,
//   thumb/index/middle/ring/pinky from left to right as the palm faces camera.
// End positions: tight stair on upper-left with 3% horizontal + 6% vertical
//   step, mirroring the opener's 180px logo grid.
// Ordered bottom-left → top-right (olive last).
const dots = [
  { startLeft: 33, startTop: 47, endLeft: 18, endTop: 43, color: "brown" }, // pinky
  { startLeft: 30, startTop: 44, endLeft: 21, endTop: 43, color: "brown" }, // ring
  { startLeft: 26, startTop: 42, endLeft: 21, endTop: 37, color: "brown" }, // middle
  { startLeft: 23, startTop: 44, endLeft: 24, endTop: 37, color: "brown" }, // index
  { startLeft: 20, startTop: 60, endLeft: 24, endTop: 31, color: "brown" }, // thumb
  { startLeft: 27, startTop: 31, endLeft: 27, endTop: 31, color: "olive" }
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
