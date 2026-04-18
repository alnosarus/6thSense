import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { ProbeExperience, usePrefersReducedMotion } from "./ProbeExperience.jsx";

export default function ProbeCanvas() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="probe-canvas-wrap" aria-hidden="true">
      <Canvas
        shadows
        dpr={reducedMotion ? [1, 1] : [1, 1.5]}
        camera={{ position: [0, -0.02, 2.46], fov: 30, near: 0.08, far: 40 }}
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9
        }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <ProbeExperience reducedMotion={reducedMotion} transparentStage />
        </Suspense>
      </Canvas>
    </div>
  );
}
