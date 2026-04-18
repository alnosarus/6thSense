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
    phase: "hero",
    layout: "left"
  },
  {
    id: "capture",
    kicker: "Capture stack",
    title: "Custom tactile + egocentric capture systems",
    body: "Wearable sensing, egocentric video, and hand signals are recorded together during contact-rich manipulation tasks.",
    phase: "signal",
    layout: "left"
  },
  {
    id: "alignment",
    kicker: "Aligned episodes",
    title: "Time-synchronized multimodal sequences",
    body: "Each episode preserves temporal alignment between tactile contact proxies, vision, motion signals, and task metadata.",
    phase: "context",
    layout: "center"
  },
  {
    id: "delivery",
    kicker: "Data delivery",
    title: "Clean, quality-controlled, model-ready outputs",
    body: "We package episodes, annotations, metrics, and assumptions so robotics teams can train and evaluate without rebuilding the data stack.",
    phase: "insight",
    layout: "right"
  }
];

/** Problem framing — keep claims verifiable when replacing placeholders. */
export const tractionItems = [
  {
    label: "Signal gap",
    title: "Contact onset and grip evolution are under-captured",
    detail: "Most datasets miss touch timing, pressure trends, and subtle adjustments that matter in dexterous manipulation.",
    icon: "ActivitySquare"
  },
  {
    label: "Tooling",
    title: "Off-the-shelf stacks produce unusable raw dumps",
    detail: "Standalone sensors and recording scripts often fail calibration, synchronization, and dataset reliability requirements.",
    icon: "Wrench"
  },
  {
    label: "Operations",
    title: "Teams need packaged data, not hardware babysitting",
    detail: "Robot learning teams want high-value datasets, not multi-month setup and QC work for each collection effort.",
    icon: "Boxes"
  },
  {
    label: "Learning",
    title: "Manipulation progress is data-constrained",
    detail: "For contact-rich tasks, the next performance gains come from better multimodal demonstrations, not model scale alone.",
    icon: "BrainCircuit"
  }
];

export const platformPillars = [
  {
    title: "Custom capture hardware",
    body: "Wearable and sensor configurations tailored to each customer task and manipulation environment.",
    icon: "Cpu"
  },
  {
    title: "Synchronized multimodal recording",
    body: "Tactile/contact proxies, egocentric video, hand motion signals, and metadata recorded as aligned sequences.",
    icon: "SplitSquareHorizontal"
  },
  {
    title: "Calibration and reliability workflows",
    body: "Signal drift, fit shifts, channel instability, and timing checks are handled before data reaches training.",
    icon: "Gauge"
  },
  {
    title: "Dataset QC and packaging",
    body: "Task segmentation, annotations, failure flags, and documentation shipped in model-ready formats.",
    icon: "PackageCheck"
  }
];

/** SenseProbe / offering — data catalog tiles (tune specs to shipped hardware + programs). */
export const dataCatalogTiles = [
  {
    id: "tactile",
    title: "Tactile & pressure proxies",
    spec: "High-rate contact and pressure-aligned streams with per-channel calibration — where touch matters for the task.",
    sync: "Egocentric video, hand pose, IMU, episodes",
    glyph: "wave"
  },
  {
    id: "ego",
    title: "Egocentric video",
    spec: "First-person RGB aligned to what the demonstrator sees — stable exposure for long household runs.",
    sync: "Tactile, depth, wrist & scene views, labels",
    glyph: "eye"
  },
  {
    id: "depth",
    title: "Depth (RGB-D)",
    spec: "Per-frame depth aligned to ego timebase for geometry, reach, and clutter around the hands.",
    sync: "RGB, hand pose, scene layout",
    glyph: "layers"
  },
  {
    id: "hand",
    title: "Hand pose",
    spec: "Articulated hand state and grasp phases for contact-rich manipulation — not just 2D boxes in frame.",
    sync: "Tactile, ego video, object interaction",
    glyph: "hand"
  },
  {
    id: "imu",
    title: "Motion & IMU dynamics",
    spec: "Linear acceleration, angular rates, and movement cues that characterize inertia, rhythm, and effort during the task.",
    sync: "Egocentric video, tactile timing, pose",
    glyph: "imu"
  },
  {
    id: "wrist",
    title: "Wrist & scene cameras",
    spec: "Secondary viewpoints for occlusion recovery, tool use, and context beyond the ego cone (roadmap / program-dependent).",
    sync: "Ego path, depth, annotations",
    glyph: "cam"
  },
  {
    id: "labels",
    title: "Labels & dense commentary",
    spec: "Task and subtask boundaries, contact phases, QC flags — plus optional timestamped, frame-aligned text narration paired to video for richer training supervision.",
    sync: "All synchronized streams · episode contract",
    glyph: "tag"
  },
  {
    id: "outcomes",
    title: "Success / failure outcomes",
    spec: "Binary or graded success, failure modes, and segment-level tags for imitation and evaluation.",
    sync: "Full multimodal episode windows",
    glyph: "check"
  }
];

/**
 * Representative domestic scenes — illustrative of the task families we scope with customers,
 * not an exhaustive or exclusive list.
 */
export const catalogSceneExamples = [
  "Washing & rinsing dishes",
  "Loading / unloading dishwasher",
  "Folding & putting away laundry",
  "Laundry sorting & handling",
  "Vacuuming & floor cleaning",
  "Coffee & beverage prep",
  "Other household manipulation (scoped per program)"
];

export const catalogBinding = {
  title: "One dataset contract",
  body: "Episodes bundle what you see, feel, and measure in the same clock — domestic scenes like the examples above are scoped per customer; modalities and commentary depth are agreed in the program so teams train on aligned supervision, not orphaned files."
};

export const catalogMeta = {
  kicker: "Episode manifest",
  title: "What SenseProbe programs deliver"
};

export const credibilityPrinciples = [
  {
    num: "01",
    title: "Calibration boundaries, stated",
    body: "We document where each signal is reliable, how drift is handled, and what should never be treated as ground-truth force."
  },
  {
    num: "02",
    title: "Semantics you can train on",
    body: "Pressure proxies, contact timing, and failure flags are defined so policy teams know exactly what each dimension means."
  },
  {
    num: "03",
    title: "Model-ready packaging",
    body: "Episodes land in the formats your trainers expect, with QC metrics and assumptions — not a dump of raw sensor folders."
  }
];

export const forTeamsCards = [
  {
    title: "Current wedge",
    body: "Custom tactile egocentric datasets for robotics teams with specific manipulation objectives and a defined quality bar."
  },
  {
    title: "Platform vision",
    body: "Infrastructure for repeatable capture, calibration, and delivery of contact-rich human demonstration data at scale."
  }
];
