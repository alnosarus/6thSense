import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  SoftShadows
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
import { useStoryProgressRef } from "./StoryProgressContext.jsx";

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

/* Hero keyframe: telephoto product still — sensing face slightly squared to camera. */
const CAM_KEYS = [
  /* Slight pull-back + lower eye line so head top isn’t clipped in frame. */
  { pos: [0, -0.02, 2.46], target: [0, 0.052, 0.01] },
  { pos: [0.38, 0.16, 1.38], target: [0, 0.38, 0.12] },
  { pos: [-0.52, 0.1, 2.05], target: [0.08, 0.04, 0] },
  { pos: [0, 0.14, 2.72], target: [0, 0.08, 0] }
];

const DEV_KEYS = [
  { rot: [0.022, 0.065, 0], pos: [0, 0, 0] },
  { rot: [0.38, 0.72, 0.06], pos: [0, 0, 0] },
  { rot: [0.1, -0.42, 0], pos: [0.12, 0, 0.06] },
  { rot: [0.08, 0.18, 0], pos: [0, 0, 0] }
];

function lerpArr3(a, b, u, out) {
  out[0] = a[0] + (b[0] - a[0]) * u;
  out[1] = a[1] + (b[1] - a[1]) * u;
  out[2] = a[2] + (b[2] - a[2]) * u;
}

function sampleCam(t, outPos, outTarget) {
  const max = CAM_KEYS.length - 1;
  const f = Math.min(1, Math.max(0, t)) * max;
  const i = Math.min(Math.floor(f), max - 1);
  const u = f - i;
  const a = CAM_KEYS[i];
  const b = CAM_KEYS[i + 1];
  lerpArr3(a.pos, b.pos, u, outPos);
  lerpArr3(a.target, b.target, u, outTarget);
}

function sampleDevice(t, outRot, outPos) {
  const max = DEV_KEYS.length - 1;
  const f = Math.min(1, Math.max(0, t)) * max;
  const i = Math.min(Math.floor(f), max - 1);
  const u = f - i;
  const a = DEV_KEYS[i];
  const b = DEV_KEYS[i + 1];
  lerpArr3(a.rot, b.rot, u, outRot);
  lerpArr3(a.pos, b.pos, u, outPos);
}

function CameraRig({ reducedMotion, smoothProgress }) {
  const { camera } = useThree();
  const tmpPos = useRef([0, 0, 0]);
  const tmpTarget = useRef([0, 0, 0]);
  const wantPos = useRef(new THREE.Vector3());
  const wantTarget = useRef(new THREE.Vector3());
  const curPos = useRef(new THREE.Vector3().copy(camera.position));
  const curTarget = useRef(new THREE.Vector3(0, 0.06, 0));

  useFrame((state, delta) => {
    const p = smoothProgress.current;
    sampleCam(p, tmpPos.current, tmpTarget.current);
    wantPos.current.fromArray(tmpPos.current);
    wantTarget.current.fromArray(tmpTarget.current);

    if (reducedMotion) {
      camera.position.copy(wantPos.current);
      camera.lookAt(wantTarget.current);
      return;
    }
    /* Hero: locked composition — no parallax until user has begun the story. */
    const parallaxMix = THREE.MathUtils.smoothstep(p, 0.05, 0.16);
    const px =
      gsap.utils.mapRange(-1, 1, -0.028, 0.028, state.pointer.x) * parallaxMix;
    const py =
      gsap.utils.mapRange(-1, 1, -0.014, 0.014, state.pointer.y) * parallaxMix;
    wantPos.current.x += px;
    wantPos.current.y += py;

    const damp = p < 0.08 ? 0.62 : 0.45;
    damp3(curPos.current, wantPos.current, damp, delta);
    damp3(curTarget.current, wantTarget.current, 0.52, delta);
    camera.position.copy(curPos.current);
    camera.lookAt(curTarget.current);
  });

  return null;
}

function PostEffects({ enabled, lowPower }) {
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={lowPower ? 0 : 4} enableNormalPass={!lowPower}>
      {!lowPower ? (
        <N8AO
          halfRes
          aoRadius={2.2}
          distanceFalloff={0.4}
          intensity={0.3}
          aoSamples={8}
          denoiseSamples={4}
        />
      ) : null}
      <Bloom
        luminanceThreshold={0.62}
        luminanceSmoothing={0.92}
        intensity={lowPower ? 0.035 : 0.055}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.04} darkness={0.09} />
      <SMAA />
    </EffectComposer>
  );
}

