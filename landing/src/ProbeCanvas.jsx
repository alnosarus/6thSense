import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { ProbeExperience, usePrefersReducedMotion } from "./ProbeExperience.jsx";
import { useScrollProgress } from "./ScrollContext.jsx";

export default function ProbeCanvas() {
  const scrollProgress = useScrollProgress();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="probe-canvas-wrap" aria-hidden="true">
      <Canvas
        shadows
        dpr={reducedMotion ? [1, 1] : [1, 1.5]}
        camera={{ position: [0, 0.12, 2.65], fov: 38, near: 0.1, far: 45 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Suspense fallback={null}>
          <ProbeExperience
            scrollProgress={scrollProgress}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>
      <div className="probe-canvas-vignette" />
    </div>
  );
}
