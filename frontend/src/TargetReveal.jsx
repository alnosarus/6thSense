import { useEffect, useRef, useState } from "react";
import { motion, useAnimate, useReducedMotion } from "framer-motion";

const ACCENT = "#c5e063";
const SEQUENCE_GAP_MS = 1400;
const OPENER_DELAY_MS = 4000;

/**
 * In-text slider reveal for a single target word/phrase inside a hero blurb.
 *
 * Choreography (re-runs each time the blurb at `blurbIndex` becomes active):
 *   wait order * 1400ms (per-blurb sequencing)
 *   0.0 -> 0.25s   line draws in:  scaleY 0 -> 1, opacity 0 -> 1.
 *   0.25 -> 1.25s  slide + reveal: line left 0% -> 100% (ease-out, 1.0s);
 *                                   letters opacity 0 -> 1 with 80ms-per-
 *                                   letter stagger and 0.2s per-letter fade
 *                                   so the bar's leading edge stays close
 *                                   to the most-recently-revealed letter.
 *   1.25 -> 1.40s  line fades:     opacity 1 -> 0 at the right edge.
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
// Captures whether the brand opener is about to play. Computed during
// render so it runs BEFORE OpenerAnimation's effect sets sixthsense.openerSeen
// (which would otherwise make us think the opener was already seen).
function computeOpenerWillPlay() {
  if (typeof window === "undefined") return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const alreadySeen = sessionStorage.getItem("sixthsense.openerSeen") === "1";
  const deepLinked = window.scrollY > 0;
  return !reduce && !alreadySeen && !deepLinked;
}

export function TargetReveal({ text, blurbIndex, order }) {
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [playKey, setPlayKey] = useState(0);
  // Snapshot at first render — sessionStorage hasn't been touched yet.
  const [openerWillPlay] = useState(computeOpenerWillPlay);

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
    // only happen after the opener releases body scroll. We use the
    // render-time snapshot (openerWillPlay) instead of re-reading
    // sessionStorage here, because OpenerAnimation sets the flag at the
    // START of its play (not the end), so by the time this effect runs
    // the flag is already "1" and a fresh-tab read would lie.
    const openerWillBlock = blurbIndex === 0 && openerWillPlay;

    // Gate BOTH the seed-on-mount and the MutationObserver behind a
    // single isReady flag. Without this, ScrollStage's first --active-blurb
    // write fires the observer immediately, which would kick off the
    // animation during the opener; the 4s seed timer would then fire
    // later and restart it (resetting mid-way through).
    let isReady = !openerWillBlock;

    const seedIfActive = () => {
      if (isReady && readActive()) setPlayKey((k) => k + 1);
    };

    let seedTimer = null;
    if (openerWillBlock) {
      seedTimer = setTimeout(() => {
        isReady = true;
        seedIfActive();
      }, OPENER_DELAY_MS);
    } else {
      seedIfActive();
    }

    let wasActive = readActive();
    const obs = new MutationObserver(() => {
      const isActive = readActive();
      if (isReady && isActive && !wasActive) setPlayKey((k) => k + 1);
      wasActive = isActive;
    });
    obs.observe(root, { attributes: true, attributeFilter: ["style"] });

    return () => {
      obs.disconnect();
      if (seedTimer) clearTimeout(seedTimer);
    };
  }, [prefersReducedMotion, blurbIndex, openerWillPlay]);

  // Animation timeline: re-runs whenever playKey increments.
  useEffect(() => {
    if (playKey === 0 || prefersReducedMotion) return;
    if (!lineRef.current) return;
    const letters = letterRefs.current.filter(Boolean);
    if (letters.length === 0) return;

    let cancelled = false;

    const run = async () => {
      // Snap to initial state FIRST, before the order wait. Target 1
      // (order=1) otherwise stays at its previous "fully revealed" state
      // for the full 1.4s wait — looking permanently visible while
      // target 0 plays. Resetting before the wait keeps both targets
      // invisible until each one's turn to animate.
      await animate([
        [
          lineRef.current,
          { left: "0%", scaleY: 0, opacity: 0 },
          { duration: 0 },
        ],
        ...letters.map((el) => [el, { opacity: 0 }, { duration: 0, at: "<" }]),
      ]);
      if (cancelled) return;

      // Wait for our slot in the per-blurb sequence.
      if (order > 0) {
        await new Promise((r) => setTimeout(r, order * SEQUENCE_GAP_MS));
      }
      if (cancelled) return;

      // Phase 1: line draws in from the baseline upward.
      await animate(
        lineRef.current,
        { scaleY: 1, opacity: 1 },
        { duration: 1.5, ease: [0.16, 1, 0.3, 1] }
      );
      if (cancelled) return;

      // Phase 2: line slides; letters fade in with an 80ms-per-letter
      // stagger and a snappier per-letter fade. Bar slowed (1.0s) and
      // letter fade shortened (0.2s) so the bar's leading edge stays
      // close to the most-recently-revealed letter instead of racing
      // ahead. Same ease-out curve on the line so it still decelerates
      // toward the right edge.
      await animate([
        [
          lineRef.current,
          { left: "100%" },
          { duration: 1.0, ease: [0.22, 1, 0.36, 1] },
        ],
        ...letters.map((el, i) => [
          el,
          { opacity: 1 },
          { duration: 0.1, at: `<+${i * 0.08}` },
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
