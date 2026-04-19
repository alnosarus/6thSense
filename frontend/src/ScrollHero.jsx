import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform
} from "framer-motion";
import { scrollStages } from "./scrollStages.js";
import { ScrollStage } from "./ScrollStage.jsx";
import { ScrollStageSection } from "./ScrollStageSection.jsx";
import { useScrollProgress } from "./useScrollProgress.js";
import { heroCopy } from "./homeNarrative.js";

const heroStagger = {
  hidden: {},
  shown: {
    transition: {
      delayChildren: 0.12,
      staggerChildren: 0.08
    }
  }
};

const heroItem = {
  hidden: { opacity: 0, y: 10 },
  shown: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

/**
 * Full-page hero: canvas scroll-scrub (glove → optics → compute → delivery) +
 * left-aligned wordmark / tagline / CTAs. Fades as you scroll into the stage chapters.
 */
export function ScrollHero() {
  const heroRef = useRef(null);
  const progressRef = useScrollProgress(heroRef);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(
    scrollYProgress,
    [0, 0.06, 0.14],
    reduceMotion ? [1, 1, 1] : [1, 1, 0]
  );
  const heroY = useTransform(
    scrollYProgress,
    [0, 0.06, 0.14],
    reduceMotion ? [0, 0, 0] : [0, 0, 18]
  );

  return (
    <div className="scroll-hero" ref={heroRef}>
      <div className="scroll-hero-sticky">
        <ScrollStage progressRef={progressRef} heroRef={heroRef} />
        <motion.div
          className="device-hero-overlay scroll-hero-copy"
          style={{ opacity: heroOpacity, y: heroY }}
          aria-label="6thSense introduction"
        >
          <div className="device-hero-overlay-scrim" aria-hidden="true" />
          <motion.div
            className="device-hero-overlay-inner"
            variants={reduceMotion ? undefined : heroStagger}
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "shown"}
          >
            <motion.p className="device-hero-eyebrow" variants={reduceMotion ? undefined : heroItem}>
              Touch-aware human demonstration data
            </motion.p>
            <motion.h1
              className="device-hero-wordmark"
              aria-label={`${heroCopy.wordmark} - ${heroCopy.tagline}`}
              variants={reduceMotion ? undefined : heroItem}
            >
              <span className="device-hero-wordmark-text" aria-hidden="true">
                {heroCopy.wordmark}
              </span>
            </motion.h1>
            <motion.p className="device-hero-tagline" variants={reduceMotion ? undefined : heroItem}>
              {heroCopy.tagline}
            </motion.p>
            <motion.p className="device-hero-deck" variants={reduceMotion ? undefined : heroItem}>
              {heroCopy.deck}
            </motion.p>
            <motion.div className="device-hero-cta" variants={reduceMotion ? undefined : heroItem}>
              <a href="#waitlist" className="btn btn-hero-solid">
                Start a conversation
              </a>
              <a href="#catalog" className="device-hero-cta-link">
                See what we capture
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
      {scrollStages.map((stage, i) => (
        <ScrollStageSection key={stage.id} stage={stage} index={i} />
      ))}
    </div>
  );
}
