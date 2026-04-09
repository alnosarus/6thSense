import { useState, lazy, Suspense } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform
} from "framer-motion";
import { ScrollProvider } from "./ScrollContext.jsx";

const ProbeCanvas = lazy(() => import("./ProbeCanvas.jsx"));

const fadeUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
};

function useFadeUp() {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      initial: false,
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-80px" },
      transition: { duration: 0 }
    };
  }
  return fadeUp;
}

const verticals = [
  {
    title: "Surgical & interventional robotics",
    body: "Pre-contact mechanical context plus live pressure control for instruments that must not guess tissue state."
  },
  {
    title: "Soft-object manufacturing",
    body: "Food, textiles, pharma — deformable materials where vision-only stacks fail and crush/drop errors are expensive."
  },
  {
    title: "Consumer humanoids & service robots",
    body: "Irregular objects at home need both surface feedback and internal state at consumer-viable BOM."
  },
  {
    title: "Athletic & human performance",
    body: "Continuous muscle and tissue state — not snapshot scans — when contact and volume matter together."
  },
  {
    title: "Defense & exoskeletons",
    body: "Operator-aware systems that adapt to real tissue and load state under stress."
  },
  {
    title: "R&D & instrumentation partners",
    body: "Paired datasets and integration paths for labs building the next generation of touch-capable machines."
  }
];

const faq = [
  {
    q: "How is this different from a tactile sensor startup?",
    a: "Most teams ship surface sensing alone. SenseProbe treats surface contact and volumetric mechanical inference as one fused stack — closer to how biological motor control actually works."
  },
  {
    q: "Do you need custom ultrasound hardware everywhere?",
    a: "The roadmap couples research-grade sensing paths with pragmatic camera and signal paths where appropriate. The landing narrative is physics-first; deployment is stage-gated with partners."
  },
  {
    q: "What does the 3D visualization represent?",
    a: "An abstract assembly: fingertip body, sensing ring, embedded plane, optical marker — not a literal CAD release. It rotates with page scroll to echo “different angles of the same system.”"
  },
  {
    q: "Who is this for right now?",
    a: "Robotics OEMs, surgical platforms, and advanced manufacturing groups running pilots — plus research collaborators supplying paired data and domain validation."
  }
];

