import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Thin top progress bar; fades in once the hero `#story` block has scrolled past.
 */
export default function ScrollProgress({ pastStory }) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: reduceMotion ? 400 : 120,
    damping: reduceMotion ? 80 : 24,
    mass: 0.35
  });

  return (
    <motion.div
      className={`scroll-progress${pastStory ? " scroll-progress--visible" : ""}`}
      aria-hidden="true"
      style={{
        scaleX,
        transformOrigin: "0 0"
      }}
    />
  );
}
