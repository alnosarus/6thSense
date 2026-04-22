// frontend/src/tactileField.js
// Canvas2D "constellation" background: sparse colored nodes drift slowly,
// nearby nodes link with faint edges, nodes near the pointer grow.

const NODE_COUNT = 48;
const LINK_DISTANCE = 180;     // CSS px — nodes closer than this get an edge
const HOVER_RADIUS = 140;      // CSS px — nodes inside this scale up on hover
const HOVER_SCALE = 1.8;       // max scale multiplier under the pointer
const DRIFT_SPEED = 0.22;      // CSS px per frame (60 fps ≈ 13 px/s)
const EDGE_ALPHA = 0.22;       // peak edge opacity; fades with distance
const EDGE_COLOR = "197, 224, 99";   // #c5e063 lime, as r,g,b for rgba()
const NODE_PALETTE = [
  "#c5e063", // brand lime
  "#7a8f3a", // deep olive
  "#d08a87", // muted pink
  "#a78463", // soft tan
  "#e8d9a6"  // cream
];

export function initTactileField(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const nodes = [];

  const state = {
    w: 0, h: 0,                // CSS pixels
    pointerX: -9999,
    pointerY: -9999,
    pressure: 0,               // 0..1, wrapper decays on pointer leave
    reduced: 0,
    lastT: 0,
    disposed: false
  };

  const seed = () => {
    nodes.length = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      nodes.push({
        x: Math.random() * state.w,
        y: Math.random() * state.h,
        vx: Math.cos(angle) * DRIFT_SPEED,
        vy: Math.sin(angle) * DRIFT_SPEED,
        color: NODE_PALETTE[Math.floor(Math.random() * NODE_PALETTE.length)],
        baseSize: 3 + Math.random() * 2.5   // 3–5.5 CSS px square
      });
    }
  };

  return {
    setPointer(x, y, pressure) {
      state.pointerX = x;
      state.pointerY = y;
      state.pressure = pressure;
    },
    setReduced(r) {
      state.reduced = r ? 1 : 0;
    },
    setSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(1, canvas.clientWidth);
      const cssH = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.w = cssW;
      state.h = cssH;
      if (nodes.length === 0) seed();
    },
    render(timeSec) {
      if (state.disposed) return;
      const { w, h } = state;
      if (w === 0 || h === 0) return;

      // Step motion. Reduced-motion users get a much slower drift.
      const speed = state.reduced ? 0.25 : 1.0;
      for (const n of nodes) {
        n.x += n.vx * speed;
        n.y += n.vy * speed;
        if (n.x < -10) n.x = w + 10;
        else if (n.x > w + 10) n.x = -10;
        if (n.y < -10) n.y = h + 10;
        else if (n.y > h + 10) n.y = -10;
      }

      ctx.clearRect(0, 0, w, h);

      // Edges first so nodes overdraw them.
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue;
          const d = Math.sqrt(d2);
          const alpha = (1 - d / LINK_DISTANCE) * EDGE_ALPHA;
          ctx.strokeStyle = `rgba(${EDGE_COLOR}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Nodes as small filled squares; grow + brighten near the pointer.
      for (const n of nodes) {
        const dx = n.x - state.pointerX, dy = n.y - state.pointerY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const hover =
          d < HOVER_RADIUS
            ? (1 - d / HOVER_RADIUS) * state.pressure
            : 0;
        const size = n.baseSize * (1 + hover * (HOVER_SCALE - 1));
        const half = size / 2;
        ctx.globalAlpha = 0.65 + 0.35 * hover;
        ctx.fillStyle = n.color;
        ctx.fillRect(n.x - half, n.y - half, size, size);
      }
      ctx.globalAlpha = 1;

      state.lastT = timeSec;
    },
    dispose() {
      state.disposed = true;
    }
  };
}
