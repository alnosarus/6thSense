import { useEffect, useRef, useState } from "react";
import "./OpenerAnimation.css";

const SESSION_FLAG = "sixthsense.openerSeen";

function computeInitialPhase() {
  if (typeof window === "undefined") return "init";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const alreadySeen = sessionStorage.getItem(SESSION_FLAG) === "1";
  const deepLinked = window.scrollY > 0;
  if (reduce || alreadySeen || deepLinked) return "done";
  return "init";
}

/**
 * Full-screen brand opener. Plays once per browser session — skipped on
 * in-tab refresh, re-plays in new tabs or after browser close. Also skipped
 * on deep-link arrivals (scrollY > 0) and when prefers-reduced-motion is set.
 */
export function OpenerAnimation() {
  const [phase, setPhase] = useState(computeInitialPhase);
  const bodyOverflowRef = useRef("");

  useEffect(() => {
    if (phase !== "init") {
      // Skip path — mark the flag so subsequent mounts stay consistent, then bail.
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_FLAG, "1");
      }
      return;
    }

    sessionStorage.setItem(SESSION_FLAG, "1");

    // Lock body scroll for the duration of the opener.
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setPhase("playing");

    // Total: 5 trail dots (ends ~1.08s) + 6th ignite (0.95 + 1.9 = 2.85s) = hold until ~3.0s
    const startFade = setTimeout(() => setPhase("fading"), 3000);
    // Fade is 0.8s; restore scroll + hide overlay after it completes.
    // Overflow restore runs HERE (not in cleanup) because returning null from
    // the render keeps the component mounted — cleanup would never fire.
    const finish = setTimeout(() => {
      document.body.style.overflow = bodyOverflowRef.current;
      setPhase("done");
    }, 3800);

    return () => {
      clearTimeout(startFade);
      clearTimeout(finish);
      document.body.style.overflow = bodyOverflowRef.current;
    };
    // phase is only read once on mount; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "init" || phase === "done") return null;

  return (
    <div className="opener-root" data-phase={phase} aria-hidden="true">
      <div className="opener-grid">
        <span className="opener-dot opener-dot--1" />
        <span className="opener-dot opener-dot--2" />
        <span className="opener-dot opener-dot--3" />
        <span className="opener-dot opener-dot--4" />
        <span className="opener-dot opener-dot--5" />
        <span className="opener-dot opener-dot--6" />
      </div>
    </div>
  );
}
