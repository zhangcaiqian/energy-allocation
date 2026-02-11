"use client";

import { useRef, useMemo, memo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSeedling } from "@fortawesome/free-solid-svg-icons";

interface GardenSceneProps {
  energyLevel: number; // 0-1
  reserveRatio: number; // 0-1
}

// ============================================================
// Time-of-day helper: returns a 0-1 progress through the day
// ============================================================
function getTimeProgress(): number {
  const now = new Date();
  return (now.getHours() * 60 + now.getMinutes()) / 1440;
}

// Map time-of-day to sun angle (radians). 0.5 = noon
function getSunAngle(t: number): number {
  return (t - 0.25) * Math.PI; // sunrise at 6 AM = 0.25
}

// Palette that changes with time-of-day, Zelda BotW inspired
function getSkyPalette(t: number) {
  // night 0-0.22, dawn 0.22-0.3, day 0.3-0.75, dusk 0.75-0.85, night 0.85-1
  if (t < 0.22 || t > 0.88) {
    return {
      skyTop: "#0b1026",
      skyBottom: "#1a1a3e",
      sunColor: "#ffe4b5",
      ambientColor: "#1a1a40",
      ambientIntensity: 0.15,
      dirIntensity: 0.1,
      fogColor: "#0d1130",
      isNight: true,
      starOpacity: 1.0,
    };
  }
  if (t < 0.30) {
    // dawn
    const f = (t - 0.22) / 0.08;
    return {
      skyTop: lerpColor("#0b1026", "#ff9a56", f),
      skyBottom: lerpColor("#1a1a3e", "#ffd4a0", f),
      sunColor: "#ff8844",
      ambientColor: lerpColor("#1a1a40", "#ffd4a0", f),
      ambientIntensity: 0.15 + f * 0.35,
      dirIntensity: 0.1 + f * 0.6,
      fogColor: lerpColor("#0d1130", "#ffc89a", f),
      isNight: false,
      starOpacity: 1 - f,
    };
  }
  if (t < 0.75) {
    // daytime
    return {
      skyTop: "#4aa3df",
      skyBottom: "#87CEEB",
      sunColor: "#fff5e0",
      ambientColor: "#b3d9f7",
      ambientIntensity: 0.55,
      dirIntensity: 0.9,
      fogColor: "#c5e5f5",
      isNight: false,
      starOpacity: 0,
    };
  }
  if (t < 0.88) {
    // dusk
    const f = (t - 0.75) / 0.13;
    return {
      skyTop: lerpColor("#4aa3df", "#0b1026", f),
      skyBottom: lerpColor("#87CEEB", "#1a1a3e", f),
      sunColor: lerpColor("#fff5e0", "#ff6633", f),
      ambientColor: lerpColor("#b3d9f7", "#1a1a40", f),
      ambientIntensity: 0.55 - f * 0.4,
      dirIntensity: 0.9 - f * 0.8,
      fogColor: lerpColor("#c5e5f5", "#0d1130", f),
      isNight: false,
      starOpacity: f,
    };
  }
  // fallback
  return {
    skyTop: "#4aa3df",
    skyBottom: "#87CEEB",
    sunColor: "#fff5e0",
    ambientColor: "#b3d9f7",
    ambientIntensity: 0.55,
    dirIntensity: 0.9,
    fogColor: "#c5e5f5",
    isNight: false,
    starOpacity: 0,
  };
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  ca.lerp(cb, t);
  return "#" + ca.getHexString();
}

// ============================================================
// Sky dome with gradient
// ============================================================
function SkyDome({ palette }: { palette: ReturnType<typeof getSkyPalette> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(palette.skyTop) },
        bottomColor: { value: new THREE.Color(palette.skyBottom) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (material.uniforms) {
      material.uniforms.topColor.value.set(palette.skyTop);
      material.uniforms.bottomColor.value.set(palette.skyBottom);
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[15, 32, 16]} />
    </mesh>
  );
}

