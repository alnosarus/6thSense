// frontend/src/tactileField.js
// Raw-WebGL tactile pressure surface. Framework-agnostic; the React wrapper
// in TactileField.jsx drives resize + pointer state.

import { VERTEX_SRC, FRAGMENT_SRC } from "./tactileField.glsl.js";

const GRID = 150;                 // 150 x 150 = 22,500 particles
const PRESSURE_RADIUS = 0.18;
const PRESSURE_STRENGTH = 0.35;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`tactileField: shader compile failed: ${log}`);
  }
  return sh;
}

function link(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`tactileField: program link failed: ${log}`);
  }
  return p;
}

function buildGridVBO(gl) {
  const data = new Float32Array(GRID * GRID * 2);
  let i = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      data[i++] = x / (GRID - 1);   // u
      data[i++] = y / (GRID - 1);   // v
    }
  }
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return { vbo, count: GRID * GRID };
}

// Public API. Returns a handle or null if WebGL is unavailable.
export function initTactileField(canvas) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: true })
          || canvas.getContext("experimental-webgl");
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  const program = link(gl, vs, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const { vbo, count } = buildGridVBO(gl);

  const loc = {
    aGrid:            gl.getAttribLocation(program, "aGrid"),
    uTime:            gl.getUniformLocation(program, "uTime"),
    uPointer:         gl.getUniformLocation(program, "uPointer"),
    uPressure:        gl.getUniformLocation(program, "uPressure"),
    uPressureRadius:  gl.getUniformLocation(program, "uPressureRadius"),
    uPressureStrength:gl.getUniformLocation(program, "uPressureStrength"),
    uAspect:          gl.getUniformLocation(program, "uAspect"),
    uReduced:         gl.getUniformLocation(program, "uReduced")
  };

  gl.useProgram(program);
  gl.uniform1f(loc.uPressureRadius, PRESSURE_RADIUS);
  gl.uniform1f(loc.uPressureStrength, PRESSURE_STRENGTH);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const state = {
    pointerX: 2, pointerY: 2,      // offscreen default
    pressure: 0,
    reduced: 0,
    aspect: 1,
    disposed: false
  };

  const api = {
    setPointer(xNdc, yNdc, pressure) {
      state.pointerX = xNdc;
      state.pointerY = yNdc;
      state.pressure = pressure;
    },
    setReduced(reduced) {
      state.reduced = reduced ? 1 : 0;
    },
    setSize(w, h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      state.aspect = w / Math.max(1, h);
    },
    render(timeSec) {
      if (state.disposed) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(loc.aGrid);
      gl.vertexAttribPointer(loc.aGrid, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(loc.uTime, timeSec);
      gl.uniform2f(loc.uPointer, state.pointerX, state.pointerY);
      gl.uniform1f(loc.uPressure, state.pressure);
      gl.uniform1f(loc.uAspect, state.aspect);
      gl.uniform1f(loc.uReduced, state.reduced);
      gl.drawArrays(gl.POINTS, 0, count);
    },
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      gl.deleteBuffer(vbo);
      gl.deleteProgram(program);
    }
  };

  return api;
}
