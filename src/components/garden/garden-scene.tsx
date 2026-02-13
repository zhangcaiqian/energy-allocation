"use client";

import { useRef, useMemo, memo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSeedling } from "@fortawesome/free-solid-svg-icons";

interface GardenSceneProps {
  energyLevel: number;
  reserveRatio: number;
}

// ============================================================
// Time helpers
// ============================================================
function getTimeProgress(): number {
  const now = new Date();
  return (now.getHours() * 60 + now.getMinutes()) / 1440;
}

function getSunAngle(t: number): number {
  // 6AM (t=0.25) → 0 (sunrise right), noon (t=0.5) → PI/2 (peak), 6PM (t=0.75) → PI (sunset left)
  return ((t - 0.25) / 0.5) * Math.PI;
}

function getSkyPalette(t: number) {
  if (t < 0.22 || t > 0.88) {
    return { skyTop: "#0b1026", skyBottom: "#1a1a3e", sunColor: "#ffe4b5", ambientColor: "#1a1a40", ambientIntensity: 0.15, dirIntensity: 0.1, fogColor: "#0d1130", isNight: true, starOpacity: 1.0 };
  }
  if (t < 0.30) {
    const f = (t - 0.22) / 0.08;
    return { skyTop: lerpColor("#0b1026", "#ff9a56", f), skyBottom: lerpColor("#1a1a3e", "#ffd4a0", f), sunColor: "#ff8844", ambientColor: lerpColor("#1a1a40", "#ffd4a0", f), ambientIntensity: 0.15 + f * 0.35, dirIntensity: 0.1 + f * 0.6, fogColor: lerpColor("#0d1130", "#ffc89a", f), isNight: false, starOpacity: 1 - f };
  }
  if (t < 0.75) {
    return { skyTop: "#4aa3df", skyBottom: "#87CEEB", sunColor: "#fff5e0", ambientColor: "#b3d9f7", ambientIntensity: 0.55, dirIntensity: 0.9, fogColor: "#c5e5f5", isNight: false, starOpacity: 0 };
  }
  if (t < 0.88) {
    const f = (t - 0.75) / 0.13;
    return { skyTop: lerpColor("#4aa3df", "#0b1026", f), skyBottom: lerpColor("#87CEEB", "#1a1a3e", f), sunColor: lerpColor("#fff5e0", "#ff6633", f), ambientColor: lerpColor("#b3d9f7", "#1a1a40", f), ambientIntensity: 0.55 - f * 0.4, dirIntensity: 0.9 - f * 0.8, fogColor: lerpColor("#c5e5f5", "#0d1130", f), isNight: false, starOpacity: f };
  }
  return { skyTop: "#4aa3df", skyBottom: "#87CEEB", sunColor: "#fff5e0", ambientColor: "#b3d9f7", ambientIntensity: 0.55, dirIntensity: 0.9, fogColor: "#c5e5f5", isNight: false, starOpacity: 0 };
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  ca.lerp(cb, t);
  return "#" + ca.getHexString();
}

// ============================================================
// Sky dome
// ============================================================
function SkyDome({ palette }: { palette: ReturnType<typeof getSkyPalette> }) {
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
      depthWrite: false,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    material.uniforms.topColor.value.set(palette.skyTop);
    material.uniforms.bottomColor.value.set(palette.skyBottom);
  });

  return (
    <mesh material={material} renderOrder={-100}>
      <sphereGeometry args={[15, 32, 16]} />
    </mesh>
  );
}

