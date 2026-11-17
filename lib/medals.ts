/**
 * The medals' shapes and engravings (DESIGN.md §7.8), shared by the 3D medals (bevelled
 * extrusions of these outlines, engraved through a canvas) and their SVG stills, so both
 * editions are the same object. Units: the medal's half-width is about 1, y points up.
 * Pure, so tests pin it.
 */

export type MedalShape = "circle" | "hexagon" | "rounded-square" | "shield";
export type Point = readonly [number, number];

export const MEDAL_SHAPES: readonly MedalShape[] = ["circle", "hexagon", "rounded-square", "shield"];

/** The minted proportions: where the rim ends, where the enamel starts, how thick it is. */
export const MEDAL = {
  /** Points around each outline: the 3D medals' bevels want more than the stills' paths. */
  samples: 160,
  stillSamples: 96,
  /** The rim's inner edge and the field inside it, as insets from the outline. */
  rim: 0.13,
  field: 0.19,
  /** Thickness of the body, its bevel, and how far the rim stands above the faces. */
  depth: 0.1,
  bevel: 0.045,
  relief: 0.018,
} as const;

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const scale = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const length = (a: Point) => Math.hypot(a[0], a[1]);
const unit = (a: Point): Point => scale(a, 1 / (length(a) || 1));

/** Twice the signed area: positive when the points run counterclockwise (y up). */
export function signedArea(points: readonly Point[]): number {
  let area = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    area += p[0] * q[1] - q[0] * p[1];
  });
  return area;
}

const counterclockwise = (points: Point[]) => (signedArea(points) < 0 ? points.reverse() : points);

/** A polygon with each corner cut by an arc of `radius` tangent to both its edges. */
function roundedPolygon(vertices: readonly Point[], radius: number, steps: number): Point[] {
  const out: Point[] = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    const a = unit(sub(vertices[(i - 1 + n) % n], v));
    const b = unit(sub(vertices[(i + 1) % n], v));
    const angle = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1])));
    const center = add(v, scale(unit(add(a, b)), radius / Math.sin(angle / 2)));
    const from = add(v, scale(a, radius / Math.tan(angle / 2)));
    const to = add(v, scale(b, radius / Math.tan(angle / 2)));
    const start = Math.atan2(from[1] - center[1], from[0] - center[0]);
    let sweep = Math.atan2(to[1] - center[1], to[0] - center[0]) - start;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    for (let s = 0; s <= steps; s++) {
      const t = start + (sweep * s) / steps;
      out.push([center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)]);
    }
  }
  return out;
}

/** A point along a cubic Bézier. */
function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** The heater shield: a flat top with rounded corners, straight sides, then curves to a point. */
function shield(samples: number): Point[] {
  const w = 0.9;
  const top = 0.9;
  const shoulder = 0.12;
  const tip: Point = [0, -1.06];
  const r = 0.14;
  const half: Point[] = [];
  const corner = Math.ceil(samples / 16);
  // From the middle of the top edge, right to the corner, down the side, round to the tip.
  half.push([0, top]);
  for (let s = 0; s <= corner; s++) {
    const t = Math.PI / 2 - (s / corner) * (Math.PI / 2);
    half.push([w - r + r * Math.cos(t), top - r + r * Math.sin(t)]);
  }
  half.push([w, shoulder]);
  const curve = Math.ceil(samples / 4);
  for (let s = 1; s <= curve; s++) half.push(cubic([w, shoulder], [w, -0.42], [0.42, -0.82], tip, s / curve));
  // Mirrored for the left half, from the tip back up to the top.
  const left = half.slice(1, -1).reverse().map(([x, y]): Point => [-x, y]);
  return counterclockwise([...half, ...left]);
}

