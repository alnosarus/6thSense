import { useReducedMotion } from "framer-motion";
import { ScrollHero } from "./ScrollHero.jsx";
import { OpenerAnimation } from "./OpenerAnimation.jsx";
import ScrollProgress from "./ScrollProgress.jsx";
import { useRevealNav } from "./useRevealNav.js";
import { useActiveNavSection } from "./useActiveNavSection.js";

function AppInner() {
  const reduceMotion = useReducedMotion();
  const { className: navClassName, pastStory } = useRevealNav({ reduceMotion: !!reduceMotion });
  const activeNavKey = useActiveNavSection();

  const navClass = (key) => (activeNavKey === key ? "nav-link--active" : "");

  return (
    <>
      <OpenerAnimation />
      <ScrollProgress pastStory={pastStory} />

      <a href="#story" className="skip-link">
        Skip to content
      </a>

      <div className="grain grain--dark" aria-hidden="true" />

      <header className={navClassName} role="banner">
        <nav className="nav-flagship-inner" aria-label="Primary">
          <a className="wordmark wordmark-on-dark" href="#top" aria-label="6thSense home">
            <img
              className="nav-logo"
              src="/Logo_Alpha.png"
              alt=""
              aria-hidden="true"
            />
            <span className="nav-logo-text">6THSENSE</span>
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
        <section id="story" aria-label="6thSense hero">
          <ScrollHero />
        </section>
      </main>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