// ============================================================
// Sun with rays
// ============================================================
// ============================================================
// Sun — arcs from left (East) to right (West)
// Camera: [0, 0.8, 3], fov=40
// Uses direct THREE materials with fog/depth explicitly disabled
// ============================================================
const SUN_RAY_COUNT = 12;
function Sun({ timeProgress, palette }: { timeProgress: number; palette: ReturnType<typeof getSkyPalette> }) {
  const groupRef = useRef<THREE.Group>(null);
  const angle = getSunAngle(timeProgress);

  // East=left=negative X, West=right=positive X
  const sunX = -Math.cos(angle) * 2.5;
  const sunY = Math.sin(angle) * 2.0;

  // Create materials with fog OFF and depthTest OFF so sun is ALWAYS visible
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.sunColor),
    fog: false,
    depthTest: false,
    depthWrite: false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const glowMat1 = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.sunColor),
    transparent: true,
    opacity: 0.15,
    fog: false,
    depthTest: false,
    depthWrite: false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const glowMat2 = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.sunColor),
    transparent: true,
    opacity: 0.3,
    fog: false,
    depthTest: false,
    depthWrite: false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const rayMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.sunColor),
    transparent: true,
    opacity: 0.35,
    fog: false,
    depthTest: false,
    depthWrite: false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update colors when palette changes
  useFrame((state) => {
    const c = new THREE.Color(palette.sunColor);
    coreMat.color.copy(c);
    glowMat1.color.copy(c);
    glowMat2.color.copy(c);
    rayMat.color.copy(c);
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.08;
    }
  });

  // Hide when below horizon
  if (sunY < -0.2) return null;

  return (
    <group position={[sunX, sunY, -2]} renderOrder={999}>
      {/* Outer glow */}
      <mesh material={glowMat1}>
        <sphereGeometry args={[0.6, 16, 16]} />
      </mesh>
      {/* Mid glow */}
      <mesh material={glowMat2}>
        <sphereGeometry args={[0.38, 16, 16]} />
      </mesh>
      {/* Core — solid bright disc */}
      <mesh material={coreMat}>
        <sphereGeometry args={[0.2, 16, 16]} />
      </mesh>
      {/* Rays — rotating spikes */}
      <group ref={groupRef}>
        {Array.from({ length: SUN_RAY_COUNT }).map((_, i) => {
          const a = (i / SUN_RAY_COUNT) * Math.PI * 2;
          const len = i % 2 === 0 ? 0.5 : 0.32;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0]}
              rotation={[0, 0, a]}
              scale={[0.025, len, 0.025]}
              material={rayMat}
            >
              <boxGeometry args={[1, 1, 1]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ============================================================
// Moon with crescent and glow
// ============================================================
// ============================================================
// Moon — same East→West arc as sun, visible 6PM → 6AM
// Uses direct THREE materials with fog/depth explicitly disabled
// ============================================================
function Moon({ timeProgress }: { timeProgress: number }) {
  // Show moon from 6PM (0.75) to 6AM (0.25)
  const showMoon = timeProgress > 0.72 || timeProgress < 0.28;

  // Normalise moon progress: 0=moonrise(6PM/East), 0.5=midnight(peak), 1=moonset(6AM/West)
  let moonProgress = 0;
  if (timeProgress >= 0.72) {
    moonProgress = (timeProgress - 0.75) / 0.5;
    if (moonProgress < 0) moonProgress = 0;
  } else if (timeProgress < 0.28) {
    moonProgress = (timeProgress + 0.25) / 0.5;
  }
  moonProgress = Math.max(0, Math.min(1, moonProgress));

  const moonAngle = moonProgress * Math.PI;
  const moonX = -Math.cos(moonAngle) * 2.5; // East(left) → West(right)
  const moonY = Math.sin(moonAngle) * 2.0;

  let opacity = 1.0;
  if (moonY < 0.5) opacity = Math.max(0, moonY / 0.5);

  const bgColor = timeProgress > 0.88 || timeProgress < 0.22 ? "#0b1026" : "#1a1a3e";

  // Create materials imperatively with fog/depth properly disabled
  const moonDiscMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#f5f0d8",
    transparent: true,
    fog: false,
    depthTest: false,
    depthWrite: false,
  }), []);

  const haloMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#fffde8",
    transparent: true,
    fog: false,
    depthTest: false,
    depthWrite: false,
  }), []);

  const crescentMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: bgColor,
    transparent: true,
    fog: false,
    depthTest: false,
    depthWrite: false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    moonDiscMat.opacity = opacity;
    haloMat.opacity = 0.12 * opacity;
    crescentMat.opacity = 0.88 * opacity;
    crescentMat.color.set(bgColor);
  });

  if (!showMoon) return null;

  return (
    <group position={[moonX, moonY, -2]} renderOrder={998}>
      {/* Outer halo */}
      <mesh material={haloMat}>
        <sphereGeometry args={[0.55, 16, 16]} />
      </mesh>
      {/* Moon disc */}
      <mesh material={moonDiscMat}>
        <sphereGeometry args={[0.22, 20, 20]} />
      </mesh>
      {/* Crescent cutout */}
      <mesh position={[0.08, 0.04, 0.12]} material={crescentMat}>
        <sphereGeometry args={[0.18, 20, 20]} />
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
  // Create star materials imperatively — fog=false, depthTest=false
  const starMats = useMemo(() => STAR_POSITIONS.map(() =>
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, fog: false, depthTest: false, depthWrite: false })
  ), []);
  useFrame((state) => {
    starMats.forEach((mat, i) => {
      mat.opacity = opacity * (0.5 + Math.sin(state.clock.elapsedTime * 1.5 + i) * 0.5);
    });
  });
  if (opacity < 0.01) return null;
  return (
    <group ref={ref} renderOrder={997}>
      {STAR_POSITIONS.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} material={starMats[i]}>
          <sphereGeometry args={[s.size, 4, 4]} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================
// Cloud
// ============================================================
function Cloud({ position, scale = 1, speed = 0.15 }: { position: [number, number, number]; scale?: number; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  const initialX = useRef(position[0]);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.x = initialX.current + Math.sin(state.clock.elapsedTime * speed) * 0.5 + state.clock.elapsedTime * speed * 0.1;
      if (ref.current.position.x > 8) { ref.current.position.x = -8; initialX.current = -8; }
    }
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh><sphereGeometry args={[0.5, 12, 8]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} /></mesh>
      <mesh position={[0.4, 0.05, 0.1]}><sphereGeometry args={[0.4, 12, 8]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} /></mesh>
      <mesh position={[-0.35, 0.08, -0.05]}><sphereGeometry args={[0.35, 12, 8]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} /></mesh>
      <mesh position={[0.15, 0.2, 0]}><sphereGeometry args={[0.3, 12, 8]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} /></mesh>
      <mesh position={[-0.1, -0.1, 0.15]}><sphereGeometry args={[0.38, 12, 8]} /><meshStandardMaterial color="#f8f8ff" roughness={1} transparent opacity={0.8} /></mesh>
    </group>
  );
}
const CLOUD_CONFIGS = [
  { position: [-3, 3.5, -4] as [number, number, number], scale: 1.2, speed: 0.12 },
  { position: [2, 4, -5] as [number, number, number], scale: 0.9, speed: 0.18 },
  { position: [-1, 3, -3.5] as [number, number, number], scale: 0.7, speed: 0.15 },
  { position: [4, 3.8, -4.5] as [number, number, number], scale: 1.0, speed: 0.1 },
  { position: [-5, 4.2, -5.5] as [number, number, number], scale: 0.8, speed: 0.14 },
];

