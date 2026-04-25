import { useEffect, useRef, useState } from "react";
import { motion, useAnimate, useReducedMotion } from "framer-motion";

const ACCENT = "#c5e063";
const SEQUENCE_GAP_MS = 1100;
const OPENER_DELAY_MS = 4000;

/**
 * In-text slider reveal for a single target word/phrase inside a hero blurb.
 *
 * Choreography (re-runs each time the blurb at `blurbIndex` becomes active):
 *   wait order * 1100ms (per-blurb sequencing)
 *   0.0 -> 0.25s   line draws in:  scaleY 0 -> 1, opacity 0 -> 1.
 *   0.25 -> 0.95s  slide + reveal: line left 0% -> 100% (ease-out); letters
 *                                   opacity 0 -> 1 with 34ms-per-letter
 *                                   stagger as the line slides over them.
 *   0.95 -> 1.10s  line fades:     opacity 1 -> 0 at the right edge.
 *
 * Triggering: a MutationObserver on .scroll-hero's style attribute watches
 * --active-blurb. Each transition into String(blurbIndex) increments
 * playKey, which the animation effect uses as its dependency. For
 * blurbIndex === 0 only, the seed-on-mount path defers by ~4s on fresh
 * tabs so the slider does not run behind the brand opener overlay.
 *
 * Reduced motion: returns plain text in the lime accent color, no line,
 * no observer, no animation.
 */
export function TargetReveal({ text, blurbIndex, order }) {
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [playKey, setPlayKey] = useState(0);

  const rootRef = useRef(null);
  const lineRef = useRef(null);
  const letterRefs = useRef([]);

  // Trigger detection: watch --active-blurb on the .scroll-hero ancestor.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const root = rootRef.current?.closest(".scroll-hero");
    if (!root) return;

    const targetValue = String(blurbIndex);
    const readActive = () =>
      root.style.getPropertyValue("--active-blurb").trim() === targetValue;

    // Opener delay applies only to blurb 0 — the only blurb that can be
    // already-active on fresh page load while the brand opener is playing.
    // Blurbs 1..4 only become active after the user scrolls, which can
    // only happen after the opener releases body scroll.
    const openerWillBlock =
      blurbIndex === 0 &&
      typeof window !== "undefined" &&
      sessionStorage.getItem("sixthsense.openerSeen") !== "1" &&
      window.scrollY === 0;
    const seedDelayMs = openerWillBlock ? OPENER_DELAY_MS : 0;

    const seedIfActive = () => {
      if (readActive()) setPlayKey((k) => k + 1);
    };

    let seedTimer = null;
    if (seedDelayMs > 0) {
      seedTimer = setTimeout(seedIfActive, seedDelayMs);
    } else {
      seedIfActive();
    }

    let wasActive = readActive();
    const obs = new MutationObserver(() => {
      const isActive = readActive();
      if (isActive && !wasActive) setPlayKey((k) => k + 1);
      wasActive = isActive;
    });
    obs.observe(root, { attributes: true, attributeFilter: ["style"] });

    return () => {
      obs.disconnect();
      if (seedTimer) clearTimeout(seedTimer);
    };
  }, [prefersReducedMotion, blurbIndex]);

  // Animation timeline: re-runs whenever playKey increments.
  useEffect(() => {
    if (playKey === 0 || prefersReducedMotion) return;
    if (!lineRef.current) return;
    const letters = letterRefs.current.filter(Boolean);
    if (letters.length === 0) return;

    let cancelled = false;

    const run = async () => {
      // Wait for our slot in the per-blurb sequence.
      if (order > 0) {
        await new Promise((r) => setTimeout(r, order * SEQUENCE_GAP_MS));
      }
      if (cancelled) return;

      // Snap to initial state — handles mid-animation re-entry cleanly.
      await animate([
        [
          lineRef.current,
          { left: "0%", scaleY: 0, opacity: 0 },
          { duration: 0 },
        ],
        ...letters.map((el) => [el, { opacity: 0 }, { duration: 0, at: "<" }]),
      ]);
      if (cancelled) return;

      // Phase 1: line draws in from the baseline upward.
      await animate(
        lineRef.current,
        { scaleY: 1, opacity: 1 },
        { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
      );
      if (cancelled) return;

      // Phase 2: line slides; letters fade in with a 34ms-per-letter
      // stagger. Same ease-out curve on the line so it decelerates
      // toward the right edge.
      await animate([
        [
          lineRef.current,
          { left: "100%" },
          { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        ],
        ...letters.map((el, i) => [
          el,
          { opacity: 1 },
          { duration: 0.4, at: `<+${i * 0.034}` },
        ]),
      ]);
      if (cancelled) return;

      // Phase 3: line fades out at the right edge.
      await animate(lineRef.current, { opacity: 0 }, { duration: 0.15 });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [playKey, prefersReducedMotion, animate, order]);

  if (prefersReducedMotion) {
    return <span style={{ color: ACCENT }}>{text}</span>;
  }

  return (
    <span
      ref={(el) => {
        rootRef.current = el;
        scope.current = el;
      }}
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      <motion.span
        ref={lineRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: "0.05em",
          width: "2px",
          height: "1em",
          background: ACCENT,
          transformOrigin: "bottom",
          opacity: 0,
          scaleY: 0,
        }}
      />
      {[...text].map((char, i) => (
        <motion.span
          key={i}
          ref={(el) => {
            letterRefs.current[i] = el;
          }}
          style={{ color: ACCENT, opacity: 0 }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  );
}
