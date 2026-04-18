import { useEffect, useRef, useState } from "react";

function isPastStoryEnd(thresholdPx = 88) {
  const el = document.getElementById("story");
  if (!el) return false;
  return el.getBoundingClientRect().bottom < thresholdPx;
}

/**
 * Floating pill nav: always centered pill geometry. Stays visible while the user
 * is still inside `#story`; after the story section ends, hides on scroll-down
 * and reappears on scroll-up. Disabled when prefers-reduced-motion.
 */
export function useRevealNav({ reduceMotion, topPx = 56 }) {
  const [state, setState] = useState({ visible: true, pastStory: false });
  /** After in-page anchor clicks, ignore scroll-down hide while smooth scroll runs. */
  const suppressHideFromAnchorRef = useRef(false);
  const anchorSuppressTimerRef = useRef(0);

  useEffect(() => {
    const clearSuppress = () => {
      suppressHideFromAnchorRef.current = false;
    };

    const onAnchorClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const a = target.closest("a[href^=\"#\"]");
      if (!a) return;
      const raw = a.getAttribute("href") || "";
      if (raw.length <= 1) return;
      suppressHideFromAnchorRef.current = true;
      window.clearTimeout(anchorSuppressTimerRef.current);
      anchorSuppressTimerRef.current = window.setTimeout(clearSuppress, 2200);
    };

    document.addEventListener("click", onAnchorClick, true);
    return () => {
      document.removeEventListener("click", onAnchorClick, true);
      window.clearTimeout(anchorSuppressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setState({ visible: true, pastStory: isPastStoryEnd() });
      return;
    }

    let lastY = window.scrollY;
    let firstTick = true;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const past = isPastStoryEnd();

        if (firstTick) {
          firstTick = false;
          lastY = y;
          const visible = !(y >= topPx && past);
          setState({ visible, pastStory: past });
          return;
        }

        const delta = y - lastY;
        lastY = y;
        const goingDown = delta > 6;
        const goingUp = delta < -6;
        const suppressHide = suppressHideFromAnchorRef.current;

        setState((prev) => {
          let visible = prev.visible;
          if (y < topPx) visible = true;
          else if (!past) visible = true;
          else if (goingDown && !suppressHide) visible = false;
          else if (goingUp) visible = true;

          return { visible, pastStory: past };
        });
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduceMotion, topPx]);

  let className = "nav-flagship nav-flagship--pill";
  if (!state.visible) className += " nav-flagship--hidden";

  return { ...state, className };
}
