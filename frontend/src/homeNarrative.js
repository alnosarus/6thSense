/**
 * Homepage narrative content — edit here; UI maps over these structures.
 * Headline options for hero (pick one in App or A/B later):
 */
export const heroHeadlineOptions = [
  {
    id: "pipeline",
    h1: "The data pipeline for touch-aware robot learning",
    deck: "6thSense builds custom tactile egocentric datasets with synchronized touch, vision, and hand interaction streams from real human demonstrations."
  },
  {
    id: "fullstack",
    h1: "Full-stack multimodal data collection for robotics",
    deck: "We deliver hardware, capture, calibration, quality control, and packaged training datasets tailored to your manipulation tasks."
  },
  {
    id: "modelready",
    h1: "From human demonstration to model-ready dataset",
    deck: "Aligned multimodal episodes that connect what the demonstrator saw, what the hand did, and what the hand felt."
  }
];

/** Active headline set (swap `heroHeadlineOptions` index to try alternates). */
export const heroCopy = heroHeadlineOptions[0];

export const storyPanels = [
  {
    id: "hero",
    kicker: "6thSense",
    title: heroCopy.h1,
    body: heroCopy.deck,
    phase: "hero"
  },
  {
    id: "capture",
    kicker: "Capture stack",
    title: "Custom tactile + egocentric capture systems",
    body: "Wearable sensing, egocentric video, and hand signals are recorded together during contact-rich manipulation tasks.",
    phase: "signal"
  },
  {
    id: "alignment",
    kicker: "Aligned episodes",
    title: "Time-synchronized multimodal sequences",
    body: "Each episode preserves temporal alignment between tactile contact proxies, vision, motion signals, and task metadata.",
    phase: "context"
  },
  {
    id: "delivery",
    kicker: "Data delivery",
    title: "Clean, quality-controlled, model-ready outputs",
    body: "We package episodes, annotations, metrics, and assumptions so robotics teams can train and evaluate without rebuilding the data stack.",
    phase: "insight"
  }
];

/** Placeholders for Matt / team — replace with verified facts only. */
export const tractionItems = [
  {
    label: "Missing signal",
    title: "Contact onset and grip evolution are under-captured",
    detail: "Most datasets miss touch timing, pressure trends, and subtle adjustments that matter in dexterous manipulation."
  },
  {
    label: "Fragmentation",
    title: "Off-the-shelf tools produce unusable raw dumps",
    detail: "Standalone sensors and recording scripts often fail calibration, synchronization, and dataset reliability requirements."
  },
  {
    label: "Operational gap",
    title: "Teams need packaged data, not hardware babysitting",
    detail: "Robot learning teams want high-value datasets, not multi-month setup and QC work for each collection effort."
  },
  {
    label: "Learning bottleneck",
    title: "Manipulation progress is data-constrained",
    detail: "For contact-rich tasks, the next performance gains come from better multimodal demonstrations, not model scale alone."
  }
];

export const platformPillars = [
  {
    title: "Custom capture hardware",
    body: "Wearable and sensor configurations tailored to each customer task and manipulation environment."
  },
  {
    title: "Synchronized multimodal recording",
    body: "Tactile/contact proxies, egocentric video, hand motion signals, and metadata recorded as aligned sequences."
  },
  {
    title: "Calibration and reliability workflows",
    body: "Signal drift, fit shifts, channel instability, and timing checks are handled before data reaches training."
  },
  {
    title: "Dataset QC and packaging",
    body: "Task segmentation, annotations, failure flags, and documentation shipped in model-ready formats."
  }
];