// ============================================================
// Curved stem helper — returns { geometry, tipOffset }
// tipOffset = where the top of the stem actually ends up
// ============================================================
function useCurvedStem(height: number, curvature: number, direction: number) {
  return useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = Math.sin(t * Math.PI * 0.5) * curvature * Math.cos(direction);
      const y = t * height - height * 0.5;
      const z = Math.sin(t * Math.PI * 0.5) * curvature * Math.sin(direction);
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 12, 0.018, 6, false);
    // Tip offset = final point of the curve
    const tip = points[points.length - 1];
    return { geometry, tipX: tip.x, tipY: tip.y, tipZ: tip.z };
  }, [height, curvature, direction]);
}

// ============================================================
// Natural flower with curved stem + facing direction
// ============================================================
function NaturalFlower({
  position,
  energyLevel,
  delay = 0,
  hueShift = 0,
  facingAngle = 0,
  stemCurve = 0.12,
  stemHeight = 0.85,
}: {
  position: [number, number, number];
  energyLevel: number;
  delay?: number;
  hueShift?: number;
  facingAngle?: number;
  stemCurve?: number;
  stemHeight?: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const petalCount = 5;
  const scale = 0.4 + energyLevel * 0.6;

  const { geometry: stemGeometry, tipX, tipY, tipZ } = useCurvedStem(stemHeight, stemCurve, facingAngle);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime + delay;
      meshRef.current.rotation.z = Math.sin(t * 0.5) * 0.06 * energyLevel;
      meshRef.current.position.y = position[1] + Math.sin(t * 0.35) * 0.02 * energyLevel;
    }
  });

  const petalColor = useMemo(() => {
    const hue = (0.85 + hueShift) % 1.0;
    return new THREE.Color().setHSL(hue, 0.5 + energyLevel * 0.4, 0.55 + energyLevel * 0.15);
  }, [energyLevel, hueShift]);

  const centerColor = useMemo(
    () => new THREE.Color().setHSL(0.13, 0.9, 0.55 + energyLevel * 0.15),
    [energyLevel]
  );

  const stemColor = useMemo(() => `hsl(115, ${Math.round(40 + energyLevel * 30)}%, 32%)`, [energyLevel]);
  const leafColor = useMemo(() => `hsl(118, ${Math.round(45 + energyLevel * 30)}%, 38%)`, [energyLevel]);

  // Flower head tilts in the curve direction
  const headTiltX = Math.sin(facingAngle) * 0.3;
  const headTiltZ = -Math.cos(facingAngle) * 0.3;

  // Leaf positions along the stem (roughly at 40% and 60% height)
  const leafY1 = stemHeight * 0.4 - stemHeight * 0.5; // 40% up from bottom
  const leafY2 = stemHeight * 0.25 - stemHeight * 0.5; // 25% up from bottom
  const leafCurve1 = Math.sin(0.4 * Math.PI * 0.5) * stemCurve;
  const leafCurve2 = Math.sin(0.25 * Math.PI * 0.5) * stemCurve;

  return (
    <group ref={meshRef} position={position} scale={scale}>
      {/* Curved stem */}
      <mesh geometry={stemGeometry}>
        <meshStandardMaterial color={stemColor} roughness={0.8} />
      </mesh>

      {/* Leaves along stem — positioned to follow the curve */}
      <mesh
        position={[
          leafCurve1 * Math.cos(facingAngle) + Math.cos(facingAngle + 1.2) * 0.04,
          leafY1,
          leafCurve1 * Math.sin(facingAngle) + Math.sin(facingAngle + 1.2) * 0.04,
        ]}
        rotation={[0.2, facingAngle + 0.5, -0.5]}
        scale={[1.4, 0.45, 0.7]}
      >
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} />
      </mesh>
      <mesh
        position={[
          leafCurve2 * Math.cos(facingAngle) - Math.cos(facingAngle - 0.8) * 0.04,
          leafY2,
          leafCurve2 * Math.sin(facingAngle) - Math.sin(facingAngle - 0.8) * 0.04,
        ]}
        rotation={[0.1, facingAngle - 0.8, 0.4]}
        scale={[1.2, 0.4, 0.6]}
      >
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} />
      </mesh>

      {/* Flower head — positioned at the actual stem tip */}
      <group
        position={[tipX, tipY, tipZ]}
        rotation={[headTiltX, facingAngle * 0.3, headTiltZ]}
      >
        {/* Petals */}
        {Array.from({ length: petalCount }).map((_, i) => {
          const a = (i / petalCount) * Math.PI * 2;
          const openness = 0.08 + energyLevel * 0.12;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(a) * openness,
                Math.sin(a) * 0.01,
                Math.sin(a) * openness,
              ]}
              rotation={[
                Math.sin(a) * (0.5 - energyLevel * 0.3),
                a,
                0,
              ]}
              scale={[1, 0.65, 1.4]}
            >
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshStandardMaterial color={petalColor} roughness={0.6} metalness={0} />
            </mesh>
          );
        })}
        {/* Center */}
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color={centerColor} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================
// Grass cluster (wind-responsive)
// ============================================================
function ZeldaGrass({ position, energyLevel }: { position: [number, number, number]; energyLevel: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8 + position[0] * 2) * 0.06;
    }
  });
  const g = 30 + energyLevel * 30;
  const grassColor = useMemo(() => `hsl(115, 52%, ${Math.round(g)}%)`, [g]);
  const grassColorLight = useMemo(() => `hsl(118, 55%, ${Math.round(g + 8)}%)`, [g]);
  const heights = useMemo(() => [0.14, 0.18, 0.22, 0.16, 0.13, 0.19].map((h) => h * (0.5 + energyLevel * 0.5)), [energyLevel]);
  return (
    <group ref={ref} position={position}>
      {heights.map((h, i) => {
        const a = ((i - 2.5) / 6) * 0.8;
        return (
          <mesh key={i} position={[a * 0.06, h / 2, (i % 3) * 0.01]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.012, h, 0.005]} />
            <meshStandardMaterial color={i % 2 === 0 ? grassColorLight : grassColor} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================
// Mushroom
// ============================================================
function Mushroom({ position, energyLevel }: { position: [number, number, number]; energyLevel: number }) {
  const capColor = useMemo(() => `hsl(0, ${Math.round(50 + energyLevel * 40)}%, 55%)`, [energyLevel]);
  const s = 0.3 + energyLevel * 0.4;
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.03, 0.04, 0.08, 8]} /><meshStandardMaterial color="#f5ede3" roughness={0.8} /></mesh>
      <mesh position={[0, 0.1, 0]}><sphereGeometry args={[0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={capColor} roughness={0.6} /></mesh>
      <mesh position={[0.02, 0.13, 0.03]} scale={0.4}><sphereGeometry args={[0.02, 6, 6]} /><meshStandardMaterial color="#fff5ee" roughness={0.5} /></mesh>
      <mesh position={[-0.03, 0.12, -0.01]} scale={0.3}><sphereGeometry args={[0.02, 6, 6]} /><meshStandardMaterial color="#fff5ee" roughness={0.5} /></mesh>
    </group>
  );
}

// ============================================================
// Rock
// ============================================================
function Rock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} scale={[1.2, 0.7, 1]}><dodecahedronGeometry args={[0.06, 0]} /><meshStandardMaterial color="#8a8a7a" roughness={0.9} /></mesh>
      <mesh position={[0.05, 0.02, 0.03]} scale={[0.8, 0.6, 0.9]}><dodecahedronGeometry args={[0.04, 0]} /><meshStandardMaterial color="#7a7a6e" roughness={0.95} /></mesh>
    </group>
  );
}

