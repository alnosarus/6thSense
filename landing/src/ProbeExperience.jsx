import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  SoftShadows,
  useCursor
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  Vignette
} from "@react-three/postprocessing";
import * as THREE from "three";
import { damp3 } from "maath/easing";
import gsap from "gsap";

export function usePrefersReducedMotion() {
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

function useLowPowerMode() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    const run = () => {
      const w = window.innerWidth;
      const ram = navigator.deviceMemory;
      setLow(w < 768 || (typeof ram === "number" && ram <= 4));
    };
    run();
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, []);
  return low;
}

function CameraRig({ reducedMotion, hover, smoothScroll }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.12, 2.55));
  const lookAt = useRef(new THREE.Vector3(0, 0.02, 0));

  useFrame((state, delta) => {
    const s = smoothScroll.current;
    const px = gsap.utils.mapRange(-1, 1, -0.14, 0.14, state.pointer.x);
    const py = gsap.utils.mapRange(-1, 1, -0.06, 0.06, state.pointer.y);
    const lift = hover ? 0.04 : 0;

    if (reducedMotion) {
      camera.position.set(0, 0.12, 2.65);
      camera.lookAt(0, 0.02, 0);
      return;
    }

    target.current.set(
      px + Math.sin(s * Math.PI * 2) * 0.025,
      0.06 + s * 0.2 + py + lift,
      2.15 + s * 0.5
    );
    lookAt.current.set(0, 0.02 + s * 0.04, 0);

    damp3(camera.position, target.current, 0.52, delta);
    camera.lookAt(lookAt.current);
  });

  return null;
}

function PostEffects({ enabled, lowPower }) {
  if (!enabled) return null;
  return (
    <EffectComposer
      multisampling={lowPower ? 0 : 4}
      enableNormalPass={!lowPower}
    >
      {!lowPower ? (
        <N8AO
          halfRes
          aoRadius={3.5}
          distanceFalloff={0.28}
          intensity={1}
          aoSamples={10}
          denoiseSamples={4}
        />
      ) : null}
      <Bloom
        luminanceThreshold={0.3}
        luminanceSmoothing={0.92}
        intensity={lowPower ? 0.2 : 0.36}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.14} darkness={0.4} />
      <SMAA />
    </EffectComposer>
  );
}

function ProbeAssembly({ scrollProgress, reducedMotion, smoothScroll, onHover }) {
  const group = useRef();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useEffect(() => {
    onHover?.(hovered);
  }, [hovered, onHover]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const s = smoothScroll.current;
    const base = s * Math.PI * 2;
    const lift = hovered ? 0.04 : 0;

    if (reducedMotion) {
      group.current.rotation.y = base;
      group.current.rotation.x = scrollProgress * 0.55;
      group.current.position.y = lift;
      group.current.scale.setScalar(1);
      return;
    }

    group.current.rotation.y = base + Math.sin(t * 0.28) * 0.05;
    group.current.rotation.x =
      s * 0.52 + Math.cos(t * 0.22) * 0.035 + (hovered ? 0.04 : 0);
    group.current.rotation.z = Math.sin(t * 0.18) * 0.02;
    group.current.position.y = Math.sin(t * 0.35) * 0.025 + lift;
    const sc = THREE.MathUtils.lerp(
      group.current.scale.x,
      hovered ? 1.035 : 1,
      0.08
    );
    group.current.scale.setScalar(sc);
  });

  const phase = useMemo(() => Math.floor(scrollProgress * 4) % 4, [scrollProgress]);

  const body = (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.32, 1.15, 10, 40]} />
        <meshPhysicalMaterial
          color="#ebe3d6"
          roughness={0.38}
          metalness={0.08}
          clearcoat={0.35}
          clearcoatRoughness={0.45}
          envMapIntensity={1.15}
        />
      </mesh>

      <mesh castShadow position={[0, 0.55, 0.18]} rotation={[0.9, 0.4, 0]}>
        <torusGeometry args={[0.22, 0.038, 32, 96]} />
        <meshPhysicalMaterial
          color="#c94a24"
          emissive="#4a1808"
          emissiveIntensity={0.18 + phase * 0.04 + (hovered ? 0.12 : 0)}
          roughness={0.22}
          metalness={0.45}
          envMapIntensity={1.35}
          clearcoat={0.55}
          clearcoatRoughness={0.2}
        />
      </mesh>

      <mesh position={[0, -0.28, 0.12]} rotation={[0.25, 0, 0]} receiveShadow>
        <boxGeometry args={[0.48, 0.025, 0.36]} />
        <meshStandardMaterial
          color="#151b28"
          roughness={0.42}
          metalness={0.35}
          envMapIntensity={0.9}
        />
      </mesh>

      <mesh position={[-0.12, 0.15, 0.32]}>
        <sphereGeometry args={[0.055, 32, 32]} />
        <meshStandardMaterial
          color="#4d7cff"
          emissive="#1e3faa"
          emissiveIntensity={0.42 + (hovered ? 0.35 : 0)}
          roughness={0.15}
          metalness={0.25}
          envMapIntensity={1.4}
        />
      </mesh>

      <mesh position={[0.1, -0.05, 0.28]} castShadow>
        <boxGeometry args={[0.07, 0.07, 0.02]} />
        <meshStandardMaterial
          color="#2a3142"
          metalness={0.55}
          roughness={0.28}
          envMapIntensity={1.15}
        />
      </mesh>

      <mesh position={[0, 0.05, -0.38]}>
        <planeGeometry args={[0.9, 0.5]} />
        <meshStandardMaterial
          color="#b83f1a"
          emissive="#5c1f0d"
          emissiveIntensity={0.08}
          roughness={0.95}
          metalness={0}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );

  if (reducedMotion) {
    return body;
  }

  return (
    <Float speed={0.85} rotationIntensity={0.06} floatIntensity={0.11}>
      {body}
    </Float>
  );
}

