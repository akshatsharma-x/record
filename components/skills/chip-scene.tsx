"use client";

import { Environment, Lightformer, OrthographicCamera } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { assembledTop, CHIP, coreCells, explodedTop, explodedView, LAYERS, PHASES, phase, sceneProgress } from "@/lib/chip";
import { chipState, onChip, setChip } from "@/lib/chip-state";
import { scrub } from "@/lib/motion";

/**
 * The chip in 3D (DESIGN.md §7.7), procedural, with nothing downloaded: six slabs, from the
 * die (engraved "AS", ringed by cores in the finish's accent) down to the substrate on its
 * solder balls, in a studio of Lightformers. It rises and turns into view as its stage
 * scrolls, then explodes into the poster's isometric view (lib/chip.ts), where the DOM
 * labels wait. It draws only on demand: while the scroll moves it, a layer slides or the
 * cores ripple.
 */

const VIEW = explodedView();
const WIDTH = VIEW.box.width / CHIP.unit;
const HEIGHT = VIEW.box.height / CHIP.unit;
const DISTANCE = 12;
const SIDES = 512;
/** Seconds a value takes to settle toward its target: the scroll's, and a layer's slide. */
const SETTLE = { scroll: scrub / 4, slide: 0.09 } as const;
/** The cores' ripple: how long it lasts, how far apart the rings light, how sharp each flash is. */
const RIPPLE = { length: 1.8, ring: 0.16, width: 0.16, rest: 1, peak: 3.4 } as const;

/** A color token as three.js reads it. Safari reports color-mix() results as color(srgb …). */
function token(name: string): THREE.Color {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.documentElement.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
  return srgb ? new THREE.Color().setRGB(Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), THREE.SRGBColorSpace) : new THREE.Color(value);
}

const css = (color: THREE.Color) => `#${color.getHexString()}`;

interface Palette {
  accent: THREE.Color;
  layers: THREE.Color[];
  detail: THREE.Color[];
  engrave: THREE.Color;
}

function palette(): Palette {
  return {
    accent: token("--color-accent"),
    layers: ["--chip-die", "--chip-interposer", "--chip-spreader", "--chip-routing", "--chip-package", "--chip-substrate"].map(token),
    detail: ["--chip-engrave", "--chip-bump", "--chip-recess", "--chip-trace", "--chip-pad", "--chip-ball"].map(token),
    engrave: token("--chip-engrave"),
  };
}