// ============================================================
// Ground
// ============================================================
function ZeldaGround({ energyLevel }: { energyLevel: number }) {
  const grassColor = useMemo(() => {
    const g = 90 + energyLevel * 70;
    return new THREE.Color(`rgb(${Math.floor(80 + energyLevel * 30)}, ${Math.floor(g + 20)}, 55)`);
  }, [energyLevel]);
  const edgeColor = useMemo(() => new THREE.Color(`rgb(70, ${Math.floor(70 + energyLevel * 50)}, 40)`), [energyLevel]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}><circleGeometry args={[2.5, 48]} /><meshStandardMaterial color={grassColor} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]}><ringGeometry args={[2.2, 2.7, 48]} /><meshStandardMaterial color={edgeColor} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.84, 0]}><circleGeometry args={[2.7, 48]} /><meshStandardMaterial color="#8B7355" roughness={1} /></mesh>
    </group>
  );
}

// ============================================================
// Static positions
// ============================================================
const GRASS_POSITIONS: [number, number, number][] = [
  [-0.9, -0.78, 0.5], [0.8, -0.78, 0.3], [-0.4, -0.78, -0.7], [0.5, -0.78, -0.6],
  [-0.7, -0.78, -0.3], [0.2, -0.78, 0.7], [-1.1, -0.78, 0.1], [1.0, -0.78, -0.2],
  [0.1, -0.78, -0.9], [-0.5, -0.78, 0.9], [0.7, -0.78, 0.8], [-0.2, -0.78, 0.4],
];
const MUSHROOM_POSITIONS: [number, number, number][] = [[-0.7, -0.78, 0.6], [0.9, -0.78, -0.4], [-0.3, -0.78, -0.8]];
const ROCK_POSITIONS: [number, number, number][] = [[1.2, -0.78, 0.4], [-1.0, -0.78, -0.5], [0.4, -0.78, 0.9]];

