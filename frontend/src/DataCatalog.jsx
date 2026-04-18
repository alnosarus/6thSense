import { motion, useReducedMotion } from "framer-motion";
import { catalogBinding, catalogMeta, catalogSceneExamples, dataCatalogTiles } from "./homeNarrative.js";

function CatalogGlyph({ name }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.35, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "wave":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path {...common} d="M3 20c3-6 6-6 9 0s6 6 9 0 6-6 9 0" />
        </svg>
      );
    case "eye":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path {...common} d="M4 16c4-7 8-10 12-10s8 3 12 10c-4 7-8 10-12 10S8 23 4 16z" />
          <circle {...common} cx="16" cy="16" r="3.5" />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path {...common} d="M6 11l10-4 10 4-10 4-10-4z" />
          <path {...common} d="M6 17l10 4 10-4" />
          <path {...common} d="M6 22l10 4 10-4" />
        </svg>
      );
    case "hand":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path {...common} d="M10 22V12c0-1 1-2 2-2h1v8l3-9c.4-1 1.6-1 2 0l2 7 2-12c.3-1.2 1.8-1.2 2.1 0L26 22" />
          <path {...common} d="M8 22h16" />
        </svg>
      );
    case "imu":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle {...common} cx="16" cy="16" r="9" />
          <path {...common} d="M16 7v4M16 21v4M7 16h4M21 16h4" />
          <circle cx="16" cy="16" r="2" fill="currentColor" />
        </svg>
      );
    case "cam":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect {...common} x="5" y="11" width="22" height="14" rx="2" />
          <circle {...common} cx="16" cy="18" r="4" />
          <path {...common} d="M11 11V9h4v2" />
        </svg>
      );
    case "tag":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path {...common} d="M6 12l10-6 12 12-10 10-12-12z" />
          <circle {...common} cx="13" cy="13" r="1.8" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path {...common} d="M7 17l6 6 12-14" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle {...common} cx="16" cy="16" r="8" />
        </svg>
      );
  }
}

export default function DataCatalog() {
  const reduceMotion = useReducedMotion();
  const stagger = reduceMotion ? 0 : 0.055;

  return (
    <section className="section catalog-section" id="catalog" aria-labelledby="catalog-h">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-72px" }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="section-kicker-num">
          <span>03</span>
          {catalogMeta.kicker}
        </p>
        <h2 id="catalog-h" className="section-title">
          {catalogMeta.title}
        </h2>
        <p className="catalog-manifest">
          A single capture stack, expressed as modalities you can train against — each stream time-aligned inside the same
          episode contract.
        </p>

        <div className="catalog-scenes-block">
          <h3 className="catalog-scenes-h">Representative domestic scenes</h3>
          <p className="catalog-scenes-lead">
            Task families we scope with partners — illustrative, not exhaustive. Final episode mix is agreed per program.
          </p>
          <ul className="catalog-scenes" role="list">
            {catalogSceneExamples.map((label) => (
              <li key={label}>
                <span className="catalog-scene-chip">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="catalog-grid">
          {dataCatalogTiles.map((tile, i) => (
            <motion.article
              key={tile.id}
              className={`catalog-tile catalog-tile--slant-${i % 2 === 0 ? "a" : "b"}`}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-48px" }}
              transition={{
                delay: i * stagger,
                duration: 0.42,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              <div className="catalog-tile-inner">
                <div className="catalog-tile-glyph" aria-hidden="true">
                  <CatalogGlyph name={tile.glyph} />
                </div>
                <h3 className="catalog-tile-title">{tile.title}</h3>
                <p className="catalog-tile-spec">{tile.spec}</p>
                <p className="catalog-tile-sync">Synced with · {tile.sync}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="catalog-binding">
          <h3>{catalogBinding.title}</h3>
          <p>{catalogBinding.body}</p>
        </div>
      </motion.div>
    </section>
  );
}
