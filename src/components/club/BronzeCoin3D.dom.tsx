'use dom';

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type PerspectiveCamera,
  type ShaderMaterial,
} from 'three';

type MedalTier = 'bronce' | 'plata' | 'oro' | 'diamante';

const TIER_LABEL: Record<MedalTier, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

const TIER_STYLE: Record<
  MedalTier,
  {
    textureUrl: string;
    sideColor: string;
    warmLight: string;
    rimLight: string;
    repeat: [number, number];
    offset: [number, number];
  }
> = {
  bronce: {
    textureUrl: require('../../../assets/bronzev2.webp') as string,
    sideColor: '#B8642B',
    warmLight: '#FFE1B4',
    rimLight: '#D06D2E',
    repeat: [0.9434, 0.9434],
    offset: [0.0283, 0.0439],
  },
  plata: {
    textureUrl: require('../../../assets/plata_v2.webp') as string,
    sideColor: '#8E99AA',
    warmLight: '#FFFFFF',
    rimLight: '#AFC6E8',
    repeat: [0.9474, 0.9474],
    offset: [0.0263, 0.0415],
  },
  oro: {
    textureUrl: require('../../../assets/orov2.webp') as string,
    sideColor: '#D69608',
    warmLight: '#FFF0AD',
    rimLight: '#FFB21A',
    repeat: [0.9817, 0.9817],
    offset: [0.008, 0.0183],
  },
  diamante: {
    textureUrl: require('../../../assets/diamantev2.webp') as string,
    sideColor: '#315DB8',
    warmLight: '#E9F4FF',
    rimLight: '#3D8DFF',
    repeat: [1, 1],
    offset: [0, 0],
  },
};

interface TierCoin3DProps {
  tier: MedalTier;
  viewportScale?: number;
  /**
   * Fires once the scene has actually drawn a frame with its texture in place.
   *
   * Not `onCreated` — that resolves when the WebGL context exists, which is
   * several steps before there is anything to look at: the coin's face is a
   * texture loaded through a suspending loader, so a context can be live while
   * the medal is still blank. The host uses this to cross-fade off the flat
   * artwork, and fading to an empty canvas would be worse than not fading.
   */
  onReady?: () => void;
  dom?: import('expo/dom').DOMProps;
}

interface CoinMotion {
  targetRotation: number;
  angularVelocity: number;
  dragging: boolean;
}

export default function TierCoin3D({
  tier,
  viewportScale = 1,
  onReady,
}: TierCoin3DProps) {
  const tierStyle = TIER_STYLE[tier];
  const interactionPercent = 100 / viewportScale;
  const motion = useRef<CoinMotion>({
    targetRotation: 0.22,
    angularVelocity: 0,
    dragging: false,
  });
  const drag = useRef({ startX: 0, startRotation: 0, lastX: 0, lastTime: 0 });

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    motion.current.dragging = true;
    motion.current.angularVelocity = 0;
    drag.current = {
      startX: event.clientX,
      startRotation: motion.current.targetRotation,
      lastX: event.clientX,
      lastTime: event.timeStamp,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!motion.current.dragging) return;

    const elapsed = Math.max(8, event.timeStamp - drag.current.lastTime);
    motion.current.targetRotation =
      drag.current.startRotation + (event.clientX - drag.current.startX) * 0.022;
    motion.current.angularVelocity = clamp(
      ((event.clientX - drag.current.lastX) / elapsed) * 22,
      -9,
      9,
    );
    drag.current.lastX = event.clientX;
    drag.current.lastTime = event.timeStamp;
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    motion.current.dragging = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <style>{`html, body, #root { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }`}</style>
      <div
        aria-label={`Medalla de ${TIER_LABEL[tier]} tridimensional. Arrastra para girarla.`}
        role="slider"
        tabIndex={0}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          position: 'absolute',
          zIndex: 1,
          left: `${(100 - interactionPercent) / 2}%`,
          top: `${(100 - interactionPercent) / 2}%`,
          width: `${interactionPercent}%`,
          height: `${interactionPercent}%`,
          pointerEvents: 'auto',
          touchAction: 'none',
          borderRadius: '50%',
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 5.8 * viewportScale], fov: 34 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: 'transparent',
        }}
      >
        <ViewportCamera scale={viewportScale} />
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[-4, 5, 6]}
          intensity={4.5}
          color={tierStyle.warmLight}
        />
        <directionalLight
          position={[4, -2, 3]}
          intensity={2.3}
          color={tierStyle.rimLight}
        />
        <pointLight position={[0, 1, -4]} intensity={8} color={tierStyle.sideColor} />
        <TierEffects tier={tier} />
        <TierCylinder motion={motion} tierStyle={tierStyle} onReady={onReady} />
      </Canvas>
    </div>
  );
}

