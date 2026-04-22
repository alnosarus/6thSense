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
 * Brown dot start positions track the glove's paint rect (--glove-x/y/w/h)
 * exposed by ScrollStage: start = glove-origin + tip * glove-size, so the dots
 * stay on the fingertips regardless of viewport size or glove zoom.
 */
// Fingertip coords are normalized (u, v) in the source PNG (2752×1536),
// measured once by alpha-scanning the open-hand frame (frame-005).
// End positions: tight stair on upper-left with 3% horizontal + 6% vertical
// step, mirroring the opener's 180px logo grid.
// Ordered bottom-left → top-right (olive last).
const dots = [
  { tipU: 0.6235, tipV: 0.1810, endLeft: 18, endTop: 56, color: "brown" }, // pinky
  { tipU: 0.5683, tipV: 0.0879, endLeft: 21, endTop: 56, color: "brown" }, // ring
  { tipU: 0.5058, tipV: 0.0417, endLeft: 21, endTop: 50, color: "brown" }, // middle
  { tipU: 0.4415, tipV: 0.0703, endLeft: 24, endTop: 50, color: "brown" }, // index
  { tipU: 0.3656, tipV: 0.3151, endLeft: 24, endTop: 44, color: "brown" }, // thumb
  { startLeft: 27, startTop: 44, endLeft: 27, endTop: 44, color: "olive" }
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
      {dots.map((d, i) => {
        const style = d.color === "brown"
          ? {
              "--tip-u": d.tipU,
              "--tip-v": d.tipV,
              "--end-left": `${d.endLeft}%`,
              "--end-top": `${d.endTop}%`
            }
          : {
              "--start-left": `${d.startLeft}%`,
              "--start-top": `${d.startTop}%`,
              "--end-left": `${d.endLeft}%`,
              "--end-top": `${d.endTop}%`
            };
        return (
          <span
            key={i}
            className={`finale-dot finale-dot--${d.color}`}
            aria-hidden="true"
            style={style}
          />
        );
      })}

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
