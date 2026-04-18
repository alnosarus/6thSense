import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ActivitySquare,
  Boxes,
  BrainCircuit,
  Wrench
} from "lucide-react";
import { ScrollHero } from "./ScrollHero.jsx";
import DeviceStory from "./DeviceStory.jsx";
import Credibility from "./Credibility.jsx";
import DataCatalog from "./DataCatalog.jsx";
import PlatformPipeline from "./PlatformPipeline.jsx";
import ScrollProgress from "./ScrollProgress.jsx";
import { useRevealNav } from "./useRevealNav.js";
import { useActiveNavSection } from "./useActiveNavSection.js";
import { tractionItems } from "./homeNarrative.js";

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

const iconByName = {
  ActivitySquare,
  Wrench,
  Boxes,
  BrainCircuit
};

function RenderIcon({ name }) {
  const Icon = iconByName[name];
  if (!Icon) return null;
  return <Icon size={16} strokeWidth={1.8} />;
}

function FaqChevron() {
  return (
    <svg className="faq-chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 5.25L7 8.75l3.5-3.5"
      />
    </svg>
  );
}

function AppInner() {
  const fadeUpProps = useFadeUp();
  const reduceMotion = useReducedMotion();
  const { className: navClassName, pastStory } = useRevealNav({ reduceMotion: !!reduceMotion });
  const activeNavKey = useActiveNavSection();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("idle");
  const [formShakeKey, setFormShakeKey] = useState(0);
  const [openFaq, setOpenFaq] = useState(-1);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("Enter a valid work email.");
      setStatusTone("error");
      setFormShakeKey((key) => key + 1);
      return;
    }
    setStatus("Received. The 6thSense team will follow up with a dataset scoping call.");
    setStatusTone("success");
    setEmail("");
  };

  const navClass = (key) => (activeNavKey === key ? "nav-link--active" : "");

  return (
    <>
      <ScrollProgress pastStory={pastStory} />

      <a href="#story" className="skip-link">
        Skip to content
      </a>

      <div className="grain grain--dark" aria-hidden="true" />

      <header className={navClassName} role="banner">
        <nav className="nav-flagship-inner" aria-label="Primary">
          <a className="wordmark wordmark-on-dark" href="#top">
            6THSENSE
          </a>
          <div className="nav-links nav-links-on-dark">
            <a href="#system" className={navClass("system")}>
              System
            </a>
            <a href="#catalog" className={navClass("catalog")}>
              Catalog
            </a>
            <a href="#credibility" className={navClass("credibility")}>
              Credibility
            </a>
            <a href="#faq" className={navClass("faq")}>
              FAQ
            </a>
            <a href="#waitlist" className="nav-cta nav-cta-on-dark">
              Talk to us
            </a>
          </div>
        </nav>
      </header>

      <main id="main" aria-label="6thSense">
        <div id="top" />
        <section id="rig-tour" aria-label="Hardware scroll tour">
          <ScrollHero />
        </section>
        <DeviceStory />

        <div className="page-after-hero">
          <section className="section traction-section" id="problem" aria-labelledby="problem-h">
            <motion.div {...fadeUpProps}>
              <p className="section-kicker-num">
                <span>01</span>
                Problem
              </p>
              <h2 id="problem-h" className="section-title">
                The problem we solve
              </h2>
              <ul className="traction-timeline">
                {tractionItems.map((item) => (
                  <li key={item.label} className="traction-item">
                    <span className="traction-icon-wrap" aria-hidden="true">
                      <RenderIcon name={item.icon} />
                    </span>
                    <span className="traction-label">{item.label}</span>
                    <h3 className="traction-title-row">{item.title}</h3>
                    <p>{item.detail}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          </section>

          <section className="section platform-section" id="system" aria-labelledby="system-h">
            <motion.div {...fadeUpProps}>
              <p className="section-kicker-num">
                <span>02</span>
                System
              </p>
              <h2 id="system-h" className="section-title">
                How we solve it
              </h2>
              <PlatformPipeline />
            </motion.div>
          </section>

          <DataCatalog />

          <Credibility />

          <section className="section faq" id="faq" aria-labelledby="faq-heading">
            <motion.div {...fadeUpProps}>
              <p className="section-kicker-num">
                <span>05</span>
                FAQ
              </p>
              <h2 id="faq-heading" className="section-title">
                Questions
              </h2>
              <div className="faq-list">
                {faq.map((item, i) => (
                  <div key={item.q} className={`faq-item${openFaq === i ? " faq-item--open" : ""}`}>
                    <button
                      type="button"
                      className="faq-q"
                      id={`faq-button-${i}`}
                      aria-expanded={openFaq === i}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    >
                      <span className="faq-q-text">{item.q}</span>
                      <FaqChevron />
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === i ? (
                        <motion.p
                          key="answer"
                          className="faq-a"
                          id={`faq-panel-${i}`}
                          role="region"
                          aria-labelledby={`faq-button-${i}`}
                          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={reduceMotion ? { height: "auto", opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: "hidden" }}
                        >
                          {item.a}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
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
                Tell us about the task. We&apos;ll scope the data.
              </p>
              <form
                className={`waitlist-form${statusTone === "error" ? " waitlist-form--error" : ""}`}
                onSubmit={onSubmit}
                noValidate
              >
                <label htmlFor="email">Work email</label>
                <p className="form-hint" id="email-hint">
                  Used only for technical follow-up and project scoping.
                </p>
                <motion.div
                  className="waitlist-input-wrap"
                  key={formShakeKey}
                  animate={statusTone === "error" && !reduceMotion ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.32 }}
                >
                  <input
                    id="email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    aria-describedby="email-hint"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (statusTone === "error") setStatusTone("idle");
                    }}
                    required
                  />
                </motion.div>
                <button type="submit">Discuss your dataset</button>
                <AnimatePresence mode="wait" initial={false}>
                  {status ? (
                    <motion.p
                      key={status}
                      className={`feedback feedback--${statusTone}`}
                      role="status"
                      aria-live="polite"
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0, y: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {statusTone === "success" ? <span className="feedback-check" aria-hidden="true">✓</span> : null}
                      {status}
                    </motion.p>
                  ) : (
                    <p className="feedback" role="status" aria-live="polite" />
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          </section>
        </div>
      </main>

      <footer className="footer footer-dark" role="contentinfo">
        <p>(c) 6thSense - Building the sixth sense.</p>
        <a href="#top">Back to top</a>
      </footer>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