/**
 * Reports the first frame drawn after the scene's contents are present.
 *
 * Mounted as a CHILD of the suspending subtree, so React has already resolved
 * the texture by the time this renders at all. One `useFrame` then lets the
 * renderer actually put that frame on the canvas before the signal goes out —
 * without it the host would fade to a canvas that is technically ready and
 * visibly empty.
 */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const sent = useRef(false);

  useFrame(() => {
    if (sent.current) return;
    sent.current = true;
    onReady?.();
  });

  return null;
}

function ViewportCamera({ scale }: { scale: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;

  useLayoutEffect(() => {
    camera.position.set(0, 0, 5.8 * scale);
    camera.fov = 34;
    camera.updateProjectionMatrix();
  }, [camera, scale]);

  return null;
}

function TierCylinder({
  motion,
  tierStyle,
  onReady,
}: {
  motion: RefObject<CoinMotion>;
  tierStyle: (typeof TIER_STYLE)[MedalTier];
  onReady?: () => void;
}) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current || !motion.current) return;

    if (!motion.current.dragging) {
      motion.current.targetRotation += motion.current.angularVelocity * delta;
      motion.current.angularVelocity *= Math.exp(-3.5 * delta);

      if (Math.abs(motion.current.angularVelocity) < 0.025) {
        motion.current.targetRotation += delta * 0.28;
      }
    }

    const follow = 1 - Math.exp(-20 * delta);
    group.current.rotation.y +=
      (motion.current.targetRotation - group.current.rotation.y) * follow;
  });

  return (
    <group ref={group} rotation={[0.08, 0.22, -0.05]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.48, 1.48, 0.34, 96, 3, false]} />
        <meshPhysicalMaterial
          color={tierStyle.sideColor}
          metalness={0.84}
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <TexturedCap z={0.176} tierStyle={tierStyle} />
      <TexturedCap z={-0.176} tierStyle={tierStyle} back />

      {/*
        Last, and inside the group, so it is a sibling of the caps: while their
        texture is still loading this whole subtree is suspended, and the signal
        cannot fire early.
      */}
      <ReadySignal onReady={onReady} />
    </group>
  );
}