export function ProbeExperience({ scrollProgress, reducedMotion }) {
  const smoothScroll = useRef(0);
  const [hover, setHover] = useState(false);
  const lowPower = useLowPowerMode();
  const postFx = !reducedMotion && !lowPower;

  useFrame((_, delta) => {
    smoothScroll.current = THREE.MathUtils.lerp(
      smoothScroll.current,
      scrollProgress,
      1 - Math.exp(-delta * 5.5)
    );
  });

  return (
    <>
      <color attach="background" args={["#0a0d14"]} />
      <fogExp2 attach="fog" args={["#0a0d14", reducedMotion ? 0.035 : 0.062]} />

      {!reducedMotion ? <SoftShadows focus={0.04} samples={10} size={22} /> : null}

      <ambientLight intensity={0.22} color="#b8c4e8" />
      <directionalLight
        castShadow
        position={[5.5, 9, 4]}
        intensity={1.85}
        color="#ffe3d0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.00025}
      />
      <directionalLight
        position={[-5, 4.5, -3]}
        intensity={0.45}
        color="#7aa8ff"
      />
      <spotLight
        position={[0, 5, 1]}
        angle={0.35}
        penumbra={0.85}
        intensity={0.55}
        color="#ffcfb3"
        castShadow={false}
      />
      <pointLight position={[-1.8, 0.5, 2.2]} intensity={0.35} color="#ff6b35" />

      <CameraRig
        reducedMotion={reducedMotion}
        hover={hover}
        smoothScroll={smoothScroll}
      />

      <ProbeAssembly
        scrollProgress={scrollProgress}
        reducedMotion={reducedMotion}
        smoothScroll={smoothScroll}
        onHover={setHover}
      />

      {!reducedMotion ? (
        <ContactShadows
          position={[0, -0.94, 0]}
          opacity={0.45}
          scale={10}
          blur={2.5}
          far={9}
          color="#000000"
        />
      ) : null}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial
          color="#0e1018"
          roughness={0.88}
          metalness={0.06}
          envMapIntensity={0.35}
        />
      </mesh>

      <mesh position={[0, -0.2, -3.6]} rotation={[0.08, 0, 0]}>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial
          color="#121826"
          emissive="#1a2230"
          emissiveIntensity={0.12}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.95} />
      </Suspense>

      <PostEffects enabled={postFx} lowPower={lowPower} />
    </>
  );
}
