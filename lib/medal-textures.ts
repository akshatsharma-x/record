/**
 * The 3D medals' geometry and textures (DESIGN.md §7.8), for components/credentials/
 * medal-scene.tsx: the bevelled body, the rims and the fields from lib/medals.ts's
 * outlines, the faces engraved on canvases, the brushing and the glint. Browser-only (it
 * draws on canvases), and loaded with the scene.
 */
import * as THREE from "three";
import { type Engraving, backEngraving, faceEngraving, inset, MEDAL, type MedalShape, outline, type Point } from "./medals.ts";

/**
 * The canvas square that the faces' textures cover, in medal units, and its resolution:
 * a medal is at most about 180 CSS pixels across, so 512 is more than its screen has.
 */
const SPAN = 1.1;
const TEXTURE = 512;
const BRUSH = 256;
const FONT = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

/** The colors a medal is made of, read from the page's tokens. */
export interface MedalPalette {
  metal: THREE.Color;
  enamel: THREE.Color;
  inlay: THREE.Color;
  etch: THREE.Color;
  accent: THREE.Color;
}

const css = (color: THREE.Color) => `#${color.getHexString()}`;

const toCanvas = (x: number, y: number): [number, number] => [(x / (2 * SPAN) + 0.5) * TEXTURE, (0.5 - y / (2 * SPAN)) * TEXTURE];

function shapeOf(points: readonly Point[], holes: readonly (readonly Point[])[] = []): THREE.Shape {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of holes) shape.holes.push(new THREE.Path([...hole].reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  return shape;
}

/** The body, the rim (one per side) and the field (one per side), sharing the outline. */
export function geometries(shape: MedalShape) {
  const edge = outline(shape);
  // Pulled in by its bevel, so the bevel ends exactly on the silhouette.
  const body = new THREE.ExtrudeGeometry(shapeOf(inset(edge, MEDAL.bevel)), {
    depth: MEDAL.depth,
    bevelEnabled: true,
    bevelThickness: MEDAL.bevel,
    bevelSize: MEDAL.bevel,
    bevelSegments: 5,
    curveSegments: 1,
  });
  body.translate(0, 0, -MEDAL.depth / 2);
  const ringBevel = MEDAL.relief / 3;
  const rim = new THREE.ExtrudeGeometry(shapeOf(inset(edge, MEDAL.bevel + ringBevel), [inset(edge, MEDAL.rim - ringBevel)]), {
    depth: MEDAL.relief - ringBevel,
    bevelEnabled: true,
    bevelThickness: ringBevel,
    bevelSize: ringBevel,
    bevelSegments: 3,
    curveSegments: 1,
  });
  const field = new THREE.ShapeGeometry(shapeOf(inset(edge, MEDAL.field)), 1);
  // Its UVs cover the textures' square, so the engraving lands where lib/medals.ts put it.
  const position = field.getAttribute("position");
  const uv = field.getAttribute("uv");
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / (2 * SPAN) + 0.5, position.getY(i) / (2 * SPAN) + 0.5);
  uv.needsUpdate = true;
  return { body, rim, field };
}

/** Draws the runs with their tracking, letter by letter when tracked, centered on each run's x. */
function engrave(context: CanvasRenderingContext2D, engraving: Engraving, offset = 0) {
  context.textAlign = "left";
  context.textBaseline = "middle";
  for (const run of engraving.runs) {
    const size = (run.size / (2 * SPAN)) * TEXTURE;
    context.font = `${run.weight} ${size}px ${FONT}`;
    const text = run.caps ? run.text.toUpperCase() : run.text;
    const letters = [...text];
    const spacing = run.tracking * size;
    const widths = letters.map((letter) => context.measureText(letter).width);
    const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (letters.length - 1);
    const [cx, cy] = toCanvas(0, run.y);
    let x = cx - total / 2;
    if (run.tracking === 0) {
      context.fillText(text, cx - context.measureText(text).width / 2, cy + offset);
      continue;
    }
    letters.forEach((letter, i) => {
      context.fillText(letter, x, cy + offset);
      x += widths[i] + spacing;
    });
  }
  if (engraving.rule) {
    const [x1, y1] = toCanvas(-engraving.rule.half, engraving.rule.y);
    const [x2] = toCanvas(engraving.rule.half, engraving.rule.y);
    context.fillRect(x1, y1 - TEXTURE * 0.0016 + offset, x2 - x1, TEXTURE * 0.0032);
  }
}

function canvas(size = TEXTURE) {
  const element = document.createElement("canvas");
  element.width = size;
  element.height = size;
  return { element, context: element.getContext("2d")! };
}

function texture(source: HTMLCanvasElement, color: boolean): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(source);
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/**
 * The faces' textures. The front: the enamel with the letters inlaid in bright metal, and
 * a mask that makes the letters metal and sinks them a little. The back: bare metal with
 * the letters cut in, darker where the cut catches no light.
 */