function ClinicalProbe({ smoothProgress, reducedMotion }) {
  const group = useRef();
  const haloMat = useRef();
  const readoutGroup = useRef();
  const tmpRot = useRef([0, 0, 0]);
  const tmpPos = useRef([0, 0, 0]);
  const vRot = useRef(new THREE.Euler());
  const vPos = useRef(new THREE.Vector3());
  const wantPos = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!group.current) return;
    const p = smoothProgress.current;
    const t = state.clock.elapsedTime;
    const idleGate = 0.12 + 0.88 * THREE.MathUtils.smoothstep(p, 0, 0.16);
    const idle = reducedMotion ? 0 : Math.sin(t * 0.22) * 0.0015 * idleGate;

    sampleDevice(p, tmpRot.current, tmpPos.current);
    wantPos.current.fromArray(tmpPos.current);

    const tx = tmpRot.current[0] + idle;
    const ty = tmpRot.current[1] + idle * 0.6;
    const tz = tmpRot.current[2];
    vRot.current.x = THREE.MathUtils.lerp(vRot.current.x, tx, 1 - Math.exp(-delta * 5));
    vRot.current.y = THREE.MathUtils.lerp(vRot.current.y, ty, 1 - Math.exp(-delta * 5));
    vRot.current.z = THREE.MathUtils.lerp(vRot.current.z, tz, 1 - Math.exp(-delta * 5));
    group.current.rotation.copy(vRot.current);

    damp3(vPos.current, wantPos.current, 0.4, delta);
    group.current.position.copy(vPos.current);

    const haloOp = p > 0.48 && p < 0.78 ? 0.045 : 0;
    if (haloMat.current) {
      haloMat.current.opacity = THREE.MathUtils.lerp(haloMat.current.opacity, haloOp, 0.06);
    }
    if (readoutGroup.current) {
      const targetScale = p > 0.72 ? 1 : 0;
      const s = readoutGroup.current.scale.x;
      readoutGroup.current.scale.setScalar(
        THREE.MathUtils.lerp(s, targetScale, 1 - Math.exp(-delta * 6))
      );
    }
  });

  return (
    <group>
      {/* Multimodal alignment bands: tactile, egocentric vision, and hand-motion streams. */}
      <group position={[0, 0.52, 0.04]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.148, 0.0014, 8, 80]} />
          <meshStandardMaterial
            color="#77d1b5"
            emissive="#2d6e5e"
            emissiveIntensity={0.45}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0.5, 0]}>
          <torusGeometry args={[0.157, 0.0012, 8, 80]} />
          <meshStandardMaterial
            color="#8fb8ff"
            emissive="#345278"
            emissiveIntensity={0.42}
            transparent
            opacity={0.78}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, -0.4, 0]}>
          <torusGeometry args={[0.166, 0.0012, 8, 80]} />
          <meshStandardMaterial
            color="#f0d28e"
            emissive="#6d5630"
            emissiveIntensity={0.34}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>

      <group position={[0.55, -0.15, 0.15]} rotation={[0.15, -0.4, 0]}>
        <mesh>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshPhysicalMaterial
            ref={haloMat}
            color="#2d4a47"
            transparent
            opacity={0}
            roughness={0.75}
            metalness={0}
            transmission={0.12}
            thickness={0.25}
          />
        </mesh>
      </group>

      <group ref={readoutGroup} position={[-0.85, 0.35, 0.5]} rotation={[0, 0.25, 0]} scale={0}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.55, 0.32]} />
          <meshStandardMaterial
            color="#0e1014"
            roughness={0.6}
            metalness={0.15}
            emissive="#1a2a28"
            emissiveIntensity={0.15}
          />
        </mesh>
        <mesh position={[0, 0, 0.004]}>
          <planeGeometry args={[0.48, 0.04]} />
          <meshStandardMaterial
            color="#6b9e7d"
            emissive="#2d4a38"
            emissiveIntensity={0.32}
            roughness={0.4}
            metalness={0}
            transparent
            opacity={0.92}
          />
        </mesh>
      </group>

      <group ref={group}>
        {/* Grip / shaft: three continuous tapered sections + seams — reads as molded housing + mid soft zone. */}
        <group position={[0, -0.02, 0]}>
          <mesh castShadow receiveShadow position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.1133, 0.118, 0.32, 64]} />
            <meshPhysicalMaterial
              color="#2a2f36"
              roughness={0.96}
              metalness={0.02}
              clearcoat={0.02}
              clearcoatRoughness={0.92}
              envMapIntensity={0.28}
            />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.10855, 0.11327, 0.3, 64]} />
            <meshPhysicalMaterial
              color="#2c323a"
              roughness={0.98}
              metalness={0.018}
              clearcoat={0.02}
              clearcoatRoughness={0.94}
              envMapIntensity={0.24}
            />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.31, 0]}>
            <cylinderGeometry args={[0.105, 0.10855, 0.26, 64]} />
            <meshPhysicalMaterial
              color="#2a2f36"
              roughness={0.96}
              metalness={0.02}
              clearcoat={0.02}
              clearcoatRoughness={0.92}
              envMapIntensity={0.28}
            />
          </mesh>
          {/* Section-transition shadow grooves (tooled joint read). */}
          <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1138, 0.0014, 10, 64]} />
            <meshPhysicalMaterial
              color="#101318"
              roughness={0.95}
              metalness={0.04}
              envMapIntensity={0.1}
            />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1092, 0.0014, 10, 64]} />
            <meshPhysicalMaterial
              color="#101318"
              roughness={0.95}
              metalness={0.04}
              envMapIntensity={0.1}
            />
          </mesh>
          {/* Base roll — breaks “cut cylinder” silhouette. */}
          <mesh castShadow position={[0, -0.438, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.114, 0.0036, 12, 56]} />
            <meshPhysicalMaterial
              color="#252a32"
              roughness={0.84}
              metalness={0.07}
              envMapIntensity={0.3}
            />
          </mesh>
          {/* Top chamfer ring before neck/collar stack. */}
          <mesh castShadow position={[0, 0.422, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1036, 0.0026, 12, 56]} />
            <meshPhysicalMaterial
              color="#252b34"
              roughness={0.8}
              metalness={0.07}
              envMapIntensity={0.3}
            />
          </mesh>
          {/* Longitudinal mold parting — rear (-X), hero-facing sensing stays clean. */}
          <mesh position={[-0.112, 0, 0]}>
            <boxGeometry args={[0.002, 0.82, 0.014]} />
            <meshPhysicalMaterial
              color="#161a21"
              roughness={0.92}
              metalness={0.04}
              envMapIntensity={0.14}
              polygonOffset
              polygonOffsetFactor={2}
              polygonOffsetUnits={2}
            />
          </mesh>
        </group>

        <mesh castShadow position={[0, 0.492, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.136, 0.124, 0.195, 64]} />
          <meshPhysicalMaterial
            color="#23282f"
            roughness={0.66}
            metalness={0.06}
            clearcoat={0.05}
            clearcoatRoughness={0.72}
            envMapIntensity={0.36}
          />
        </mesh>

        <mesh castShadow position={[0, 0.388, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.116, 0.0075, 16, 80]} />
          <meshPhysicalMaterial
            color="#7e868f"
            metalness={0.84}
            roughness={0.38}
            envMapIntensity={0.48}
          />
        </mesh>

        {/* Machined shoulder: fills collar-to-head transition like a tooled step. */}
        <mesh castShadow position={[0, 0.393, 0]}>
          <cylinderGeometry args={[0.128, 0.125, 0.02, 64]} />
          <meshPhysicalMaterial
            color="#1b2028"
            roughness={0.74}
            metalness={0.1}
            envMapIntensity={0.3}
          />
        </mesh>

        {/* Circumferential parting groove: sensing module vs upper housing (shadow line). */}
        <mesh position={[0, 0.468, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.127, 0.0019, 10, 72]} />
          <meshPhysicalMaterial
            color="#0c0e12"
            roughness={0.94}
            metalness={0.04}
            envMapIntensity={0.12}
          />
        </mesh>

        {/* Pressed bezel ring around aperture (XZ plane). */}
        <mesh castShadow position={[0, 0.505, 0.109]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.099, 0.003, 12, 64]} />
          <meshPhysicalMaterial
            color="#656c74"
            metalness={0.8}
            roughness={0.36}
            envMapIntensity={0.4}
          />
        </mesh>

        {/* Recessed matte well behind bezel — reads as cavity, not a flat cap. */}
        <mesh position={[0, 0.505, 0.115]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.085, 48]} />
          <meshPhysicalMaterial
            color="#030405"
            roughness={0.9}
            metalness={0.06}
            envMapIntensity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Teal accent gasket ring, slightly behind outer optic. */}
        <mesh position={[0, 0.505, 0.122]}>
          <cylinderGeometry args={[0.103, 0.113, 0.0085, 64]} />
          <meshPhysicalMaterial
            color="#1a3330"
            roughness={0.62}
            metalness={0.12}
            clearcoat={0.18}
            clearcoatRoughness={0.55}
            envMapIntensity={0.38}
          />
        </mesh>

        {/* Outer optic / window */}
        <mesh position={[0, 0.505, 0.13]}>
          <circleGeometry args={[0.087, 64]} />
          <meshPhysicalMaterial
            color="#050607"
            roughness={0.22}
            metalness={0.42}
            clearcoat={0.88}
            clearcoatRoughness={0.14}
            envMapIntensity={0.58}
          />
        </mesh>
      </group>
    </group>
  );
}

