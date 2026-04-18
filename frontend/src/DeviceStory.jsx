import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
  useTransform
} from "framer-motion";
import { lazy, Suspense } from "react";
import { storyPanels } from "./homeNarrative.js";
import { StoryProgressProvider, useStoryProgressRef } from "./StoryProgressContext.jsx";

const ProbeCanvas = lazy(() => import("./ProbeCanvas.jsx"));

function ScrollBridge() {
  const progressRef = useStoryProgressRef();
  const containerRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [heroOverlayDismissed, setHeroOverlayDismissed] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOverlayOpacity = useTransform(
    scrollYProgress,
    [0, 0.045, 0.12],
    [1, 1, 0]
  );
  const heroOverlayY = useTransform(
    scrollYProgress,
    [0, 0.045, 0.12],
    reduceMotion ? [0, 0, 0] : [0, 0, 14]
  );
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    const dismissed = v > 0.115;
    setHeroOverlayDismissed((prev) => (prev !== dismissed ? dismissed : prev));
  });

  const heroPanel = storyPanels.find((p) => p.id === "hero");
  const storyRailPanels = storyPanels.filter((p) => p.id !== "hero");

  return (
    <section
      ref={containerRef}
      id="story"
      className="device-story"
      aria-label="6thSense data story"
    >
      <div className="device-story-grid">
        <div className="device-story-sticky">
          <div className="device-story-canvas-layer">
            <Suspense
              fallback={
                <div
                  className="probe-fallback probe-fallback--immersive"
                  role="img"
                  aria-label="Loading device visualization"
                />
              }
            >
              <ProbeCanvas />
            </Suspense>
          </div>

          {heroPanel ? (
            <motion.div
              className="device-hero-overlay"
              id="panel-hero"
              data-phase={heroPanel.phase}
              data-hero-inert={heroOverlayDismissed ? "true" : undefined}
              aria-hidden={heroOverlayDismissed}
              style={{
                opacity: heroOverlayOpacity,
                y: heroOverlayY
              }}
            >
              <div className="device-hero-overlay-scrim" aria-hidden="true" />
              <div className="device-hero-overlay-inner">
                <p className="device-hero-kicker">{heroPanel.kicker}</p>
                <h1 className="device-hero-title">{heroPanel.title}</h1>
                <p className="device-hero-body">{heroPanel.body}</p>
                <div className="device-hero-cta">
                  <a href="#waitlist" className="btn btn-hero-solid">
                    Start a conversation
                  </a>
                  <a href="#traction" className="device-hero-cta-link">
                    Problem &amp; platform
                  </a>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>

        <div className="device-story-panels">
          <article
            className="device-panel device-panel--hero-spacer"
            aria-hidden="true"
            data-phase="hero"
          />
          {storyRailPanels.map((panel) => (
            <article
              key={panel.id}
              className="device-panel"
              id={`panel-${panel.id}`}
              data-phase={panel.phase}
            >
              <p className="device-panel-kicker">{panel.kicker}</p>
              <h2 className="device-panel-title">{panel.title}</h2>
              <p className="device-panel-body">{panel.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DeviceStory() {
  return (
    <StoryProgressProvider>
      <ScrollBridge />
    </StoryProgressProvider>
  );
}
