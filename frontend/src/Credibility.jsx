import { motion, useReducedMotion } from "framer-motion";
import { credibilityPrinciples } from "./homeNarrative.js";

export default function Credibility() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="section credibility-section" id="credibility" aria-labelledby="credibility-h">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-72px" }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="section-kicker-num">
          <span>04</span>
          Credibility
        </p>
        <h2 id="credibility-h" className="section-title">
          How we earn trust
        </h2>
        <p className="lead tight">
          Premium data is not louder claims — it is explicit limits, honest semantics, and packaging that respects your
          training stack.
        </p>
        <ul className="credibility-strip">
          {credibilityPrinciples.map((item) => (
            <li key={item.num} className="credibility-item">
              <span className="credibility-num">{item.num}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
