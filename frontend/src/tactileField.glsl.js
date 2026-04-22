// frontend/src/tactileField.glsl.js
// Vertex + fragment shaders for the hero tactile pressure surface.
// Kept as JS string exports so no glslify / build-step plugin is needed.

export const VERTEX_SRC = `
precision mediump float;

attribute vec2 aGrid;           // normalized grid coords in [0, 1]

uniform float uTime;            // seconds since init
uniform vec2  uPointer;         // cursor in NDC, (-1..1, -1..1)
uniform float uPressure;        // 0..1, fades out when pointer leaves
uniform float uPressureRadius;  // ~0.18 in NDC
uniform float uPressureStrength;// ~0.35 Z-displacement under pressure
uniform float uAspect;          // canvas width / height
uniform float uReduced;         // 1.0 disables shimmer for reduced-motion users

varying float vPress;

void main() {
  vec2 xy = aGrid * 2.0 - 1.0;

  float shimmer = sin(aGrid.x * 20.0 + uTime * 0.6)
                * cos(aGrid.y * 20.0 + uTime * 0.4)
                * 0.015
                * (1.0 - uReduced);

  // Aspect-correct distance so the pressure zone reads as a circle, not an ellipse.
  vec2 pointerAC = vec2(uPointer.x * uAspect, uPointer.y);
  vec2 xyAC      = vec2(xy.x      * uAspect, xy.y);
  float d = distance(pointerAC, xyAC);
  float press = smoothstep(uPressureRadius, 0.0, d) * uPressure;

  float z = shimmer + press * uPressureStrength;
  gl_Position = vec4(xy, z, 1.0);
  gl_PointSize = mix(1.2, 2.6, press);

  vPress = press;
}
`;

export const FRAGMENT_SRC = `
precision mediump float;

varying float vPress;

void main() {
  // Round dot with smooth edge.
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float alphaEdge = smoothstep(0.5, 0.45, r);

  // #1a2010 (dark olive) -> #c5e063 (brand lime).
  vec3 rest  = vec3(0.102, 0.125, 0.063);
  vec3 hot   = vec3(0.773, 0.878, 0.388);
  vec3 color = mix(rest, hot, pow(vPress, 1.4));

  float alpha = alphaEdge * (0.6 + 0.4 * vPress);
  gl_FragColor = vec4(color, alpha);
}
`;