/** A medal's outline: its silhouette, counterclockwise around its middle. */
export function outline(shape: MedalShape, samples: number = MEDAL.samples): Point[] {
  switch (shape) {
    case "circle":
      return Array.from({ length: samples }, (_, i): Point => {
        const t = (i / samples) * Math.PI * 2;
        return [Math.cos(t), Math.sin(t)];
      });
    case "hexagon": {
      // Flat on top, as wide as the circle and a little shorter, with soft corners.
      const radius = 1.06;
      const vertices = Array.from({ length: 6 }, (_, i): Point => {
        const t = (i * Math.PI) / 3;
        return [radius * Math.cos(t), radius * Math.sin(t)];
      });
      return counterclockwise(roundedPolygon(vertices, 0.16, Math.ceil(samples / 12)));
    }
    case "rounded-square": {
      // A superellipse: the continuous corners the site's cards have (§4.6).
      const half = 0.9;
      const n = 5;
      return Array.from({ length: samples }, (_, i): Point => {
        const t = (i / samples) * Math.PI * 2;
        const c = Math.cos(t);
        const s = Math.sin(t);
        return [half * Math.sign(c) * Math.abs(c) ** (2 / n), half * Math.sign(s) * Math.abs(s) ** (2 / n)];
      });
    }
    case "shield":
      return shield(samples);
  }
}

/** Keeps the part of a polygon where `dot(point, normal) >= offset` (Sutherland–Hodgman). */
function clip(polygon: readonly Point[], normal: Point, offset: number): Point[] {
  const out: Point[] = [];
  const side = (p: Point) => p[0] * normal[0] + p[1] * normal[1] - offset;
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const da = side(a);
    const db = side(b);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}

/**
 * The outline moved inward by `distance`: an even rim all the way round. Every medal is
 * convex, so this is exactly where all its edges' half-planes, each moved in by the
 * distance, overlap; a corner rounder than the distance comes out sharp, as it should.
 */
export function inset(points: readonly Point[], distance: number): Point[] {
  let polygon = [...points];
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    const tangent = unit(sub(q, p));
    // Counterclockwise, the inward normal is the tangent turned counterclockwise.
    const normal: Point = [-tangent[1], tangent[0]];
    polygon = clip(polygon, normal, p[0] * normal[0] + p[1] * normal[1] + distance);
  });
  return polygon;
}

/** The box around some points. */
export function bounds(points: readonly Point[]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** How wide the outline is at height `y`: the chord a line of text there has to fit in. */
export function widthAt(points: readonly Point[], y: number): number {
  const xs: number[] = [];
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    if ((p[1] - y) * (q[1] - y) > 0 || p[1] === q[1]) return;
    xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
  });
  return xs.length < 2 ? 0 : Math.max(...xs) - Math.min(...xs);
}

/**
 * An SVG path through the points, in a box `size` wide with the medal's middle at its
 * middle (SVG's y points down). One decimal, with commas, so no run of digits is long.
 */
