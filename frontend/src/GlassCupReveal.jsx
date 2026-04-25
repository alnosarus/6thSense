import { useEffect, useRef, useState } from "react";
import { motion, useAnimate, useReducedMotion } from "framer-motion";

/**
 * In-text animation for the phrase "glass cup" inside hero blurb 0.
 *
 * Choreography (re-runs each time blurb 0 becomes the active blurb):
 *   0.0 -> 0.9s   slide:        cup translates left to 100% of phrase width;
 *                                water sloshes (skewY 0 -> -8 -> 0);
 *                                reveal layer's clip-path inset shrinks 100% -> 0%.
 *   0.9 -> 1.0s   anticipation: cup leans forward (rotate 0 -> 5deg).
 *   1.0 -> 1.6s   tip + fall:   cup rotates 5 -> 85deg, drifts to left:110%,
 *                                falls y: 0 -> 200%; water fades to 0;
 *                                four droplets arc out from the rim.
 *
 * Triggering: a MutationObserver on .scroll-hero's style attribute watches
 * --active-blurb. Each transition into "0" increments playKey, which the
 * animation effect uses as its dependency. A seed-on-mount path handles the
 * case where blurb 0 is already active before the observer attaches.
 *
 * Reduced motion: returns plain text, no SVG, no observer.
 */
export function GlassCupReveal() {
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [playKey, setPlayKey] = useState(0);

  const rootRef = useRef(null);
  const cupRef = useRef(null);
  const waterRef = useRef(null);
  const revealRef = useRef(null);
  const dropletRefs = useRef([]);

  // Trigger detection: watch --active-blurb on the .scroll-hero ancestor.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const root = rootRef.current?.closest(".scroll-hero");
    if (!root) return;

    const readActive = () =>
      root.style.getPropertyValue("--active-blurb").trim() === "0";

    if (readActive()) setPlayKey((k) => k + 1);

    let wasActive = readActive();
    const obs = new MutationObserver(() => {
      const isActive = readActive();
      if (isActive && !wasActive) setPlayKey((k) => k + 1);
      wasActive = isActive;
    });
    obs.observe(root, { attributes: true, attributeFilter: ["style"] });
    return () => obs.disconnect();
  }, [prefersReducedMotion]);

  // Animation timeline: re-runs whenever playKey increments.
  useEffect(() => {
    if (playKey === 0 || prefersReducedMotion) return;
    if (!cupRef.current || !waterRef.current || !revealRef.current) return;

    const droplets = dropletRefs.current.filter(Boolean);

    const run = async () => {
      // Snap to initial state — handles mid-animation re-entry cleanly.
      await animate(
        [
          [cupRef.current, { left: "0%", y: 0, rotate: 0 }, { duration: 0 }],
          [waterRef.current, { skewY: 0, opacity: 1 }, { duration: 0, at: "<" }],
          [
            revealRef.current,
            { clipPath: "inset(0 100% 0 0)" },
            { duration: 0, at: "<" },
          ],
          ...droplets.map((el) => [
            el,
            { x: 0, y: 0, opacity: 0 },
            { duration: 0, at: "<" },
          ]),
        ]
      );

      // Slide phase — cup, water slosh, reveal all concurrent.
      await animate([
        [
          cupRef.current,
          { left: "100%" },
          { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
        ],
        [
          waterRef.current,
          { skewY: [0, -8, 0] },
          { duration: 0.9, at: "<" },
        ],
        [
          revealRef.current,
          { clipPath: "inset(0 0% 0 0)" },
          { duration: 0.9, at: "<", ease: "linear" },
        ],
      ]);

      // Anticipation lean.
      await animate(cupRef.current, { rotate: 5 }, { duration: 0.1 });

      // Tip + fall + spill — concurrent.
      await animate([
        [
          cupRef.current,
          { rotate: 85, left: "110%", y: "200%" },
          { duration: 0.6, ease: [0.55, 0, 0.85, 0.4] },
        ],
        [
          waterRef.current,
          { opacity: 0 },
          { duration: 0.3, at: "<" },
        ],
        ...droplets.map((el, i) => [
          el,
          {
            x: [0, 6 + i * 2, 10 + i * 2],
            y: [0, -3 + i * 0.5, 8 + i * 1],
            opacity: [0, 1, 0],
          },
          { duration: 0.6, at: `<+${i * 0.04}` },
        ]),
      ]);
    };

    run();
  }, [playKey, prefersReducedMotion, animate]);

  if (prefersReducedMotion) {
    return <span>glass cup</span>;
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
      {/* Layout slot — invisible text holds the phrase's width. */}
      <span style={{ color: "transparent" }}>glass cup</span>

      {/* Reveal layer — clip-path animates from fully-hidden to fully-shown. */}
      <motion.span
        ref={revealRef}
        style={{
          position: "absolute",
          inset: 0,
          color: "inherit",
          clipPath: "inset(0 100% 0 0)",
        }}
      >
        glass cup
      </motion.span>

      {/* Cup wrapper — fills the span; cup's left:0%..100% spans the phrase. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <motion.svg
          ref={cupRef}
          viewBox="0 0 14 16"
          style={{
            position: "absolute",
            left: "0%",
            bottom: 0,
            width: "1.4em",
            height: "1.6em",
            overflow: "visible",
            transformOrigin: "bottom right",
          }}
        >
          <g stroke="currentColor" strokeWidth="0.6" fill="none">
            <path d="M2 1 L3 14 Q7 15.4 11 14 L12 1" />
          </g>
          <motion.path
            ref={waterRef}
            d="M3.2 7 L3.7 13.6 Q7 14.9 10.3 13.6 L10.8 7 Q7 7.6 3.2 7 Z"
            fill="#7ec3ff"
            fillOpacity="0.7"
            style={{ transformOrigin: "7px 10px" }}
          />
          <g>
            {[0, 1, 2, 3].map((i) => (
              <motion.circle
                key={i}
                ref={(el) => {
                  dropletRefs.current[i] = el;
                }}
                cx="11"
                cy="3"
                r="0.6"
                fill="#7ec3ff"
                fillOpacity="0.7"
                initial={{ opacity: 0 }}
              />
            ))}
          </g>
        </motion.svg>
      </span>
    </span>
  );
}
