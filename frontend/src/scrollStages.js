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
    frameDir: "/scroll-video/camera",
    frameCount: 96
  }
];

export const STOP_COUNT = scrollStages.length;
export const TRANSITION_ZONE = 0.05;