export function faces(shape: MedalShape, face: string, line: string, back: string, colors: MedalPalette) {
  const front = canvas();
  front.context.fillStyle = css(colors.enamel);
  front.context.fillRect(0, 0, TEXTURE, TEXTURE);
  front.context.fillStyle = css(colors.inlay);
  const frontEngraving = faceEngraving(shape, face, line);
  engrave(front.context, frontEngraving);

  const frontMask = canvas();
  frontMask.context.fillStyle = "black";
  frontMask.context.fillRect(0, 0, TEXTURE, TEXTURE);
  frontMask.context.fillStyle = "white";
  engrave(frontMask.context, frontEngraving);

  const backEngraved = backEngraving(shape, back);
  const rear = canvas();
  rear.context.fillStyle = css(colors.metal);
  rear.context.fillRect(0, 0, TEXTURE, TEXTURE);
  rear.context.fillStyle = css(colors.etch);
  engrave(rear.context, backEngraved);

  const rearMask = canvas();
  rearMask.context.fillStyle = "white";
  rearMask.context.fillRect(0, 0, TEXTURE, TEXTURE);
  rearMask.context.fillStyle = "black";
  engrave(rearMask.context, backEngraved);

  return {
    front: texture(front.element, true),
    frontMask: texture(frontMask.element, false),
    back: texture(rear.element, true),
    backMask: texture(rearMask.element, false),
  };
}

/** Made once for every medal: tiny, and the same for each. */
let brushed: THREE.DataTexture | null = null;
let sparkle: THREE.CanvasTexture | null = null;

/** Brushed in circles: the anisotropy's direction at every point is along its ring. Shared. */
export function brushing(): THREE.DataTexture {
  if (brushed) return brushed;
  const data = new Uint8Array(BRUSH * BRUSH * 4);
  for (let j = 0; j < BRUSH; j++) {
    for (let i = 0; i < BRUSH; i++) {
      const x = ((i + 0.5) / BRUSH - 0.5) * 2 * SPAN;
      const y = ((j + 0.5) / BRUSH - 0.5) * 2 * SPAN;
      const r = Math.hypot(x, y) || 1;
      const k = (j * BRUSH + i) * 4;
      data[k] = Math.round(((-y / r) * 0.5 + 0.5) * 255);
      data[k + 1] = Math.round(((x / r) * 0.5 + 0.5) * 255);
      data[k + 2] = 255;
      data[k + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(data, BRUSH, BRUSH, THREE.RGBAFormat);
  // The caps' UVs are medal units; this lays the map over the same square as the faces'.
  map.repeat.set(1 / (2 * SPAN), 1 / (2 * SPAN));
  map.offset.set(0.5, 0.5);
  map.needsUpdate = true;
  brushed = map;
  return map;
}

/** The glint: a four-pointed star of light, drawn once and shared. */
export function glintTexture(): THREE.CanvasTexture {
  if (sparkle) return sparkle;
  const size = 256;
  const { element, context } = canvas(size);
  const c = size / 2;
  const halo = context.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, "rgba(255,255,255,1)");
  halo.addColorStop(0.12, "rgba(255,255,255,0.55)");
  halo.addColorStop(0.4, "rgba(255,255,255,0.08)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = halo;
  context.fillRect(0, 0, size, size);
  for (const [w, h] of [
    [size, size * 0.035],
    [size * 0.035, size],
  ]) {
    const streak = context.createRadialGradient(c, c, 0, c, c, c);
    streak.addColorStop(0, "rgba(255,255,255,0.95)");
    streak.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = streak;
    context.fillRect(c - w / 2, c - h / 2, w, h);
  }
  const map = new THREE.CanvasTexture(element);
  map.colorSpace = THREE.SRGBColorSpace;
  sparkle = map;
  return map;
}

/**
 * The studio the medals reflect, made once for all of them (and again only when the
 * finish changes): emissive panels, as drei's Lightformers are, around the medal and
 * filtered into an environment map. A broad softbox behind the camera, brighter at the
 * top, gives the faces their gradient; side strips and a top light catch the bevels as a
 * medal turns; a ring in the finish's accent tints its reflections.
 */
const studios = new WeakMap<THREE.WebGLRenderer, Map<string, THREE.Texture>>();

const PANELS = [
  { intensity: 1.4, position: [0, 3.1, 6.5], scale: [9, 2.6] },
  { intensity: 0.22, position: [0, -2.6, 6.5], scale: [9, 1.6] },
  { intensity: 1, position: [-5, 0, 3], scale: [2.5, 7] },
  { intensity: 1.6, position: [5, 1, -1], scale: [2.5, 7] },
  { intensity: 1.3, position: [0, 6, 0], scale: [8, 8] },
] as const;
const RING = { intensity: 0.8, position: [0, -3.2, 5], radius: [1.2, 2.4] } as const;

/** One studio per finish (there are four), kept while the page lives, so none is disposed while a medal shows it. */
export function studio(gl: THREE.WebGLRenderer, accent: THREE.Color): THREE.Texture {
  const key = accent.getHexString();
  const made = studios.get(gl) ?? new Map<string, THREE.Texture>();
  studios.set(gl, made);
  const cached = made.get(key);
  if (cached) return cached;
  const scene = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];
  const light = (geometry: THREE.BufferGeometry, color: THREE.Color, position: readonly number[]) => {
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(geometry, material);
  };
  for (const panel of PANELS) {
    light(new THREE.PlaneGeometry(panel.scale[0], panel.scale[1]), new THREE.Color(1, 1, 1).multiplyScalar(panel.intensity), panel.position);
  }
  light(new THREE.RingGeometry(RING.radius[0], RING.radius[1], 48), accent.clone().multiplyScalar(RING.intensity), RING.position);
  const generator = new THREE.PMREMGenerator(gl);
  const texture = generator.fromScene(scene, 0, 0.1, 30).texture;
  generator.dispose();
  for (const item of disposables) item.dispose();
  made.set(key, texture);
  return texture;
}

