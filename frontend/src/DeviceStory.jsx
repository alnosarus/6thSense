import { useMemo, useRef, useState } from "react";
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
import { usePretextBlockMetrics } from "./pretextMeasure.js";

const ProbeCanvas = lazy(() => import("./ProbeCanvas.jsx"));

function StoryOverlayBeat({ panel, range, scrollYProgress, reduceMotion, baseOverlayHeight }) {
  const overlayOpacity = useTransform(scrollYProgress, [range.start, range.hold, range.end], [0, 1, 0]);
  const overlayY = useTransform(
    scrollYProgress,
    [range.start, range.hold, range.end],
    reduceMotion ? [0, 0, 0] : [24, 0, -14]
  );

  return (
    <motion.article
      id={`panel-${panel.id}`}
      className={`device-story-overlay device-story-overlay--${panel.layout || "left"}`}
      data-phase={panel.phase}
      style={{
        opacity: overlayOpacity,
        y: overlayY
      }}
      aria-label={`${panel.kicker} narrative beat`}
    >
      <div className="device-hero-overlay-scrim" aria-hidden="true" />
      <div className="device-story-overlay-inner" style={{ minHeight: `${baseOverlayHeight}px` }}>
        <p className="device-panel-kicker">{panel.kicker}</p>
        <h2 className="device-panel-title">{panel.title}</h2>
        <p className="device-panel-body">{panel.body}</p>
      </div>
    </motion.article>
  );
}

function ScrollBridge() {
  const progressRef = useStoryProgressRef();
  const containerRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [heroOverlayDismissed, setHeroOverlayDismissed] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOverlayOpacity = useTransform(scrollYProgress, [0, 0.05, 0.14], [1, 1, 0]);
  const heroOverlayY = useTransform(scrollYProgress, [0, 0.05, 0.14], reduceMotion ? [0, 0, 0] : [0, 0, 16]);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    const dismissed = v > 0.115;
    setHeroOverlayDismissed((prev) => (prev !== dismissed ? dismissed : prev));
  });

  const heroPanel = storyPanels.find((p) => p.id === "hero");
  const storyOverlays = storyPanels.filter((p) => p.id !== "hero");
  const overlayRanges = useMemo(
    () =>
      storyOverlays.map((_, i) => {
        const start = 0.18 + i * 0.23;
        return {
          start,
          hold: start + 0.08,
          end: start + 0.21
        };
      }),
    [storyOverlays]
  );
  const maxOverlaySample = useMemo(() => {
    if (storyOverlays.length === 0) return "";
    const longest = [...storyOverlays].sort((a, b) => (b.body.length + b.title.length) - (a.body.length + a.title.length))[0];
    return `${longest.kicker}\n${longest.title}\n${longest.body}`;
  }, [storyOverlays]);
  const baseOverlayHeight = usePretextBlockMetrics({
    text: maxOverlaySample,
    font: "600 48px \"Fraunces\", serif",
    lineHeight: 58,
    widthPadding: 0.18,
    minHeight: 280
  });

  return (
    <section
      ref={containerRef}
      id="story"
      className="device-story"
      aria-label="6thSense data story"
    >
      <div className="device-story-track">
        <div className="device-story-sticky">
          <div className="device-story-stage-3d">
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
                  <a href="#catalog" className="device-hero-cta-link">
                    See what we capture
                  </a>
                </div>
              </div>
            </motion.div>
          ) : null}

          {storyOverlays.map((panel, i) => (
            <StoryOverlayBeat
              key={panel.id}
              panel={panel}
              range={overlayRanges[i]}
              scrollYProgress={scrollYProgress}
              reduceMotion={reduceMotion}
              baseOverlayHeight={baseOverlayHeight}
            />
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