export function ProbeExperience({ reducedMotion, transparentStage = false }) {
  const progressRef = useStoryProgressRef();
  const smoothProgress = useRef(0);
  const lowPower = useLowPowerMode();
  /* Post stack assumes an opaque scene buffer; skip when the CSS layer is the only “sky”. */
  const postFx = transparentStage ? false : !reducedMotion && !lowPower;

  useFrame((_, delta) => {
    const target = Math.min(1, Math.max(0, progressRef.current));
    const rate = reducedMotion ? 18 : 5;
    smoothProgress.current = THREE.MathUtils.lerp(
      smoothProgress.current,
      target,
      1 - Math.exp(-delta * rate)
    );
  });

  return (
    <>
      {transparentStage ? null : (
        <>
          <color attach="background" args={["#08090b"]} />
          <fogExp2 attach="fog" args={["#08090b", reducedMotion ? 0.02 : 0.03]} />
        </>
      )}

      {!reducedMotion ? <SoftShadows focus={0.045} samples={12} size={18} /> : null}

      <hemisphereLight args={["#d2dce8", "#050607", 0.38]} />
      <ambientLight intensity={0.062} color="#9aa4b0" />
      {/* Key: upper-right “beauty dish” — sculpts form, warm neutral (studio hardware). */}
      <directionalLight
        castShadow
        position={[4.6, 6.1, 3.35]}
        intensity={1.05}
        color="#f2ebe4"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={26}
        shadow-camera-left={-3.2}
        shadow-camera-right={3.2}
        shadow-camera-top={3.2}
        shadow-camera-bottom={-3.2}
        shadow-bias={-0.0002}
      />
      {/* Soft neutral fill — avoids teal CG wash on medtech read. */}
      <directionalLight position={[-2.4, 3.8, 2.6]} intensity={0.14} color="#cfd8e4" />
      {/* Cool rim from camera-left rear — silhouette separation from backdrop. */}
      <directionalLight position={[-4.8, 2.4, -2.2]} intensity={0.32} color="#aabccf" />

      <CameraRig reducedMotion={reducedMotion} smoothProgress={smoothProgress} />

      <ClinicalProbe smoothProgress={smoothProgress} reducedMotion={reducedMotion} />

      {!reducedMotion ? (
        <ContactShadows
          position={[0, -0.875, 0]}
          opacity={0.27}
          scale={14}
          blur={2.9}
          far={8.5}
          color="#000000"
        />
      ) : null}

      {/* Invisible ground: only catches shadows so the device isn’t floating on a black card. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        {transparentStage ? (
          <shadowMaterial opacity={0.32} transparent />
        ) : (
          <meshStandardMaterial
            color="#030405"
            roughness={0.98}
            metalness={0}
            envMapIntensity={0.08}
          />
        )}
      </mesh>

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.44} />
      </Suspense>

      <PostEffects enabled={postFx} lowPower={lowPower} />
    </>
  );
}