function TexturedCap({
  z,
  tierStyle,
  back = false,
}: {
  z: number;
  tierStyle: (typeof TIER_STYLE)[MedalTier];
  back?: boolean;
}) {
  const texture = useLoader(TextureLoader, tierStyle.textureUrl);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  // Each export has slightly different transparent padding. Crop it in UV
  // space so every visible rim meets the same physical cylinder radius.
  texture.repeat.set(...tierStyle.repeat);
  texture.offset.set(...tierStyle.offset);
  texture.needsUpdate = true;

  return (
    <mesh position={[0, 0, z]} rotation={[0, back ? Math.PI : 0, 0]}>
      <circleGeometry args={[1.485, 96]} />
      <meshPhysicalMaterial
        map={texture}
        transparent
        alphaTest={0.02}
        metalness={0.32}
        roughness={0.3}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

interface SparkleConfig {
  angle: number;
  color: string;
  phase: number;
  radius: number;
  scale: number;
  speed: number;
  stretch: number;
  z: number;
}

function TierEffects({ tier }: { tier: MedalTier }) {
  if (tier === 'bronce' || tier === 'plata') return null;

  return (
    <>
      {tier === 'diamante' && <DiamondGlow />}
      <SparkleField tier={tier} />
    </>
  );
}

function SparkleField({ tier }: { tier: 'oro' | 'diamante' }) {
  const group = useRef<Group>(null);
  const isDiamond = tier === 'diamante';
  const sparkles = useMemo<SparkleConfig[]>(() => {
    const count = isDiamond ? 18 : 10;
    const palette = isDiamond
      ? ['#FFFFFF', '#DDF5FF', '#74BFFF', '#BFCFFF']
      : ['#FFF8C7', '#FFD45C', '#FFB31A'];

    return Array.from({ length: count }, (_, index) => {
      // Deterministic variation keeps Fast Refresh and recordings visually stable.
      const seeded = Math.abs(Math.sin((index + 1) * 91.733));
      const spread = Math.abs(Math.sin((index + 1) * 37.117));

      return {
        angle: (index / count) * Math.PI * 2 + seeded * 0.35,
        color: palette[index % palette.length],
        phase: seeded * Math.PI * 2,
        radius:
          ((isDiamond ? 1.68 : 1.72) + spread * (isDiamond ? 0.48 : 0.34)) * 1.2,
        scale: (isDiamond ? 0.085 : 0.075) + seeded * (isDiamond ? 0.07 : 0.05),
        speed: (index % 2 === 0 ? 1 : -1) * (0.055 + spread * 0.045),
        stretch: isDiamond && index % 4 === 0 ? 2.5 : 1.65,
        z: -0.15 + seeded * 0.75,
      };
    });
  }, [isDiamond]);

  useFrame(({ clock }) => {
    if (!group.current) return;

    const elapsed = clock.getElapsedTime();
    group.current.children.forEach((child, index) => {
      const sparkle = sparkles[index];
      const angle = sparkle.angle + elapsed * sparkle.speed;
      const pulse = Math.max(0.12, 0.58 + Math.sin(elapsed * 2.4 + sparkle.phase) * 0.48);

      child.position.set(
        Math.cos(angle) * sparkle.radius,
        Math.sin(angle) * sparkle.radius * 0.78,
        sparkle.z,
      );
      child.rotation.z = -angle + elapsed * 0.18;
      child.scale.setScalar(pulse * sparkle.scale);
    });
  });

  return (
    <group ref={group}>
      {sparkles.map((sparkle, index) => (
        <group key={`${tier}-${index}`}>
          <mesh scale={[0.42, sparkle.stretch, 0.42]}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={sparkle.color}
              transparent
              opacity={0.94}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh scale={[sparkle.stretch * 0.78, 0.35, 0.35]}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={sparkle.color}
              transparent
              opacity={0.72}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DiamondGlow() {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color('#3D8DFF') },
      uOpacity: { value: 0.22 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.uniforms.uOpacity.value =
      0.2 + Math.sin(clock.getElapsedTime() * 1.35) * 0.035;
  });

  return (
    <mesh position={[0, 0, -0.7]}>
      <planeGeometry args={[5.4, 5.4]} />
      <shaderMaterial
        ref={material}
        args={[{
          uniforms,
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 uColor;
            uniform float uOpacity;
            varying vec2 vUv;
            void main() {
              float distanceFromCenter = distance(vUv, vec2(0.5));
              float halo = 1.0 - smoothstep(0.08, 0.5, distanceFromCenter);
              halo = pow(halo, 2.35);
              gl_FragColor = vec4(uColor, halo * uOpacity);
            }
          `,
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          blending: AdditiveBlending,
        }]}
      />
    </mesh>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
