import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Animated waveform bars ─────────────────────────────────── */
function WaveformBars() {
  const groupRef = useRef<THREE.Group>(null);
  const BAR_COUNT = 16;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const wave =
        0.09 +
        Math.abs(
          Math.sin(t * (1.5 + i * 0.22) + i * 0.55) * 0.44 +
          Math.sin(t * (2.1 + i * 0.14) + i * 1.1) * 0.14
        );
      mesh.scale.y = Math.max(0.09, wave);
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 1.6]}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const x = (i - BAR_COUNT / 2 + 0.5) * 0.13;
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[0.07, 0.56, 0.07]} />
            <meshStandardMaterial
              color="#e9d5ff"
              emissive="#c084fc"
              emissiveIntensity={3}
              transparent
              opacity={0.92}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Glowing orb (pure emissive, no transmission) ──────────── */
function VoiceOrb() {
  const outerRef = useRef<THREE.Mesh>(null);
  const coreRef  = useRef<THREE.Mesh>(null);
  const mid1Ref  = useRef<THREE.Mesh>(null);
  const mid2Ref  = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.07;
      outerRef.current.rotation.x = Math.sin(t * 0.11) * 0.04;
    }
    // Pulse the mid shells
    if (mid1Ref.current) mid1Ref.current.scale.setScalar(0.97 + Math.sin(t * 1.8) * 0.03);
    if (mid2Ref.current) mid2Ref.current.scale.setScalar(0.95 + Math.sin(t * 1.8 + 1.2) * 0.04);
    // Throb the core
    if (coreRef.current) coreRef.current.scale.setScalar(0.91 + Math.sin(t * 2.4) * 0.09);
  });

  return (
    <group>
      {/* ── Outermost rim — very faint, back-side so it halos the sphere ── */}
      <mesh>
        <sphereGeometry args={[2.15, 64, 64]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#7c3aed"
          emissiveIntensity={0.15}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── Outer shell — slight metallic sheen ── */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[2.0, 64, 64]} />
        <meshStandardMaterial
          color="#a78bfa"
          metalness={0.5}
          roughness={0.08}
          transparent
          opacity={0.14}
        />
      </mesh>

      {/* ── Mid glow layer 1 ── */}
      <mesh ref={mid1Ref}>
        <sphereGeometry args={[1.65, 48, 48]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#6d28d9"
          emissiveIntensity={1.2}
          transparent
          opacity={0.26}
          roughness={0.25}
        />
      </mesh>

      {/* ── Mid glow layer 2 ── */}
      <mesh ref={mid2Ref}>
        <sphereGeometry args={[1.3, 32, 32]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#7c3aed"
          emissiveIntensity={2}
          transparent
          opacity={0.35}
          roughness={0.2}
        />
      </mesh>

      {/* ── Pulsing core ── */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial
          color="#c4b5fd"
          emissive="#7c3aed"
          emissiveIntensity={5}
          transparent
          opacity={0.9}
          roughness={0.05}
        />
      </mesh>

      {/* ── Bright inner highlight ── */}
      <mesh>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshBasicMaterial color="#ede9fe" transparent opacity={0.8} />
      </mesh>

      <WaveformBars />
    </group>
  );
}

/* ── Orbital rings ──────────────────────────────────────────── */
function PulseRings() {
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const r3 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (r1.current) r1.current.scale.setScalar(1 + 0.05 * Math.sin(t * 1.7));
    if (r2.current) r2.current.scale.setScalar(1 + 0.04 * Math.sin(t * 1.7 + 1.1));
    if (r3.current) r3.current.scale.setScalar(1 + 0.03 * Math.sin(t * 1.7 + 2.2));
  });

  return (
    <>
      <mesh ref={r1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.4, 0.022, 16, 160]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.55} />
      </mesh>
      <mesh ref={r2} rotation={[Math.PI / 2.4, 0.4, 0.2]}>
        <torusGeometry args={[2.8, 0.016, 16, 160]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.38} />
      </mesh>
      <mesh ref={r3} rotation={[Math.PI / 1.8, 0.7, 0.5]}>
        <torusGeometry args={[3.2, 0.012, 16, 160]} />
        <meshBasicMaterial color="#c026d3" transparent opacity={0.22} />
      </mesh>
    </>
  );
}

/* ── Floating particles ─────────────────────────────────────── */
function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const geoRef    = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    if (!geoRef.current) return;
    const count = 75;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = 2.9 + Math.random() * 1.9;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geoRef.current.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.04;
      pointsRef.current.rotation.x = clock.getElapsedTime() * 0.013;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial color="#c4b5fd" size={0.048} transparent opacity={0.65} sizeAttenuation />
    </points>
  );
}

/* ── Scene ──────────────────────────────────────────────────── */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      {/* Primary violet key — lights the core */}
      <pointLight position={[0, 0, 5]}    color="#7c3aed" intensity={14} />
      {/* Cyan fill — right side */}
      <pointLight position={[5, 2, 2]}    color="#06b6d4" intensity={6}  />
      {/* Fuchsia rim — left/below */}
      <pointLight position={[-4, -3, 1]}  color="#c026d3" intensity={4}  />
      {/* Lavender top */}
      <pointLight position={[0, 5, 1]}    color="#a78bfa" intensity={5}  />
      {/* Back fill */}
      <pointLight position={[0, 0, -4]}   color="#6d28d9" intensity={2}  />

      <VoiceOrb />
      <PulseRings />
      <FloatingParticles />
    </>
  );
}

/* ── Export ─────────────────────────────────────────────────── */
export function HeroOrb3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