/** Each layer's top face, drawn once on a canvas, the way the poster draws it. */
function faceTexture(index: number, colors: Palette): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SIDES;
  canvas.height = SIDES;
  const context = canvas.getContext("2d")!;
  const base = colors.layers[index];
  const detail = css(colors.detail[index]);
  context.fillStyle = css(base);
  context.fillRect(0, 0, SIDES, SIDES);
  context.fillStyle = detail;
  context.strokeStyle = detail;
  const at = (fraction: number) => fraction * SIDES;
  if (index === 0) {
    // "AS", engraved where the cores leave room.
    context.font = `600 ${at(0.12)}px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("AS", at(0.5), at(0.52));
  } else if (index === 1 || index === 5) {
    const n = index === 1 ? 9 : 12;
    const inset = index === 1 ? 0.16 : 0.1;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        context.beginPath();
        context.arc(at(inset + ((1 - 2 * inset) * i) / (n - 1)), at(inset + ((1 - 2 * inset) * j) / (n - 1)), at(index === 1 ? 0.012 : 0.014), 0, Math.PI * 2);
        context.fill();
      }
    }
  } else if (index === 2) {
    context.lineWidth = at(0.006);
    context.globalAlpha = 0.18;
    for (let y = 0; y < SIDES; y += at(0.008)) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(SIDES, y + at(0.004));
      context.stroke();
    }
    context.globalAlpha = 1;
    context.lineWidth = at(0.012);
    context.strokeRect(at(0.19), at(0.19), at(0.62), at(0.62));
  } else if (index === 3) {
    context.lineWidth = at(0.012);
    for (let i = 0; i < 3; i++) {
      const along = at(0.15 + i * 0.35);
      for (const [x1, y1, x2, y2] of [
        [along, at(0.34), along, at(0.05)],
        [along, at(0.66), along, at(0.95)],
        [at(0.34), along, at(0.05), along],
        [at(0.66), along, at(0.95), along],
      ]) {
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
      }
    }
    context.strokeRect(at(0.34), at(0.34), at(0.32), at(0.32));
  } else if (index === 4) {
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < 10; i++) {
        const along = at(0.14 + (i * 0.72) / 9);
        const [x, y, w, h] = side % 2 === 0 ? [along - at(0.017), side === 0 ? at(0.05) : at(0.92), at(0.034), at(0.03)] : [side === 1 ? at(0.92) : at(0.05), along - at(0.017), at(0.03), at(0.034)];
        context.fillRect(x, y, w, h);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** How each layer's surface catches the light: silicon, ceramic, metal, laminate. */
const SURFACES = [
  { roughness: 0.28, metalness: 0.55 },
  { roughness: 0.5, metalness: 0.3 },
  { roughness: 0.34, metalness: 0.85 },
  { roughness: 0.55, metalness: 0.2 },
  { roughness: 0.6, metalness: 0.15 },
  { roughness: 0.65, metalness: 0.1 },
];

function Layer({ index, id, colors }: { index: number; id: string; colors: Palette }) {
  const { size, thickness } = LAYERS[index];
  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: colors.layers[index], ...SURFACES[index] });
    const top = new THREE.MeshStandardMaterial({ map: faceTexture(index, colors), ...SURFACES[index] });
    // A box's faces: +x, −x, +y (the top), −y, +z, −z.
    return [side, side, top, side, side, side];
  }, [index, colors]);
  useEffect(() => () => materials.forEach((material) => (material as THREE.MeshStandardMaterial).map?.dispose()), [materials]);
  const over = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (chipState.progress > PHASES.explode[1] - 0.02) setChip({ active: id });
  };
  const out = () => {
    if (chipState.active === id) setChip({ active: null });
  };
  return (
    <mesh material={materials} onPointerOver={over} onPointerOut={out}>
      <boxGeometry args={[size, thickness, size]} />
    </mesh>
  );
}

function Cores({ colors }: { colors: Palette }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => coreCells(), []);
  const rings = Math.max(...cells.map((cell) => cell.ring));
  const { thickness } = LAYERS[0];
  const invalidate = useThree((state) => state.invalidate);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const cores = mesh.current;
    if (!cores) return;
    const place = new THREE.Object3D();
    cells.forEach((cell, i) => {
      place.position.set(cell.x, thickness / 2 + 0.004, cell.z);
      place.updateMatrix();
      cores.setMatrixAt(i, place.matrix);
      cores.setColorAt(i, color.copy(colors.accent).multiplyScalar(RIPPLE.rest));
    });
    cores.instanceMatrix.needsUpdate = true;
    if (cores.instanceColor) cores.instanceColor.needsUpdate = true;
    invalidate();
  }, [cells, colors, color, thickness, invalidate]);

  useFrame(() => {
    const cores = mesh.current;
    if (!cores || !chipState.ripple) return;
    const elapsed = (performance.now() - chipState.ripple) / 1000;
    // From the middle out: the inner ring lights first.
    cells.forEach((cell, i) => {
      const delay = (rings - cell.ring) * RIPPLE.ring;
      const flash = Math.exp(-(((elapsed - delay) / RIPPLE.width) ** 2));
      cores.setColorAt(i, color.copy(colors.accent).multiplyScalar(RIPPLE.rest + (RIPPLE.peak - RIPPLE.rest) * flash));
    });
    if (cores.instanceColor) cores.instanceColor.needsUpdate = true;
    if (elapsed < RIPPLE.length) invalidate();
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]}>
      <boxGeometry args={[cells[0].size, 0.008, cells[0].size]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Balls({ colors }: { colors: Palette }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const n = CHIP.balls;
  const { size, thickness } = LAYERS[5];
  useEffect(() => {
    const balls = mesh.current;
    if (!balls) return;
    const place = new THREE.Object3D();
    const span = size * 0.8;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        place.position.set(-span / 2 + (span * i) / (n - 1), -thickness / 2 - 0.03, -span / 2 + (span * j) / (n - 1));
        place.updateMatrix();
        balls.setMatrixAt(i * n + j, place.matrix);
      }
    }
    balls.instanceMatrix.needsUpdate = true;
  }, [n, size, thickness]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, n * n]}>
      <sphereGeometry args={[0.045, 10, 8]} />
      <meshStandardMaterial color={colors.detail[5]} roughness={0.25} metalness={1} />
    </instancedMesh>
  );
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Lifts that center the chip in its box, assembled and exploded. */
const ASSEMBLED_LIFT = -assembledTop(0) / 2;

export default function ChipScene() {
  const ids = useMemo(() => Array.from(document.querySelectorAll<HTMLElement>("#chip .chip-label"), (label) => label.dataset.layer ?? ""), []);
  const [colors, setColors] = useState(palette);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  // The scene mounts three screens ahead of the chip: compile its shaders then, off screen,
  // rather than in the first frame it's seen.
  useEffect(() => {
    void gl.compileAsync(scene, camera).then(() => invalidate());
  }, [gl, scene, camera, invalidate, colors]);
  const chip = useRef<THREE.Group>(null);
  const layers = useRef<(THREE.Group | null)[]>([]);
  const motion = useRef({ progress: -1, slides: LAYERS.map(() => 0) });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColors(palette());
      invalidate();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-finish", "data-theme"] });
    const stop = onChip(() => invalidate());
    return () => {
      observer.disconnect();
      stop();
    };
  }, [invalidate]);

  useFrame((_, delta) => {
    const group = chip.current;
    const stage = document.getElementById("chip");
    if (!group || !stage) return;
    const box = stage.getBoundingClientRect();
    const target = sceneProgress({ top: box.top, height: box.height }, window.innerHeight);
    const state = motion.current;
    const step = (value: number, to: number, settle: number) => value + (to - value) * (1 - Math.exp(-delta / settle));
    state.progress = state.progress < 0 ? target : step(state.progress, target, SETTLE.scroll);
    let moving = Math.abs(target - state.progress) > 1e-4;

    const p = state.progress;
    const rise = phase(p, PHASES.rise);
    const turn = phase(p, PHASES.turn);
    const explode = phase(p, PHASES.explode);
    group.position.set(VIEW.shift, lerp(ASSEMBLED_LIFT, VIEW.lift, explode) - (1 - rise) * HEIGHT * 0.9, 0);
    group.rotation.set((1 - turn) * 0.55, CHIP.azimuth - (1 - turn) * Math.PI * 0.55, 0);

    const exploded = p > PHASES.explode[1] - 0.02;
    LAYERS.forEach((layer, i) => {
      const node = layers.current[i];
      if (!node) return;
      const to = exploded && chipState.active === ids[i] ? 1 : 0;
      state.slides[i] = step(state.slides[i], to, SETTLE.slide);
      if (Math.abs(to - state.slides[i]) > 1e-3) moving = true;
      const slide = state.slides[i] * CHIP.slide;
      node.position.set(-slide * Math.cos(CHIP.azimuth), lerp(assembledTop(i), explodedTop(i), explode) - layer.thickness / 2, -slide * Math.sin(CHIP.azimuth));
    });
    if (moving) invalidate();
  });

  return (
    <>
      <OrthographicCamera
        makeDefault
        manual
        left={-WIDTH / 2}
        right={WIDTH / 2}
        top={HEIGHT / 2}
        bottom={-HEIGHT / 2}
        near={0.1}
        far={DISTANCE * 3}
        position={[0, DISTANCE * Math.sin(CHIP.elevation), DISTANCE * Math.cos(CHIP.elevation)]}
        onUpdate={(camera) => camera.lookAt(0, 0, 0)}
      />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-6, 1.5, 2]} rotation-y={Math.PI / 2} scale={[8, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={0.9} color={colors.accent} position={[0, 3, 7]} scale={3.5} />
        {/* Behind and above: what the metal mirrors from the exploded view's angle. */}
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -7]} rotation-x={Math.PI / 5} scale={[12, 5, 1]} />
      </Environment>
      <ambientLight intensity={0.12} />
      <group ref={chip}>
        {LAYERS.map((_, i) => (
          <group
            key={i}
            ref={(node) => {
              layers.current[i] = node;
            }}
          >
            <Layer index={i} id={ids[i]} colors={colors} />
            {i === 0 ? <Cores colors={colors} /> : null}
            {i === LAYERS.length - 1 ? <Balls colors={colors} /> : null}
          </group>
        ))}
      </group>
    </>
  );
}
