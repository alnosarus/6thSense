import { motion, useReducedMotion } from "framer-motion";
import { Camera, Gauge, PackageCheck, SplitSquareHorizontal } from "lucide-react";
import { platformStages, platformSummary } from "./homeNarrative.js";

const iconByGlyph = {
  rig: Camera,
  sync: SplitSquareHorizontal,
  calibrate: Gauge,
  package: PackageCheck
};

export default function PlatformPipeline() {
  const reduceMotion = useReducedMotion();
  const glyphViewport = { once: true, margin: "-96px" };

  return (
    <figure className="platform-pipeline" aria-label="Four-stage data pipeline">
      <svg className="platform-pipeline-flow" viewBox="0 0 1000 60" aria-hidden="true">
        <motion.path
          d="M 40 30 H 960"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-96px" }}
          transition={{ duration: reduceMotion ? 0 : 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        {!reduceMotion && (
          <motion.circle
            cy="30"
            r="4"
            initial={{ cx: 40, opacity: 0.28 }}
            whileInView={{ cx: [40, 960], opacity: [0.18, 0.55, 0.18] }}
            viewport={{ once: true, margin: "-96px" }}
            transition={{ duration: 6, ease: "linear", repeat: Infinity }}
          />
        )}
      </svg>

      <ol className="platform-pipeline-stages" role="list">
        {platformStages.map((stage, index) => {
          const Icon = iconByGlyph[stage.glyph] ?? null;

          return (
            <motion.li
              key={stage.id}
              className="platform-stage"
              initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-72px" }}
              transition={{
                delay: reduceMotion ? 0 : 0.18 + index * 0.12,
                duration: reduceMotion ? 0 : 0.46,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              <span className="platform-stage-step" aria-hidden="true">
                {stage.step}
              </span>
              <span className="platform-stage-glyph" aria-hidden="true">
                {Icon ? (
                  <motion.span
                    className="platform-stage-icon"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={glyphViewport}
                    transition={{
                      delay: reduceMotion ? 0 : 0.28 + index * 0.12,
                      duration: reduceMotion ? 0 : 0.45,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                  </motion.span>
                ) : null}
              </span>
              <h3 className="platform-stage-label">{stage.label}</h3>
              <p className="platform-stage-caption">{stage.caption}</p>
            </motion.li>
          );
        })}
      </ol>

      <figcaption className="platform-pipeline-summary">{platformSummary}</figcaption>
    </figure>
  );
}