function HeroVisual() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 120]);
  const op = useTransform(scrollY, [0, 400], [1, 0.15]);
  if (reduce) {
    return <div className="hero-parallax-blob" style={{ opacity: 0.45 }} />;
  }
  return (
    <motion.div className="hero-parallax-blob" style={{ y: y1, opacity: op }} />
  );
}

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
    setStatus("Received. We will follow up for pilot fit.");
    setEmail("");
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <div className="grain" aria-hidden="true" />

      <header className="hero" id="top" role="banner">
        <HeroVisual />
        <nav className="nav-bar" aria-label="Primary">
          <span className="wordmark">SENSEPROBE</span>
          <div className="nav-links">
            <a href="#architecture">Architecture</a>
            <a href="#explorer">System</a>
            <a href="#proof">Proof</a>
            <a href="#compare">Contrast</a>
            <a href="#verticals">Markets</a>
            <a href="#waitlist" className="nav-cta">
              Talk to us
            </a>
          </div>
        </nav>

        <div className="hero-inner">
          <motion.div className="hero-copy" {...fadeUpProps}>
            <p className="kicker">Physical AI · Editorial preview</p>
            <h1>
              A complete artificial nervous system
              <span className="hero-line2">for machines that must touch the world.</span>
            </h1>
            <p className="hero-deck">
              We fuse <strong>surface tactile sensing</strong> with{" "}
              <strong>volumetric mechanical inference</strong> — the two channels
              biology uses together — into one deployable perception stack for
              robotics beyond “cameras + motors.”
            </p>
            <div className="hero-actions">
              <a href="#explorer" className="btn btn-solid">
                See how it moves
              </a>
              <a href="#waitlist" className="btn btn-line">
                Request a pilot conversation
              </a>
            </div>
            <p className="scroll-hint" aria-hidden="true">
              <span className="scroll-line" />
              Scroll
            </p>
          </motion.div>
        </div>
      </header>

      <main id="main" aria-label="SenseProbe product narrative">
        <section className="strip">
          <p>
            Research-grade thesis · Hardware-forward roadmap · ML that closes the loop between
            contact and volume
          </p>
        </section>

        <section
          id="architecture"
          className="section arch-section"
          aria-labelledby="arch-heading"
        >
          <motion.div {...fadeUpProps}>
            <h2 id="arch-heading" className="section-title">
              Three layers, one nervous system
            </h2>
            <p className="lead tight">
              Biology does not treat touch and mechanical state as separate products. SenseProbe
              mirrors that structure: a <strong>peripheral</strong> contact channel, a{" "}
              <strong>central</strong> volumetric channel, and a <strong>fusion</strong> layer
              that closes the loop for control.
            </p>
            <div className="arch-grid">
              <article className="arch-card">
                <p className="arch-badge">PNS · Peripheral</p>
                <h3>Surface tactile sensing</h3>
                <p>
                  Piezoresistive tactility at the finger: pressure, shear, and slip at the contact
                  patch—live feedback for manipulation, not a lab snapshot.
                </p>
              </article>
              <article className="arch-card">
                <p className="arch-badge">CNS · Central</p>
                <h3>Volumetric mechanical inference</h3>
                <p>
                  Ultrasound-informed readouts of stiffness trends and boundaries beneath the
                  surface—context before the end-effector commits.
                </p>
              </article>
              <article className="arch-card arch-card-accent">
                <p className="arch-badge">Fusion</p>
                <h3>One interaction model</h3>
                <p>
                  Coupled observations for planners and policies: the same stack human hands use
                  when contact and internal state must agree under uncertainty.
                </p>
              </article>
            </div>
          </motion.div>
        </section>

        <section id="explorer" className="explorer" aria-labelledby="explorer-heading">
          <div className="explorer-sticky">
            <Suspense
              fallback={
                <div className="probe-fallback" role="img" aria-label="Loading 3D visualization" />
              }
            >
              <ProbeCanvas />
            </Suspense>
            <ol className="probe-legend">
              <li>Surface: pressure, shear, slip</li>
              <li>Volume: stiffness & boundaries</li>
              <li>Fusion: one interaction model</li>
            </ol>
          </div>
          <div className="explorer-copy">
            <motion.article {...fadeUpProps}>
              <h2 id="explorer-heading" className="section-title">
                One product story, many angles
              </h2>
              <p className="lead">
                As you move through this page, the assembly rotates — surface ring, embedded
                plane, optical marker — a deliberate metaphor for “the same device, different
                failure modes addressed.”
              </p>
            </motion.article>
            <motion.div className="step-block" {...fadeUpProps}>
              <span className="step-num">01</span>
              <h3>Peripheral channel</h3>
              <p>
                Piezoresistive tactility at the contact patch: where force goes, how shear
                develops, when slip begins. Built for real manipulation loops, not lab demos
                alone.
              </p>
            </motion.div>
            <motion.div className="step-block" {...fadeUpProps}>
              <span className="step-num">02</span>
              <h3>Central channel</h3>
              <p>
                Ultrasound-informed inference of mechanical state beneath the surface — stiffness
                trends, boundaries, material context before the end-effector commits.
              </p>
            </motion.div>
            <motion.div className="step-block" {...fadeUpProps}>
              <span className="step-num">03</span>
              <h3>Fusion & control</h3>
              <p>
                A unified representation for planners and policies: predictive map + live
                correction — the same pairing human hands use when precision matters.
              </p>
            </motion.div>
            <motion.div className="step-block" {...fadeUpProps}>
              <span className="step-num">04</span>
              <h3>Deployment path</h3>
              <p>
                Sub-$30 class tactile economics at the finger, camera-forward inference where
                appropriate, integration lanes for industrial arms and clinical platforms.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="section editorial" id="problem" aria-labelledby="problem-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="problem-heading" className="section-title">
              Why “more cameras” stopped working
            </h2>
            <div className="two-col">
              <div>
                <p className="pull-quote">
                  Robots have extraordinary vision and almost no sense of what objects are
                  <em> made of</em> at depth.
                </p>
              </div>
              <div className="body-col">
                <p>
                  Contact-only tactility wears, saturates, or misses subsurface state. Pure
                  volumetric sensing without live contact struggles the moment the task needs
                  human-level dexterity. SenseProbe is built around the union of both — not a
                  modest sensor upgrade, but a different abstraction for physical AI.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="proof" className="section proof-section" aria-labelledby="proof-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="proof-heading" className="section-title">
              Proof from the bench
            </h2>
            <p className="lead tight">
              Claims tied to active R&amp;D in this repo—not slide hypotheticals.
            </p>
            <ol className="proof-list">
              <li>
                <strong>Stiffness signal from standard B-mode.</strong> ML experiments on paired
                ultrasound data show recoverable mechanical contrast without dedicated elastography
                hardware everywhere—see project experiments and results artifacts.
              </li>
              <li>
                <strong>Tactile economics at the finger.</strong> Roadmap targets sub-$30 BOM-class
                piezoresistive assemblies for deployable manipulation, not one-off lab stacks.
              </li>
              <li>
                <strong>Fusion-shaped loop.</strong> Training and evaluation pipelines treat contact
                streams and volumetric inference as coupled channels—aligned with how policies
                should consume them.
              </li>
            </ol>
          </motion.div>
        </section>

        <section className="section section-dark" id="compare" aria-labelledby="compare-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="compare-heading" className="section-title light">
              The contrast, made blunt
            </h2>
            <div className="compare-grid">
              <div className="compare-card compare-muted">
                <h3>Surface-only robotics</h3>
                <ul>
                  <li>Contact without volumetric context</li>
                  <li>Surprise failures on soft tissue and deformables</li>
                  <li>Harder safety cases in human-adjacent tasks</li>
                </ul>
              </div>
              <div className="compare-card compare-accent">
                <h3>SenseProbe stack</h3>
                <ul>
                  <li>Live contact + inferred internal state</li>
                  <li>Richer priors for manipulation policies</li>
                  <li>A story investors and safety reviewers can trace to physics</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="section bento-wrap" id="system" aria-labelledby="system-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="system-heading" className="section-title">
              System surfaces
            </h2>
            <div className="bento">
              <div className="bento-a">
                <h3>Hardware</h3>
                <p>
                  Fingertip-scale assemblies, custom readout paths, integration targets from
                  research benches to industrial arms.
                </p>
              </div>
              <div className="bento-b">
                <h3>Signal + optics</h3>
                <p>
                  Multiplexed acquisition, calibration discipline, optical cross-checks where the
                  physics demands redundancy.
                </p>
              </div>
              <div className="bento-c">
                <h3>Models</h3>
                <p>
                  Fusion architectures that treat contact streams and volumetric inference as
                  coupled observations — not two disconnected demos.
                </p>
              </div>
              <div className="bento-d">
                <h3>Data flywheel</h3>
                <p>
                  Paired supervision that becomes more valuable as deployments grow — the
                  long-term moat is not a single model checkpoint.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="section metrics" aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="visually-hidden">
            At a glance
          </h2>
          <motion.div className="metrics-row" {...fadeUpProps}>
            <div>
              <span className="metric-val">2×</span>
              <span className="metric-label">Sensing channels fused</span>
            </div>
            <div>
              <span className="metric-val">Sub-$30</span>
              <span className="metric-label">Tactile BOM class target</span>
            </div>
            <div>
              <span className="metric-val">∞</span>
              <span className="metric-label">Verticals where deformables dominate</span>
            </div>
          </motion.div>
        </section>

        <section className="section" id="verticals" aria-labelledby="verticals-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="verticals-heading" className="section-title">
              Where it lands first
            </h2>
            <p className="lead tight">
              Long-horizon vision, near-term wedges. Same stack, different GTM skins — surgical
              rigor, factory throughput, or human-scale robots at home.
            </p>
            <div className="vertical-grid">
              {verticals.map((v) => (
                <article key={v.title} className="vertical-card">
                  <h3>{v.title}</h3>
                  <p>{v.body}</p>
                </article>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="section quotes" aria-labelledby="quotes-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="quotes-heading" className="section-title">
              What partners are buying
            </h2>
            <div className="quote-grid">
              <blockquote>
                “A manipulation story grounded in tissue and material physics — not another
                generic ‘AI vision’ slide.”
                <cite>— Robotics platform lead (pilot discussion)</cite>
              </blockquote>
              <blockquote>
                “If contact and volume are actually one loop, safety and task success become
                easier to reason about.”
                <cite>— Clinical robotics advisor</cite>
              </blockquote>
              <blockquote>
                “We do not need more pixels. We need state inside soft things before we break
                them.”
                <cite>— Manufacturing R&amp;D director</cite>
              </blockquote>
            </div>
          </motion.div>
        </section>

        <section className="section faq" id="faq" aria-labelledby="faq-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="faq-heading" className="section-title">
              Direct questions
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

        <section className="section waitlist" id="waitlist" aria-labelledby="waitlist-heading">
          <motion.div {...fadeUpProps}>
            <h2 id="waitlist-heading" className="section-title">
              Start a technical conversation
            </h2>
            <p className="lead tight">
              We work with teams that can run pilots, supply paired data, or co-develop
              integration on real platforms — not slide-only intros.
            </p>
            <form className="waitlist-form" onSubmit={onSubmit} noValidate>
              <label htmlFor="email">Work email</label>
              <p className="form-hint" id="email-hint">
                Used only to follow up on pilot fit. No marketing list.
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
              <button type="submit">Request follow-up</button>
              <p className="feedback" role="status" aria-live="polite">
                {status}
              </p>
            </form>
          </motion.div>
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <p>SenseProbe — surface tactility + volumetric inference for physical AI.</p>
        <a href="#top">Back to top</a>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <ScrollProvider>
      <AppInner />
    </ScrollProvider>
  );
}
