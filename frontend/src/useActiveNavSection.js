import { useEffect, useState } from "react";

/** Section DOM ids in scroll order (top → bottom). */
const SECTION_ORDER = [
  "story",
  "proof",
  "problem",
  "system",
  "catalog",
  "credibility",
  "fit",
  "faq",
  "waitlist"
];

/** Map section id → nav link key (only keys that appear in the primary nav). */
const SECTION_TO_NAV = {
  story: null,
  proof: null,
  problem: null,
  system: "system",
  catalog: "catalog",
  credibility: "credibility",
  fit: null,
  faq: "faq",
  waitlist: "waitlist"
};

/**
 * Scrollspy: returns which primary-nav key should show the active indicator.
 */
export function useActiveNavSection() {
  const [activeNavKey, setActiveNavKey] = useState(null);

  useEffect(() => {
    const update = () => {
      const offset = 96;
      let currentSection = null;
      for (const id of SECTION_ORDER) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= offset) currentSection = id;
      }
      const key = currentSection ? SECTION_TO_NAV[currentSection] : null;
      setActiveNavKey(key);
    };

    update();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  return activeNavKey;
}