// ============================================================
// Sun
// ============================================================
function Sun({ timeProgress, palette }: { timeProgress: number; palette: ReturnType<typeof getSkyPalette> }) {
  const ref = useRef<THREE.Mesh>(null);
  const angle = getSunAngle(timeProgress);

  // Sun position on an arc
  const sunX = Math.cos(angle) * 6;
  const sunY = Math.sin(angle) * 6;

  // Only show above horizon
  if (sunY < -0.5) return null;

  return (
    <group position={[sunX, sunY, -5]}>
      {/* Sun glow (outer) */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={palette.sunColor}
          transparent
          opacity={0.25}
        />
      </mesh>
      {/* Sun core */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color={palette.sunColor} />
      </mesh>
    </group>
  );
}

// ============================================================
// Moon (shown during dusk and night, i.e. t > 0.72)
// ============================================================
function Moon({ timeProgress }: { timeProgress: number }) {
  // Show moon from late afternoon onwards and until dawn
  const showMoon = timeProgress > 0.72 || timeProgress < 0.25;
  if (!showMoon) return null;

  // Moon rises from the east as sun sets
  // At dusk start (0.72) moon is near horizon, at midnight (0) moon is highest
  let moonAngle: number;
  if (timeProgress > 0.5) {
    // Evening: moon rises
    moonAngle = ((timeProgress - 0.72) / 0.28) * Math.PI * 0.6;
  } else {
    // After midnight: moon descends
    moonAngle = Math.PI * 0.6 - (timeProgress / 0.25) * Math.PI * 0.3;
  }

  const moonX = Math.cos(moonAngle) * 4 - 2;
  const moonY = Math.max(Math.sin(moonAngle) * 5, 0.8);

  // Opacity fades in during dusk
  let opacity = 1.0;
  if (timeProgress > 0.72 && timeProgress < 0.80) {
    opacity = (timeProgress - 0.72) / 0.08; // fade in
  }

  return (
    <group position={[moonX, moonY, -6]}>
      {/* Moon glow */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#fffde8" transparent opacity={0.1 * opacity} />
      </mesh>
      {/* Moon body */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#f5f0d8" transparent opacity={opacity} />
      </mesh>
      {/* Crescent shadow to make it look like a crescent moon */}
      <mesh position={[0.1, 0.05, 0.15]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial
          color={timeProgress > 0.88 || timeProgress < 0.22 ? "#0b1026" : "#1a1a3e"}
          transparent
          opacity={0.85 * opacity}
        />
      </mesh>
    </group>
  );
}

// ============================================================
// Stars
// ============================================================
const STAR_POSITIONS = Array.from({ length: 40 }, (_, i) => ({
  x: (Math.sin(i * 137.5) * 8 + (i % 3) * 2) % 12 - 6,
  y: 2 + (i * 0.37) % 5,
  z: -4 - (i * 0.23) % 4,
  size: 0.02 + (i % 5) * 0.01,
}));

function Stars({ opacity }: { opacity: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const m = child as THREE.Mesh;
        if (m.material && "opacity" in m.material) {
          (m.material as THREE.MeshBasicMaterial).opacity =
            opacity * (0.5 + Math.sin(state.clock.elapsedTime * 1.5 + i) * 0.5);
        }
      });
    }
  });

  if (opacity < 0.01) return null;

  return (
    <group ref={ref}>
      {STAR_POSITIONS.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[s.size, 4, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// Zelda-style Cloud - soft, puffy
// ============================================================
function Cloud({
  position,
  scale = 1,
  speed = 0.15,
}: {
  position: [number, number, number];
  scale?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const initialX = useRef(position[0]);

  useFrame((state) => {
    if (ref.current) {
      // Slowly drift
      ref.current.position.x =
        initialX.current + Math.sin(state.clock.elapsedTime * speed) * 0.5 +
        state.clock.elapsedTime * speed * 0.1;

      // Wrap around
      if (ref.current.position.x > 8) {
        ref.current.position.x = -8;
        initialX.current = -8;
      }
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Zelda-style: multiple overlapping spheres for puffy look */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0.4, 0.05, 0.1]}>
        <sphereGeometry args={[0.4, 12, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-0.35, 0.08, -0.05]}>
        <sphereGeometry args={[0.35, 12, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0.15, 0.2, 0]}>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-0.1, -0.1, 0.15]}>
        <sphereGeometry args={[0.38, 12, 8]} />
        <meshStandardMaterial color="#f8f8ff" roughness={1} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// Cloud layout
const CLOUD_CONFIGS = [
  { position: [-3, 3.5, -4] as [number, number, number], scale: 1.2, speed: 0.12 },
  { position: [2, 4, -5] as [number, number, number], scale: 0.9, speed: 0.18 },
  { position: [-1, 3, -3.5] as [number, number, number], scale: 0.7, speed: 0.15 },
  { position: [4, 3.8, -4.5] as [number, number, number], scale: 1.0, speed: 0.1 },
  { position: [-5, 4.2, -5.5] as [number, number, number], scale: 0.8, speed: 0.14 },
];

// ============================================================
// Zelda-style stylized flower
// ============================================================
function ZeldaFlower({
  position,
  energyLevel,
  delay = 0,
  hueShift = 0,
}: {
  position: [number, number, number];
  energyLevel: number;
  delay?: number;
  hueShift?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const petalCount = 5;
  const scale = 0.4 + energyLevel * 0.6;

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime + delay;
      // Gentle sway in the wind - Zelda style
      meshRef.current.rotation.z = Math.sin(t * 0.6) * 0.08 * energyLevel;
      meshRef.current.position.y =
        position[1] + Math.sin(t * 0.4) * 0.03 * energyLevel;
    }
  });

  const petalColor = useMemo(() => {
    const hue = (0.85 + hueShift) % 1.0;
    const sat = 0.5 + energyLevel * 0.4;
    const light = 0.55 + energyLevel * 0.15;
    return new THREE.Color().setHSL(hue, sat, light);
  }, [energyLevel, hueShift]);

  const centerColor = useMemo(
    () => new THREE.Color().setHSL(0.13, 0.9, 0.55 + energyLevel * 0.15),
    [energyLevel]
  );

  const stemGreen = useMemo(() => {
    const sat = 40 + energyLevel * 30;
    return `hsl(115, ${Math.round(sat)}%, 32%)`;
  }, [energyLevel]);

  const leafGreen = useMemo(() => {
    const sat = 45 + energyLevel * 30;
    return `hsl(118, ${Math.round(sat)}%, 38%)`;
  }, [energyLevel]);

  return (
    <group ref={meshRef} position={position} scale={scale}>
      {/* Stem - slightly curved */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.018, 0.028, 0.9, 6]} />
        <meshStandardMaterial color={stemGreen} roughness={0.8} />
      </mesh>

      {/* Leaves on stem */}
      <mesh
        position={[0.08, -0.3, 0]}
        rotation={[0, 0, -0.5]}
        scale={[1.4, 0.45, 0.7]}
      >
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={leafGreen} roughness={0.8} />
      </mesh>
      <mesh
        position={[-0.07, -0.45, 0.02]}
        rotation={[0, 0.3, 0.4]}
        scale={[1.2, 0.4, 0.6]}
      >
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={leafGreen} roughness={0.8} />
      </mesh>

      {/* Petals - Zelda BotW style: rounder, wider petals */}
      {Array.from({ length: petalCount }).map((_, i) => {
        const angle = (i / petalCount) * Math.PI * 2;
        const openness = 0.08 + energyLevel * 0.12;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * openness,
              0.02 + Math.sin(angle) * 0.01,
              Math.sin(angle) * openness,
            ]}
            rotation={[
              Math.sin(angle) * (0.6 - energyLevel * 0.4),
              angle,
              0,
            ]}
            scale={[1, 0.7, 1.3]}
          >
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial
              color={petalColor}
              roughness={0.6}
              metalness={0}
            />
          </mesh>
        );
      })}

      {/* Flower center - prominent in Zelda style */}
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial color={centerColor} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ============================================================
// Zelda-style grass blade cluster (wind-responsive)
// ============================================================
function ZeldaGrass({
  position,
  energyLevel,
}: {
  position: [number, number, number];
  energyLevel: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      // Wind wave effect based on position
      const windWave = Math.sin(t * 0.8 + position[0] * 2) * 0.06;
      ref.current.rotation.z = windWave;
    }
  });

  const greenness = 30 + energyLevel * 30;
  const grassColor = useMemo(
    () => `hsl(115, 52%, ${Math.round(greenness)}%)`,
    [greenness]
  );
  const grassColorLight = useMemo(
    () => `hsl(118, 55%, ${Math.round(greenness + 8)}%)`,
    [greenness]
  );

  const bladeHeights = useMemo(
    () =>
      [0.14, 0.18, 0.22, 0.16, 0.13, 0.19].map(
        (h) => h * (0.5 + energyLevel * 0.5)
      ),
    [energyLevel]
  );

  return (
    <group ref={ref} position={position}>
      {bladeHeights.map((height, i) => {
        const angle = ((i - 2.5) / 6) * 0.8;
        const isLight = i % 2 === 0;
        return (
          <mesh
            key={i}
            position={[angle * 0.06, height / 2, (i % 3) * 0.01]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.012, height, 0.005]} />
            <meshStandardMaterial
              color={isLight ? grassColorLight : grassColor}
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================
// Small decorative mushroom (Zelda forest vibe)
// ============================================================
function Mushroom({
  position,
  energyLevel,
}: {
  position: [number, number, number];
  energyLevel: number;
}) {
  const capColor = useMemo(() => {
    const sat = 50 + energyLevel * 40;
    return `hsl(0, ${Math.round(sat)}%, 55%)`;
  }, [energyLevel]);

  const scale = 0.3 + energyLevel * 0.4;

  return (
    <group position={position} scale={scale}>
      {/* Stem */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.08, 8]} />
        <meshStandardMaterial color="#f5ede3" roughness={0.8} />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={capColor} roughness={0.6} />
      </mesh>
      {/* Dots on cap */}
      <mesh position={[0.02, 0.13, 0.03]} scale={0.4}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshStandardMaterial color="#fff5ee" roughness={0.5} />
      </mesh>
      <mesh position={[-0.03, 0.12, -0.01]} scale={0.3}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshStandardMaterial color="#fff5ee" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ============================================================
// Small rock
// ============================================================
function Rock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} scale={[1.2, 0.7, 1]}>
        <dodecahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color="#8a8a7a" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 0.02, 0.03]} scale={[0.8, 0.6, 0.9]}>
        <dodecahedronGeometry args={[0.04, 0]} />
        <meshStandardMaterial color="#7a7a6e" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ============================================================
// Zelda-style Ground
// ============================================================
function ZeldaGround({ energyLevel }: { energyLevel: number }) {
  const grassColor = useMemo(() => {
    const g = 90 + energyLevel * 70;
    const r = 80 + energyLevel * 30;
    return new THREE.Color(`rgb(${Math.floor(r)}, ${Math.floor(g + 20)}, 55)`);
  }, [energyLevel]);

  const edgeColor = useMemo(() => {
    const g = 70 + energyLevel * 50;
    return new THREE.Color(`rgb(${Math.floor(70)}, ${Math.floor(g)}, 40)`);
  }, [energyLevel]);

  return (
    <group>
      {/* Main ground disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <circleGeometry args={[2.5, 48]} />
        <meshStandardMaterial color={grassColor} roughness={0.95} />
      </mesh>
      {/* Edge ring for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]}>
        <ringGeometry args={[2.2, 2.7, 48]} />
        <meshStandardMaterial color={edgeColor} roughness={0.95} />
      </mesh>
      {/* Dirt underneath */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.84, 0]}>
        <circleGeometry args={[2.7, 48]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>
    </group>
  );
}

// ============================================================
// Stable positions
// ============================================================
const GRASS_POSITIONS: [number, number, number][] = [
  [-0.9, -0.78, 0.5],
  [0.8, -0.78, 0.3],
  [-0.4, -0.78, -0.7],
  [0.5, -0.78, -0.6],
  [-0.7, -0.78, -0.3],
  [0.2, -0.78, 0.7],
  [-1.1, -0.78, 0.1],
  [1.0, -0.78, -0.2],
  [0.1, -0.78, -0.9],
  [-0.5, -0.78, 0.9],
  [0.7, -0.78, 0.8],
  [-0.2, -0.78, 0.4],
];

const MUSHROOM_POSITIONS: [number, number, number][] = [
  [-0.7, -0.78, 0.6],
  [0.9, -0.78, -0.4],
  [-0.3, -0.78, -0.8],
];

const ROCK_POSITIONS: [number, number, number][] = [
  [1.2, -0.78, 0.4],
  [-1.0, -0.78, -0.5],
  [0.4, -0.78, 0.9],
];

// ============================================================
// Fireflies (evening & night) — small glowing orbs
// ============================================================
function Fireflies({ energyLevel, timeProgress }: { energyLevel: number; timeProgress: number }) {
  const ref = useRef<THREE.Group>(null);

  // Only show during dusk/night (t > 0.72 or t < 0.28)
  const isEvening = timeProgress > 0.72 || timeProgress < 0.28;
  const show = isEvening && energyLevel > 0.3;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      const g = child as THREE.Group;
      // Lazy floating path
      g.position.x = Math.sin(t * 0.3 + i * 2.1) * 1.0 + (i - 2) * 0.3;
      g.position.y = -0.2 + Math.sin(t * 0.5 + i * 1.7) * 0.5 + i * 0.15;
      g.position.z = Math.cos(t * 0.25 + i * 2.8) * 0.8;
      // Pulsing glow
      const pulse = 0.5 + Math.sin(t * 2.5 + i * 1.3) * 0.5;
      g.children.forEach((mesh) => {
        const m = mesh as THREE.Mesh;
        if (m.material && "opacity" in m.material) {
          (m.material as THREE.MeshBasicMaterial).opacity = pulse * 0.8;
        }
      });
    });
  });

  if (!show) return null;

  const count = energyLevel > 0.7 ? 5 : energyLevel > 0.5 ? 3 : 2;

  return (
    <group ref={ref}>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} position={[0, 0, 0]}>
          {/* Outer glow */}
          <mesh>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#e8ff88" transparent opacity={0.4} />
          </mesh>
          {/* Core */}
          <mesh>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshBasicMaterial color="#ffffaa" transparent opacity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================
