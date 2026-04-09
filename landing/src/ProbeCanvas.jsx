import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import { useScrollProgress } from "./ScrollContext.jsx";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function ProbeAssembly({ scrollProgress, reducedMotion }) {
  const group = useRef();

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const base = scrollProgress * Math.PI * 2;
    if (reducedMotion) {
      group.current.rotation.y = base;
      group.current.rotation.x = scrollProgress * 0.55;
      group.current.position.y = 0;
      return;
    }
    group.current.rotation.y = base + Math.sin(t * 0.35) * 0.06;
    group.current.rotation.x = scrollProgress * 0.55 + Math.cos(t * 0.28) * 0.04;
    group.current.position.y = Math.sin(t * 0.4) * 0.03;
  });

  const phase = useMemo(() => Math.floor(scrollProgress * 4) % 4, [scrollProgress]);

  const body = (
    <group ref={group}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.32, 1.15, 6, 24]} />
        <meshStandardMaterial
          color="#efe8dc"
          roughness={0.35}
          metalness={0.12}
        />
      </mesh>

      <mesh castShadow position={[0, 0.55, 0.18]} rotation={[0.9, 0.4, 0]}>
        <torusGeometry args={[0.22, 0.035, 16, 64]} />
        <meshStandardMaterial
          color="#b83f1a"
          emissive="#5c1f0d"
          emissiveIntensity={0.12 + phase * 0.03}
          roughness={0.25}
          metalness={0.35}
        />
      </mesh>

      <mesh position={[0, -0.28, 0.12]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.48, 0.025, 0.36]} />
        <meshStandardMaterial color="#1c2230" roughness={0.45} metalness={0.2} />
      </mesh>

      <mesh position={[-0.12, 0.15, 0.32]}>
        <sphereGeometry args={[0.055, 24, 24]} />
        <meshStandardMaterial
          color="#3d6ee8"
          emissive="#1a2f66"
          emissiveIntensity={0.35}
        />
      </mesh>

      <mesh position={[0.1, -0.05, 0.28]}>
        <boxGeometry args={[0.07, 0.07, 0.02]} />
        <meshStandardMaterial color="#2a3142" metalness={0.5} roughness={0.3} />
      </mesh>

      <mesh position={[0, 0.05, -0.38]}>
        <planeGeometry args={[0.9, 0.5]} />
        <meshBasicMaterial color="#b83f1a" transparent opacity={0.08} />
      </mesh>
    </group>
  );

  if (reducedMotion) {
    return body;
  }

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.2}>
      {body}
    </Float>
  );
}

function Scene({ scrollProgress, reducedMotion }) {
  return (
    <>
      <color attach="background" args={["#0c0e12"]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[4, 6, 3]}
        intensity={1.15}
        color="#ffe8d9"
      />
      <pointLight position={[-2, 1, 2]} intensity={0.6} color="#b83f1a" />
      <ProbeAssembly
        scrollProgress={scrollProgress}
        reducedMotion={reducedMotion}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial
          color="#12151c"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      {!reducedMotion ? <Environment preset="city" /> : null}
    </>
  );
}

export default function ProbeCanvas() {
  const scrollProgress = useScrollProgress();
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="probe-canvas-wrap" aria-hidden="true">
      <Canvas
        shadows
        dpr={reducedMotion ? [1, 1] : [1, 1.75]}
        camera={{ position: [0, 0.2, 2.8], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <Scene scrollProgress={scrollProgress} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
      <div className="probe-canvas-vignette" />
    </div>
  );
}
