import { useReducedMotion } from "framer-motion";
import { ScrollHero } from "./ScrollHero.jsx";
import { OpenerAnimation } from "./OpenerAnimation.jsx";
import ScrollProgress from "./ScrollProgress.jsx";
import { useRevealNav } from "./useRevealNav.js";

function AppInner() {
  const reduceMotion = useReducedMotion();
  const { className: navClassName, pastStory } = useRevealNav({ reduceMotion: !!reduceMotion });

  // "Talk to us" CTA scrolls to the form at the end of the hero's sticky
  // scroll range. Progress 0.94–1.00 is the form beat; 0.99 lands with the
  // form fully visible without sitting exactly on the scroll-out edge.
  const scrollToWaitlist = (event) => {
    event.preventDefault();
    const hero = document.querySelector(".scroll-hero");
    if (!hero) return;
    const total = hero.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: hero.offsetTop + total * 0.99,
      behavior: "smooth"
    });
  };

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
              src="/logos/Logo_Alpha.png"
              alt=""
              aria-hidden="true"
            />
            <span className="nav-logo-text">6THSENSE</span>
          </a>
          <div className="nav-links nav-links-on-dark">
            <a
              href="#waitlist"
              className="nav-cta nav-cta-on-dark"
              onClick={scrollToWaitlist}
            >
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