// ============================================================
// Fireflies — with glow trail
// ============================================================
function Fireflies({ energyLevel, timeProgress }: { energyLevel: number; timeProgress: number }) {
  const ref = useRef<THREE.Group>(null);
  const isEvening = timeProgress > 0.72 || timeProgress < 0.28;
  const show = isEvening && energyLevel > 0.3;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      const g = child as THREE.Group;
      g.position.x = Math.sin(t * 0.3 + i * 2.1) * 1.0 + (i - 2) * 0.3;
      g.position.y = -0.2 + Math.sin(t * 0.5 + i * 1.7) * 0.5 + i * 0.15;
      g.position.z = Math.cos(t * 0.25 + i * 2.8) * 0.8;
      const pulse = 0.4 + Math.sin(t * 2.5 + i * 1.3) * 0.6;
      // Update opacity for all mesh children (core, glow layers, trail)
      g.children.forEach((mesh, mi) => {
        const m = mesh as THREE.Mesh;
        if (m.material && "opacity" in m.material) {
          const mat = m.material as THREE.MeshBasicMaterial;
          if (mi === 0) mat.opacity = pulse * 0.9; // core
          else if (mi === 1) mat.opacity = pulse * 0.4; // inner glow
          else if (mi === 2) mat.opacity = pulse * 0.15; // outer glow
          else mat.opacity = pulse * 0.08; // trail
        }
      });
    });
  });

  if (!show) return null;
  const count = energyLevel > 0.7 ? 5 : energyLevel > 0.5 ? 3 : 2;

  return (
    <group ref={ref}>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i}>
          {/* Core bright point */}
          <mesh>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshBasicMaterial color="#ffffcc" transparent opacity={0.9} />
          </mesh>
          {/* Inner glow */}
          <mesh>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#e8ff88" transparent opacity={0.4} />
          </mesh>
          {/* Outer glow */}
          <mesh>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#ccff66" transparent opacity={0.15} />
          </mesh>
          {/* Trail — stretched ellipsoid behind */}
          <mesh position={[0, -0.02, -0.03]} scale={[0.6, 0.6, 2]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color="#eeff99" transparent opacity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================
// Butterflies — realistic wing shape with flapping
// ============================================================
function Butterflies({ energyLevel, timeProgress }: { energyLevel: number; timeProgress: number }) {
  const ref = useRef<THREE.Group>(null);
  const isDaytime = timeProgress > 0.28 && timeProgress < 0.72;
  const show = isDaytime && energyLevel > 0.5;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      const g = child as THREE.Group;
      // Figure-8 path
      g.position.x = Math.sin(t * 0.4 + i * 2.5) * 0.9;
      g.position.y = 0.3 + Math.sin(t * 0.8 + i * 1.8) * 0.4;
      g.position.z = Math.cos(t * 0.35 + i * 3.0) * 0.7;
      // Face movement direction
      g.rotation.y = Math.atan2(
        Math.cos(t * 0.4 + i * 2.5) * 0.4,
        -Math.sin(t * 0.35 + i * 3.0) * 0.35
      );
      // Wing flap — rotate wing groups (children[0]=left pair, [1]=right pair, [2]=body)
      const flapAngle = Math.sin(t * 10 + i * 2) * 1.0;
      const leftWing = g.children[0] as THREE.Group;
      const rightWing = g.children[1] as THREE.Group;
      if (leftWing) leftWing.rotation.z = flapAngle;
      if (rightWing) rightWing.rotation.z = -flapAngle;
    });
  });

  if (!show) return null;
  const count = energyLevel > 0.8 ? 3 : energyLevel > 0.6 ? 2 : 1;
  const colors = ["#e88aef", "#8ae8d0", "#f0c888"];

  return (
    <group ref={ref}>
      {Array.from({ length: count }).map((_, i) => {
        const c = colors[i % colors.length];
        return (
          <group key={i}>
            {/* Left wing pair (upper + lower) */}
            <group position={[-0.002, 0, 0]}>
              {/* Upper wing — large flat ellipsoid */}
              <mesh position={[-0.02, 0.005, 0]} scale={[0.035, 0.006, 0.025]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color={c} transparent opacity={0.7} side={THREE.DoubleSide} />
              </mesh>
              {/* Lower wing — smaller */}
              <mesh position={[-0.015, -0.005, 0]} scale={[0.022, 0.005, 0.018]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color={c} transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            </group>
            {/* Right wing pair */}
            <group position={[0.002, 0, 0]}>
              <mesh position={[0.02, 0.005, 0]} scale={[0.035, 0.006, 0.025]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color={c} transparent opacity={0.7} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0.015, -0.005, 0]} scale={[0.022, 0.005, 0.018]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color={c} transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            </group>
            {/* Body — elongated dark ellipsoid */}
            <mesh scale={[0.003, 0.012, 0.003]}>
              <sphereGeometry args={[1, 6, 6]} />
              <meshBasicMaterial color="#2a2a2a" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================
// Flower configs
// facingAngle: 0=right, PI/2=toward camera, PI=left, -PI/2=away
// stemHeight: varying for visual rhythm
// ============================================================
const FLOWER_CONFIGS: {
  pos: [number, number, number]; energy: number; delay: number; hue: number;
  facing: number; curve: number; speed: number; height: number; minEnergy?: number;
}[] = [
  // Center flower — tall, slight lean toward viewer
  { pos: [0, 0, 0], energy: 1.0, delay: 0, hue: 0, facing: 1.3, curve: 0.08, speed: 1, height: 0.95 },
  // Left-back — medium, leans right
  { pos: [-0.55, -0.1, 0.35], energy: 0.85, delay: 1, hue: 0.12, facing: -0.6, curve: 0.15, speed: 0.8, height: 0.75 },
  // Right-front — short, faces toward user
  { pos: [0.45, -0.05, -0.25], energy: 0.9, delay: 2, hue: 0.25, facing: 1.8, curve: 0.12, speed: 1.2, height: 0.65 },
  // Right-back — medium-tall, leans left-forward toward user
  { pos: [0.3, -0.15, 0.5], energy: 0.75, delay: 3, hue: 0.4, facing: 2.4, curve: 0.18, speed: 0.9, height: 0.82, minEnergy: 0.5 },
  // Left-front — short, faces toward user
  { pos: [-0.35, -0.12, -0.5], energy: 0.7, delay: 4, hue: 0.6, facing: 1.0, curve: 0.1, speed: 1.1, height: 0.58, minEnergy: 0.75 },
];

// ============================================================
// Main content
// ============================================================
function GardenContent({ energyLevel }: { energyLevel: number }) {
  const [timeProgress, setTimeProgress] = useState(getTimeProgress);

  useEffect(() => {
    const interval = setInterval(() => setTimeProgress(getTimeProgress()), 60000);
    return () => clearInterval(interval);
  }, []);

  const palette = useMemo(() => getSkyPalette(timeProgress), [timeProgress]);

  return (
    <>
      <SkyDome palette={palette} />
      <fog attach="fog" args={[palette.fogColor, 5, 15]} />

      <Stars opacity={palette.starOpacity} />
      <Sun timeProgress={timeProgress} palette={palette} />
      <Moon timeProgress={timeProgress} />

      {CLOUD_CONFIGS.map((cfg, i) => (
        <Cloud key={i} position={cfg.position} scale={cfg.scale} speed={cfg.speed} />
      ))}

      <ambientLight intensity={palette.ambientIntensity + energyLevel * 0.15} color={palette.ambientColor} />
      <directionalLight
        position={[
          -Math.cos(getSunAngle(timeProgress)) * 3,
          Math.max(Math.sin(getSunAngle(timeProgress)) * 2.5, 0.5),
          2
        ]}
        intensity={palette.dirIntensity * (0.6 + energyLevel * 0.4)}
        color={palette.sunColor}
        castShadow={false}
      />
      <hemisphereLight args={[palette.skyBottom, "#3d5c3a", 0.2 + energyLevel * 0.2]} />

      <ZeldaGround energyLevel={energyLevel} />

      {/* Flowers — each with unique facing, curvature, and height */}
      {FLOWER_CONFIGS.map((cfg, i) => {
        if (cfg.minEnergy && energyLevel < cfg.minEnergy) return null;
        return (
          <Float key={i} speed={cfg.speed} rotationIntensity={0.06} floatIntensity={0.12 * energyLevel}>
            <NaturalFlower
              position={cfg.pos}
              energyLevel={energyLevel * cfg.energy}
              delay={cfg.delay}
              hueShift={cfg.hue}
              facingAngle={cfg.facing}
              stemCurve={cfg.curve}
              stemHeight={cfg.height}
            />
          </Float>
        );
      })}

      {GRASS_POSITIONS.map((pos, i) => <ZeldaGrass key={i} position={pos} energyLevel={energyLevel} />)}
      {MUSHROOM_POSITIONS.map((pos, i) => <Mushroom key={i} position={pos} energyLevel={energyLevel} />)}
      {ROCK_POSITIONS.map((pos, i) => <Rock key={i} position={pos} />)}

      <Butterflies energyLevel={energyLevel} timeProgress={timeProgress} />
      <Fireflies energyLevel={energyLevel} timeProgress={timeProgress} />
    </>
  );
}

// ============================================================
// Canvas wrapper
// ============================================================
function GardenCanvas({ energyLevel }: { energyLevel: number }) {
  const [contextLost, setContextLost] = useState(false);
  const onCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    const canvas = state.gl.domElement;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); setContextLost(true); });
    canvas.addEventListener("webglcontextrestored", () => { setContextLost(false); });
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
      gl={{ antialias: true, alpha: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: false }}
      onCreated={onCreated}
    >
      <GardenContent energyLevel={energyLevel} />
    </Canvas>
  );
}

// ============================================================
// Exported
// ============================================================
const GardenScene = memo(function GardenScene({ energyLevel, reserveRatio }: GardenSceneProps) {
  const isLow = energyLevel < reserveRatio;
  return (
    <div className="relative w-full aspect-[4/3] max-h-[400px] rounded-2xl overflow-hidden shadow-lg">
      <GardenCanvas energyLevel={energyLevel} />
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
