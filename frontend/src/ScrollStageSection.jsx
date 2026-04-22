import { heroCopy } from "./homeNarrative.js";

/**
 * Per-stop pinned layer. Stop 0 shows the brand tagline at viewport center,
 * positioned BEHIND the glove canvas so the glove-lift reveal works. Stops
 * 1–3 show their technical body copy at the bottom (above the canvas).
 */
export function ScrollStageSection({ stage, index }) {
  const isStop0 = index === 0;

  return (
    <section className="scroll-stop" data-stop={index}>
      <div className="scroll-stop-pinned">
        {isStop0 ? (
          <p
            className="scroll-stop-tagline"
            aria-label="6thSense tagline"
          >
            {heroCopy.tagline}
          </p>
        ) : (
          <p className="scroll-stop-body">{stage.body}</p>
        )}
      </div>
    </section>
  );
}