// Butterflies (daytime only) — small colorful shapes
// ============================================================
function Butterflies({ energyLevel, timeProgress }: { energyLevel: number; timeProgress: number }) {
  const ref = useRef<THREE.Group>(null);

  // Only during daytime
  const isDaytime = timeProgress > 0.28 && timeProgress < 0.72;
  const show = isDaytime && energyLevel > 0.5;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      const g = child as THREE.Group;
      // Figure-8 flight path
      g.position.x = Math.sin(t * 0.4 + i * 2.5) * 0.9;
      g.position.y = 0.3 + Math.sin(t * 0.8 + i * 1.8) * 0.4;
      g.position.z = Math.cos(t * 0.35 + i * 3.0) * 0.7;
      g.rotation.y = Math.atan2(
        Math.cos(t * 0.4 + i * 2.5) * 0.4,
        -Math.sin(t * 0.35 + i * 3.0) * 0.35
      );
      // Wing flap by scaling the wing meshes
      const flapAngle = Math.sin(t * 10 + i * 2) * 0.7;
      if (g.children[0]) (g.children[0] as THREE.Mesh).rotation.y = flapAngle;
      if (g.children[1]) (g.children[1] as THREE.Mesh).rotation.y = -flapAngle;
    });
  });

  if (!show) return null;

  const count = energyLevel > 0.8 ? 3 : energyLevel > 0.6 ? 2 : 1;
  const colors = ["#e88aef", "#8ae8d0", "#f0c888"];

  return (
    <group ref={ref}>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} position={[0, 0.5, 0]}>
          {/* Left wing */}
          <mesh position={[-0.012, 0, 0]} rotation={[0, 0.4, 0]} scale={[1, 1, 1]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshBasicMaterial
              color={colors[i % colors.length]}
              transparent
              opacity={0.75}
            />
          </mesh>
          {/* Right wing */}
          <mesh position={[0.012, 0, 0]} rotation={[0, -0.4, 0]} scale={[1, 1, 1]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshBasicMaterial
              color={colors[i % colors.length]}
              transparent
              opacity={0.75}
            />
          </mesh>
          {/* Body */}
          <mesh scale={[0.3, 1, 0.3]}>
            <sphereGeometry args={[0.008, 4, 4]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================
// Main Garden Content
// ============================================================
function GardenContent({ energyLevel }: { energyLevel: number }) {
  const [timeProgress, setTimeProgress] = useState(getTimeProgress);

  // Update time every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeProgress(getTimeProgress());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const palette = useMemo(() => getSkyPalette(timeProgress), [timeProgress]);

  return (
    <>
      {/* Sky dome */}
      <SkyDome palette={palette} />
      <fog attach="fog" args={[palette.fogColor, 5, 15]} />

      {/* Stars */}
      <Stars opacity={palette.starOpacity} />

      {/* Sun & Moon */}
      <Sun timeProgress={timeProgress} palette={palette} />
      <Moon timeProgress={timeProgress} />

      {/* Clouds */}
      {CLOUD_CONFIGS.map((cfg, i) => (
        <Cloud key={i} position={cfg.position} scale={cfg.scale} speed={cfg.speed} />
      ))}

      {/* Lighting - dynamic with time */}
      <ambientLight
        intensity={palette.ambientIntensity + energyLevel * 0.15}
        color={palette.ambientColor}
      />
      <directionalLight
        position={[
          Math.cos(getSunAngle(timeProgress)) * 4,
          Math.max(Math.sin(getSunAngle(timeProgress)) * 4, 0.5),
          2,
        ]}
        intensity={palette.dirIntensity * (0.6 + energyLevel * 0.4)}
        color={palette.sunColor}
        castShadow={false}
      />
      <hemisphereLight
        args={[palette.skyBottom, "#3d5c3a", 0.2 + energyLevel * 0.2]}
      />

      {/* Ground */}
      <ZeldaGround energyLevel={energyLevel} />

      {/* Main flowers - center stage */}
      <Float
        speed={1}
        rotationIntensity={0.08}
        floatIntensity={0.15 * energyLevel}
      >
        <ZeldaFlower
          position={[0, 0, 0]}
          energyLevel={energyLevel}
          delay={0}
          hueShift={0}
        />
      </Float>
      <Float
        speed={0.8}
        rotationIntensity={0.08}
        floatIntensity={0.12 * energyLevel}
      >
        <ZeldaFlower
          position={[-0.55, -0.1, 0.35]}
          energyLevel={energyLevel * 0.85}
          delay={1}
          hueShift={0.12}
        />
      </Float>
      <Float
        speed={1.2}
        rotationIntensity={0.08}
        floatIntensity={0.12 * energyLevel}
      >
        <ZeldaFlower
          position={[0.45, -0.05, -0.25]}
          energyLevel={energyLevel * 0.9}
          delay={2}
          hueShift={0.25}
        />
      </Float>
      {energyLevel > 0.5 && (
        <Float
          speed={0.9}
          rotationIntensity={0.06}
          floatIntensity={0.1 * energyLevel}
        >
          <ZeldaFlower
            position={[0.3, -0.15, 0.5]}
            energyLevel={energyLevel * 0.75}
            delay={3}
            hueShift={0.4}
          />
        </Float>
      )}
      {energyLevel > 0.75 && (
        <Float
          speed={1.1}
          rotationIntensity={0.06}
          floatIntensity={0.08 * energyLevel}
        >
          <ZeldaFlower
            position={[-0.35, -0.12, -0.5]}
            energyLevel={energyLevel * 0.7}
            delay={4}
            hueShift={0.6}
          />
        </Float>
      )}

      {/* Grass clusters */}
      {GRASS_POSITIONS.map((pos, i) => (
        <ZeldaGrass key={i} position={pos} energyLevel={energyLevel} />
      ))}

      {/* Mushrooms */}
      {MUSHROOM_POSITIONS.map((pos, i) => (
        <Mushroom key={i} position={pos} energyLevel={energyLevel} />
      ))}

      {/* Rocks */}
      {ROCK_POSITIONS.map((pos, i) => (
        <Rock key={i} position={pos} />
      ))}

      {/* Daytime butterflies / Evening fireflies */}
      <Butterflies energyLevel={energyLevel} timeProgress={timeProgress} />
      <Fireflies energyLevel={energyLevel} timeProgress={timeProgress} />
    </>
  );
}

// ============================================================
// Canvas with WebGL context handling
// ============================================================
function GardenCanvas({ energyLevel }: { energyLevel: number }) {
  const [contextLost, setContextLost] = useState(false);

  const onCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    const canvas = state.gl.domElement;

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("WebGL context lost");
      setContextLost(true);
    });

    canvas.addEventListener("webglcontextrestored", () => {
      console.log("WebGL context restored");
      setContextLost(false);
    });
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#e8f3ec] to-[#d4e8da] rounded-2xl">
        <div className="text-center">
          <FontAwesomeIcon icon={faSeedling} className="text-3xl text-[#6b9b7a] mb-2" />
          <p className="text-sm text-[#6b9b7a]">花园休息中...</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0.8, 3], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={onCreated}
    >
      <GardenContent energyLevel={energyLevel} />
    </Canvas>
  );
}

// ============================================================
// Exported component
// ============================================================
const GardenScene = memo(function GardenScene({
  energyLevel,
  reserveRatio,
}: GardenSceneProps) {
  const isLow = energyLevel < reserveRatio;

  return (
    <div className="relative w-full aspect-[4/3] max-h-[400px] rounded-2xl overflow-hidden shadow-lg">
      <GardenCanvas energyLevel={energyLevel} />

      {/* Reserve line indicator */}
      {isLow && (
        <div className="absolute bottom-3 left-3 right-3 bg-[#d9534f]/10 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
          <p className="text-xs text-[#d9534f] font-medium">
            <FontAwesomeIcon icon={faSeedling} className="mr-1" />
            精力低于保留线，花园需要浇水了
          </p>
        </div>
      )}
    </div>
  );
});

export default GardenScene;
