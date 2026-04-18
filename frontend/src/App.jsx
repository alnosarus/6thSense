import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import DeviceStory from "./DeviceStory.jsx";
import { tractionItems, platformPillars } from "./homeNarrative.js";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-72px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

function useFadeUp() {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      initial: false,
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-72px" },
      transition: { duration: 0 }
    };
  }
  return fadeUp;
}

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

function AppInner() {
  const fadeUpProps = useFadeUp();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

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
      <a href="#story" className="skip-link">
        Skip to content
      </a>

      <div className="grain grain--dark" aria-hidden="true" />

      <header className="nav-flagship" role="banner">
        <nav className="nav-flagship-inner" aria-label="Primary">
          <a className="wordmark wordmark-on-dark" href="#top">
            6THSENSE
          </a>
          <div className="nav-links nav-links-on-dark">
            <a href="#story">Story</a>
            <a href="#traction">Problem</a>
            <a href="#platform">Platform</a>
            <a href="#representation">Data semantics</a>
            <a href="#faq">Questions</a>
            <a href="#waitlist" className="nav-cta nav-cta-on-dark">
              Talk to us
            </a>
          </div>
        </nav>
      </header>

      <main id="main" aria-label="6thSense">
        <div id="top" />
        <DeviceStory />

        <div className="page-after-hero">
        <section className="proof-strip" aria-label="Research basis">
          <p>
            <strong>We build custom tactile egocentric datasets for robotics teams</strong> by
            delivering the full data collection stack: hardware, capture pipeline, calibration,
            quality control, and model-ready packaging.
          </p>
        </section>

        <section className="section traction-section" id="traction" aria-labelledby="traction-h">
          <motion.div {...fadeUpProps}>
            <h2 id="traction-h" className="section-title">
              The problem we solve
            </h2>
            <p className="lead tight traction-deck">
              Most robot datasets miss the human-side contact signals that drive robust
              manipulation. We focus on the missing layer between vision, action, and touch.
            </p>
            <ul className="traction-timeline">
              {tractionItems.map((item) => (
                <li key={item.label} className="traction-item">
                  <span className="traction-label">{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        <section className="section platform-section" id="platform" aria-labelledby="platform-h">
          <motion.div {...fadeUpProps}>
            <h2 id="platform-h" className="section-title">
              How we solve it
            </h2>
            <p className="lead tight">
              Our product is not a glove, camera rig, or raw file dump. It is a full-stack,
              quality-controlled data pipeline for robot learning teams.
            </p>
            <div className="platform-grid">
              {platformPillars.map((p) => (
                <article key={p.title} className="platform-card">
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </article>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="section" id="representation" aria-labelledby="representation-h">
          <motion.div {...fadeUpProps}>
            <h2 id="representation-h" className="section-title">
              What the data represents
            </h2>
            <p className="lead tight">
              We capture actionable contact structure: onset, offset, relative force trends, grasp
              changes, and distribution shifts aligned with egocentric vision and motion.
            </p>
            <div className="platform-grid">
              <article className="platform-card">
                <h3>Delivered streams</h3>
                <p>
                  Tactile/contact proxy signals, egocentric video, hand motion data, synchronized
                  timestamps, task segmentation, annotations, and quality metrics.
                </p>
              </article>
              <article className="platform-card">
                <h3>Use-case alignment</h3>
                <p>
                  Structured for imitation learning, behavior cloning, multimodal policy learning,
                  contact-aware manipulation research, and benchmark evaluation.
                </p>
              </article>
              <article className="platform-card">
                <h3>Reliability over hype</h3>
                <p>
                  We document calibration boundaries and signal semantics so teams train against
                  realistic contact representations, not fictional precision claims.
                </p>
              </article>
              <article className="platform-card">
                <h3>Tailored packaging</h3>
                <p>
                  Data format, metadata, and episode structure are adapted to each customer
                  training stack and manipulation task family.
                </p>
              </article>
            </div>
          </motion.div>
        </section>

        <section className="section faq" id="faq" aria-labelledby="faq-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="faq-heading" className="section-title">
              Who this is for
            </h2>
            <p className="lead tight">
              Teams building dexterous manipulation systems and contact-rich robot learning
              pipelines that need better real-world human demonstration data.
            </p>
            <div className="platform-grid">
              <article className="platform-card">
                <h3>Current wedge</h3>
                <p>
                  Custom tactile egocentric datasets for robotics customers with specific
                  manipulation objectives and quality bars.
                </p>
              </article>
              <article className="platform-card">
                <h3>Long-term vision</h3>
                <p>
                  Become the infrastructure layer for collecting and packaging multimodal
                  contact-rich datasets that power robot foundation models.
                </p>
              </article>
            </div>
            <h2 className="section-title" style={{ marginTop: "2.5rem" }}>
              Questions
            </h2>
            <div className="faq-list">
              {faq.map((item, i) => (
                <div key={item.q} className="faq-item">
                  <button
                    type="button"
                    className="faq-q"
                    id={`faq-button-${i}`}
                    aria-expanded={openFaq === i}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    {item.q}
                  </button>
                  {openFaq === i ? (
                    <p
                      className="faq-a"
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-button-${i}`}
                    >
                      {item.a}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="section waitlist waitlist-final" id="waitlist" aria-labelledby="waitlist-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="waitlist-heading" className="section-title">
              Start a dataset conversation
            </h2>
            <p className="lead tight">
              Tell us your manipulation task family, sensing requirements, and training pipeline.
              We will scope the right tactile egocentric data program for your team.
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
              <p className="feedback" role="status" aria-live="polite">
                {status}
              </p>
            </form>
          </motion.div>
        </section>
        </div>
      </main>

      <footer className="footer footer-dark" role="contentinfo">
        <p>
          6thSense — custom tactile egocentric datasets with synchronized capture, calibration, QC,
          and model-ready delivery for robotics teams.
        </p>
        <a href="#top">Back to top</a>
      </footer>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