export function svgPath(points: readonly Point[], size: number, radius = size * 0.42): string {
  const c = size / 2;
  const at = (v: number) => String(Math.round(v * 10) / 10);
  return `${points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${at(c + x * radius)},${at(c - y * radius)}`).join("")}Z`;
}

// ─── The engraving ───────────────────────────────────────────────────────────

/** Greedy word wrap at `max` characters; a longer word keeps its own line. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** Joins a line's parts ("2024", "2025", "top 50 of 300+") with middots, wrapping between parts. */
function wrapParts(line: string, max: number): string[] {
  const rows: string[] = [];
  for (const part of line.split(" · ")) {
    const last = rows.at(-1);
    if (last !== undefined && `${last} · ${part}`.length <= max) rows[rows.length - 1] = `${last} · ${part}`;
    else rows.push(part);
  }
  return rows;
}

/** One run of engraved text, in medal units (y up, from the medal's middle). */
export interface EngravedRun {
  text: string;
  y: number;
  size: number;
  weight: 500 | 600;
  /** Small caps-style letter spacing, in ems. */
  tracking: number;
  caps: boolean;
}

/** The face's engraving: the name, a short rule, then the years and line in tracked caps. */
export interface Engraving {
  runs: EngravedRun[];
  /** The rule between the name and the line: its y and half-length, or null on the back. */
  rule: { y: number; half: number } | null;
}

const LIMITS = { face: 11, line: 15, back: 20 } as const;

/** Where the middle of the text sits: a shield's is higher, where it's wide. */
const middleOf = (shape: MedalShape) => (shape === "shield" ? 0.1 : 0);

/** How wide a run of text is, roughly, in ems: the system sans, caps tracked out. */
const advance = (run: EngravedRun) => run.text.length * (run.caps ? 0.7 : 0.56);

/** How much a layout must shrink so every run fits the field at its height, with a margin. */
function shrink(field: readonly Point[], runs: readonly EngravedRun[]): number {
  return Math.min(
    1,
    ...runs.map((run) => {
      const room = Math.min(widthAt(field, run.y + run.size / 2), widthAt(field, run.y - run.size / 2));
      return room / (advance(run) * run.size);
    }),
  );
}

/**
 * Lays an engraving out, then shrinks each group of runs (the name's lines, the line's
 * rows) until it fits the field at its height. Smaller, the layout is shorter, so its lines
 * sit nearer the middle, where the field is wider. Both editions use the result, so every
 * letter stays inside the rim in 3D and in the still.
 */
function fitted(shape: MedalShape, groups: number, layout: (scales: number[]) => { runs: EngravedRun[]; groups: number[]; rule: Engraving["rule"] }): Engraving {
  const field = inset(outline(shape), MEDAL.field + 0.05);
  const scales = Array.from({ length: groups }, () => 1);
  let engraving = layout(scales);
  for (let i = 0; i < 32; i++) {
    let changed = false;
    // A line past the field's top or bottom has no room at all: the whole layout shrinks a step.
    const outside = engraving.runs.some((run) => Math.min(widthAt(field, run.y + run.size / 2), widthAt(field, run.y - run.size / 2)) <= 0);
    for (let g = 0; g < groups; g++) {
      const k = outside ? 0.94 : shrink(field, engraving.runs.filter((_, r) => engraving.groups[r] === g));
      if (k < 0.995) {
        scales[g] *= k;
        changed = true;
      }
    }
    if (!changed) break;
    engraving = layout(scales);
  }
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    runs: engraving.runs.map((run) => ({ ...run, y: round(run.y), size: round(run.size) })),
    rule: engraving.rule ? { y: round(engraving.rule.y), half: round(engraving.rule.half) } : null,
  };
}

/** The face of a medal: its name, a short rule, then its years and line in tracked caps. */
export function faceEngraving(shape: MedalShape, face: string, line: string): Engraving {
  const title = wrap(face, LIMITS.face);
  const rows = wrapParts(line, LIMITS.line);
  return fitted(shape, 2, ([name, small]) => {
    const titleSize = (title.length > 2 ? 0.2 : 0.24) * name;
    const rowSize = 0.12 * small;
    const titleLead = titleSize * 1.08;
    const rowLead = rowSize * 1.45;
    const gap = 0.1 * Math.min(name, small);
    const height = title.length * titleLead + gap * 2 + rows.length * rowLead;
    let y = middleOf(shape) + height / 2;
    const runs: EngravedRun[] = [];
    for (const text of title) {
      runs.push({ text, y: y - titleLead / 2, size: titleSize, weight: 600, tracking: -0.01, caps: false });
      y -= titleLead;
    }
    const rule = { y: y - gap, half: 0.16 * Math.min(name, small) };
    y -= gap * 2;
    for (const text of rows) {
      runs.push({ text, y: y - rowLead / 2, size: rowSize, weight: 600, tracking: 0.08, caps: true });
      y -= rowLead;
    }
    return { runs, groups: runs.map((_, i) => (i < title.length ? 0 : 1)), rule };
  });
}

/** The back of a medal: its description, centered. */
export function backEngraving(shape: MedalShape, back: string): Engraving {
  const lines = wrap(back, LIMITS.back);
  return fitted(shape, 1, ([scale]) => {
    const size = 0.12 * scale;
    const lead = size * 1.42;
    let y = middleOf(shape) + (lines.length * lead) / 2;
    const runs = lines.map((text): EngravedRun => {
      const run: EngravedRun = { text, y: y - lead / 2, size, weight: 500, tracking: 0, caps: false };
      y -= lead;
      return run;
    });
    return { runs, groups: runs.map(() => 0), rule: null };
  });
}
