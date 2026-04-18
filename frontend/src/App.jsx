import { useState } from "react";
import { ScrollHero } from "./ScrollHero.jsx";

const tractionItems = [
  {
    num: "01",
    title: "Contact onset and grip evolution are under-captured",
    body: "Most datasets miss touch timing, pressure trends, and subtle adjustments that matter in dexterous manipulation."
  },
  {
    num: "02",
    title: "Off-the-shelf tools produce unusable raw dumps",
    body: "Standalone sensors and recording scripts often fail calibration, synchronization, and dataset reliability requirements."
  },
  {
    num: "03",
    title: "Teams need packaged data, not hardware babysitting",
    body: "Robot learning teams want high-value datasets, not multi-month setup and QC work for each collection effort."
  },
  {
    num: "04",
    title: "Manipulation progress is data-constrained",
    body: "For contact-rich tasks, the next performance gains come from better multimodal demonstrations, not model scale alone."
  }
];

const platformBlocks = [
  {
    title: "Custom capture hardware",
    body: "Wearable and sensor configurations tailored to each customer task and manipulation environment.",
    meta: [["domain", "glove · head · chest · compute"]]
  },
  {
    title: "Synchronized multimodal recording",
    body: "Tactile / contact proxies, egocentric video, and hand motion signals recorded as frame-locked sequences with task metadata.",
    meta: [["streams", "tactile · rgb · pose"]]
  },
  {
    title: "Calibration and reliability workflows",
    body: "Signal drift, fit shifts, channel instability, and timing checks are handled before data reaches training.",
    meta: [["stage", "pre-release qc"]]
  },
  {
    title: "Dataset QC and packaging",
    body: "Task segmentation, annotations, failure flags, and documentation shipped in your training stack's schema.",
    meta: [["format", "model-ready"]]
  }
];

const representationBlocks = [
  {
    title: "Delivered streams",
    body: "Tactile / contact proxy signals, egocentric video, hand motion data, synchronized timestamps, task segmentation, annotations, and quality metrics."
  },
  {
    title: "Use-case alignment",
    body: "Structured for imitation learning, behavior cloning, multimodal policy learning, contact-aware manipulation research, and benchmark evaluation."
  },
  {
    title: "Reliability over hype",
    body: "We document calibration boundaries and signal semantics so teams train against realistic contact representations, not fictional precision claims."
  },
  {
    title: "Tailored packaging",
    body: "Data format, metadata, and episode structure are adapted to each customer training stack and manipulation task family."
  }
];

const faq = [
  {
    q: "Are tactile signals perfect ground-truth force values?",
    a: "Not always. We explicitly treat many streams as contact and pressure proxies, and document assumptions so model teams know how to use them."
  },
  {
    q: "Do you only provide sensors or raw recording tools?",
    a: "No. 6thSense is a full-stack data partner: hardware setup, synchronized capture, calibration, QC, and packaged model-ready datasets."
  },
  {
    q: "What teams are the best fit?",
    a: "Robotics teams running dexterous manipulation, imitation learning, multimodal policy training, or contact-aware evaluation workflows."
  }
];

export default function App() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("Enter a valid work email.");
      return;
    }
    setStatus("Received. The 6thSense team will follow up with a dataset scoping call.");
    setEmail("");
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="nav" role="banner">
        <a className="nav-wordmark" href="#top" aria-label="6thSense home">
          6THSENSE
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#traction">Problem</a>
          <a href="#platform">Platform</a>
          <a href="#representation">Data</a>
          <a href="#faq">Questions</a>
          <a href="#waitlist" className="nav-cta">Talk to us</a>
        </nav>
      </header>

      <main id="main">
        <div id="top" />
        <ScrollHero />

        <div className="page">
          <section className="proof-strip" aria-label="Research basis">
            <p>
              <strong>We build custom tactile-egocentric datasets for robotics teams</strong> by
              delivering the full data-collection stack: hardware, capture pipeline, calibration,
              quality control, and model-ready packaging.
            </p>
          </section>

          <section className="section" id="traction" aria-labelledby="traction-h">
            <p className="section-kicker">The problem we solve</p>
            <h2 id="traction-h" className="section-title">
              Missing between vision, action, and touch.
            </h2>
            <p className="section-lead">
              Most robot datasets miss the human-side contact signals that drive robust
              manipulation. We focus on the missing layer.
            </p>
            <ol className="ord-list">
              {tractionItems.map((item) => (
                <li key={item.num}>
                  <span className="ord-num">{item.num}</span>
                  <div>
                    <h3 className="ord-title">{item.title}</h3>
                    <p className="ord-body">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="section" id="platform" aria-labelledby="platform-h">
            <p className="section-kicker">How we solve it</p>
            <h2 id="platform-h" className="section-title">
              A full-stack, quality-controlled data pipeline.
            </h2>
            <p className="section-lead">
              Our product is not a glove, camera rig, or raw file dump. It is a full-stack,
              quality-controlled data pipeline for robot learning teams.
            </p>
            <div className="stack">
              {platformBlocks.map((p) => (
                <article key={p.title} className="stack-item">
                  <h3 className="stack-title">{p.title}</h3>
                  <p className="stack-body">{p.body}</p>
                  {p.meta ? (
                    <dl className="stack-meta">
                      {p.meta.map(([k, v]) => (
                        <span key={k} style={{ display: "contents" }}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </span>
                      ))}
                    </dl>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="section" id="representation" aria-labelledby="representation-h">
            <p className="section-kicker">What the data represents</p>
            <h2 id="representation-h" className="section-title">
              Actionable contact structure, aligned to vision and motion.
            </h2>
            <p className="section-lead">
              We capture onset, offset, relative force trends, grasp changes, and distribution
              shifts — synchronized with egocentric video and hand motion.
            </p>
            <div className="stack">
              {representationBlocks.map((p) => (
                <article key={p.title} className="stack-item">
                  <h3 className="stack-title">{p.title}</h3>
                  <p className="stack-body">{p.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section" id="faq" aria-labelledby="faq-h">
            <p className="section-kicker">Questions</p>
            <h2 id="faq-h" className="section-title">
              Common questions.
            </h2>
            <div className="faq-list">
              {faq.map((item) => (
                <div key={item.q} className="faq-item">
                  <h3 className="faq-q">{item.q}</h3>
                  <p className="faq-a">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section waitlist" id="waitlist" aria-labelledby="waitlist-h">
            <p className="section-kicker">Start a conversation</p>
            <h2 id="waitlist-h" className="section-title">
              Scope a dataset.
            </h2>
            <p className="section-lead">
              Tell us your manipulation task family, sensing requirements, and training pipeline.
              We will scope the right tactile-egocentric data program for your team.
            </p>
            <form className="waitlist-form" onSubmit={onSubmit} noValidate>
              <label htmlFor="email">Work email</label>
              <p className="form-hint" id="email-hint">
                Used only for technical follow-up and project scoping.
              </p>
              <input
                id="email"
                type="email"
                value={email}
                autoComplete="email"
                aria-describedby="email-hint"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit">Discuss your dataset</button>
              <p className="waitlist-feedback" role="status" aria-live="polite">
                {status}
              </p>
            </form>
          </section>

          <footer className="footer" role="contentinfo">
            <p>
              6thSense — custom tactile-egocentric datasets with synchronized capture,
              calibration, QC, and model-ready delivery for robotics teams.
            </p>
            <a href="#top">Back to top</a>
          </footer>
        </div>
      </main>
    </>
  );
}
