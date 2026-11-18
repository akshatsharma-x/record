/**
 * The chip (DESIGN.md §7.7): its six layers and the one view both editions share. The 3D
 * scene (components/skills/chip-scene.tsx) and the poster (chip-poster.tsx) draw the
 * exploded chip with the same isometric projection, so the layers' labels, which are DOM,
 * sit beside the same corners in either. Pure, so tests pin it.
 *
 * World units; y is up. The chip turns AZIMUTH about y and is seen from ELEVATION above.
 */

export interface LayerShape {
  /** The square's side. */
  size: number;
  thickness: number;
}

/** Top to bottom: the die, the interposer, the heat spreader, the routing, the package, the substrate. */
export const LAYERS: readonly LayerShape[] = [
  { size: 1.24, thickness: 0.07 },
  { size: 1.56, thickness: 0.05 },
  { size: 1.96, thickness: 0.09 },
  { size: 2.2, thickness: 0.04 },
  { size: 2.36, thickness: 0.12 },
  { size: 2.36, thickness: 0.06 },
];

export const CHIP = {
  /** Radians: the chip turns 45° to show two faces, and is seen from 30° above. */
  azimuth: Math.PI / 4,
  elevation: Math.PI / 6,
  /** The gap between exploded layers, top of one to top of the next. */
  gap: 0.62,
  /** How far a layer slides out, like a card from a deck, in world units. */
  slide: 0.62,
  /** The die's cores: a grid of n × n, and how much of the die it covers. */
  cores: 6,
  coreSpan: 0.74,
  /** The substrate's solder balls: a grid of n × n under it. */
  balls: 12,
  /** View units per world unit, for the poster's SVG. */
  unit: 100,
  /** Room around the exploded chip, in world units. */
  margin: 0.12,
} as const;

export interface Point {
  x: number;
  y: number;
}

/**
 * A world point on screen (x right, y down), as the iso camera sees it: the chip turned by
 * the azimuth about y (as three.js turns it), then seen from the elevation above.
 */
export function project(x: number, y: number, z: number, { azimuth, elevation } = CHIP): Point {
  const rx = x * Math.cos(azimuth) + z * Math.sin(azimuth);
  const rz = -x * Math.sin(azimuth) + z * Math.cos(azimuth);
  return { x: rx, y: -(y * Math.cos(elevation) - rz * Math.sin(elevation)) };
}

/** Each layer's top, exploded: evenly spaced, the substrate's at 0. */
export function explodedTop(index: number): number {
  return (LAYERS.length - 1 - index) * CHIP.gap;
}

/** Each layer's top, assembled: stacked tight, the substrate's bottom at 0. */
export function assembledTop(index: number): number {
  return LAYERS.slice(index).reduce((sum, layer) => sum + layer.thickness, 0);
}

export interface Slab {
  /** The top face: back, right, front and left corners. */
  top: [Point, Point, Point, Point];
  /** The two faces toward the viewer, left and right. */
  left: [Point, Point, Point, Point];
  right: [Point, Point, Point, Point];
}

/** A square slab's visible faces, its top at height `top`. */
export function slab({ size, thickness }: LayerShape, top: number, shift = 0): Slab {
  const h = size / 2;
  const corner = (x: number, y: number, z: number) => {
    const point = project(x, y, z);
    return { x: point.x + shift, y: point.y };
  };
  // Turned 45°, the square's (+,−) corner is at the back, (+,+) on the right, (−,+) at the
  // front and (−,−) on the left.
  const [back, right, front, left] = [
    [h, -h],
    [h, h],
    [-h, h],
    [-h, -h],
  ].map(([x, z]) => corner(x, top, z)) as [Point, Point, Point, Point];
  const below = (point: Point) => ({ x: point.x, y: point.y + thickness * Math.cos(CHIP.elevation) });
  return {
    top: [back, right, front, left],
    left: [left, front, below(front), below(left)],
    right: [front, right, below(right), below(front)],
  };
}

