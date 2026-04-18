export const scrollStages = [
  {
    id: "glove",
    kicker: "01 / GLOVE",
    title: "CONTACT",
    body: "Tactile-egocentric glove capturing force proxies, contact onset, and grip distribution — synchronized to every other stream.",
    frameDir: "/scroll-video/glove",
    frameCount: 96
  },
  {
    id: "camera",
    kicker: "02 / OPTICS",
    title: "VISION",
    body: "Head-and-chest mount captures first-person geometry and task context at frame-locked timestamps.",
    placeholderSvg: "/scroll-video/camera/placeholder.svg"
  },
  {
    id: "jetson",
    kicker: "03 / COMPUTE",
    title: "ONBOARD",
    body: "Jetson Orin Nano runs capture, calibration, and on-device QC — no laptop tether, no lost demos.",
    placeholderSvg: "/scroll-video/jetson/placeholder.svg"
  },
  {
    id: "software",
    kicker: "04 / DELIVERY",
    title: "PIPELINE",
    body: "Episodes packaged to your training stack's schema. Calibration, QC metrics, and provenance ship with the data.",
    placeholderSvg: "/scroll-video/software/placeholder.svg"
  }
];

export const STOP_COUNT = scrollStages.length;
export const TRANSITION_ZONE = 0.05;