export interface ExplodedView {
  /** The poster's viewBox, in view units. */
  box: { x: number; y: number; width: number; height: number };
  /** World height to lift the chip by, so the box is centered on the origin. */
  lift: number;
  /** Screen distance to move the chip by, so the box is centered on the origin. */
  shift: number;
  /** Each layer's label anchor: its right corner, as fractions of the box. */
  anchors: Point[];
  /** The die's middle, as fractions of the box, where its button sits. */
  die: Point;
}

/** The exploded chip's view: its bounds, centered, and where its labels and die button go. */
export function explodedView(): ExplodedView {
  const slabs = LAYERS.map((layer, i) => slab(layer, explodedTop(i)));
  const points = slabs.flatMap((s) => [...s.top, ...s.left, ...s.right]);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const m = CHIP.margin;
  // Room on the left for a layer sliding out.
  const minX = Math.min(...xs) - m - CHIP.slide;
  const maxX = Math.max(...xs) + m;
  const minY = Math.min(...ys) - m;
  const maxY = Math.max(...ys) + m;
  const width = maxX - minX;
  const height = maxY - minY;
  // Lifting the chip by `lift` moves everything up on screen by lift·cos(elevation).
  const centerY = (minY + maxY) / 2;
  const lift = centerY / Math.cos(CHIP.elevation);
  const fraction = (p: Point): Point => ({ x: (p.x - minX) / width, y: (p.y - minY) / height });
  const top = slabs[0].top;
  const middle = { x: (top[0].x + top[2].x) / 2, y: (top[0].y + top[2].y) / 2 };
  const u = CHIP.unit;
  return {
    box: { x: round(minX * u), y: round(minY * u), width: round(width * u), height: round(height * u) },
    lift,
    shift: -(minX + maxX) / 2,
    anchors: slabs.map((s) => fraction(s.top[1])),
    die: fraction(middle),
  };
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The SVG transform that draws flat shapes onto a layer's top face: local x along world x,
 * local y along world z, both in view units, the face's middle at the origin.
 */
export function faceMatrix(top: number, shift = 0): string {
  const { azimuth: a, elevation: e } = CHIP;
  const values = [Math.cos(a), -Math.sin(a) * Math.sin(e), Math.sin(a), Math.cos(a) * Math.sin(e), shift * CHIP.unit, -top * Math.cos(e) * CHIP.unit];
  return `matrix(${values.map((value) => Number(value.toFixed(4))).join(",")})`;
}

/** The die's cores: a ring of squares around its middle, where "AS" is engraved. Local units, centered. */
export function coreCells(): { x: number; z: number; size: number; ring: number }[] {
  const n = CHIP.cores;
  const span = LAYERS[0].size * CHIP.coreSpan;
  const pitch = span / n;
  const cells: { x: number; z: number; size: number; ring: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const ring = Math.min(i, j, n - 1 - i, n - 1 - j);
      // The middle two-by-two is the engraving's.
      if (ring >= Math.floor(n / 2) - 1) continue;
      cells.push({ x: -span / 2 + pitch * (i + 0.5), z: -span / 2 + pitch * (j + 0.5), size: pitch * 0.72, ring });
    }
  }
  return cells;
}

/** A polygon's points for SVG, in view units, written "x,y". */
export function points(corners: readonly Point[]): string {
  return corners.map((p) => `${round(p.x * CHIP.unit)},${round(p.y * CHIP.unit)}`).join(" ");
}

/**
 * Where the chip is in its scroll scene, 0 to 1: it rises, turns into view, then explodes.
 * `stage` is the tall stage's box and `frame` the height of the sticky frame inside it
 * (100svh): measured, never the window's height, which iOS Safari changes as its toolbar
 * shows and hides, so the scene doesn't jump when it does (Part 15).
 */
export function sceneProgress(stage: { top: number; height: number }, frame: number): number {
  const travel = stage.height - frame;
  if (travel <= 0) return 1;
  return Math.min(1, Math.max(0, -stage.top / travel));
}

/** The scene's phases, as stretches of its progress. */
export const PHASES = {
  rise: [0, 0.3],
  turn: [0.15, 0.5],
  explode: [0.45, 0.85],
} as const;

/** A phase's own progress, 0 to 1, eased in and out. */
export function phase(progress: number, [from, to]: readonly [number, number]): number {
  const t = Math.min(1, Math.max(0, (progress - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
