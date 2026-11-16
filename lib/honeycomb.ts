/**
 * The skills cloud (DESIGN.md §7.7): every skill as a round icon on a watchOS-style
 * honeycomb, magnified like a fisheye around the pointer. Positions are in cells: one cell
 * is the distance between neighbors. Pure, so tests pin it.
 */

export interface Cell {
  /** Axial coordinates. */
  q: number;
  r: number;
  /** Its middle, in cells from the honeycomb's middle. */
  x: number;
  y: number;
  ring: number;
}

const DIRECTIONS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

const middle = (q: number, r: number) => ({ x: q + r / 2, y: (r * Math.sqrt(3)) / 2 });

/** The first `count` cells of a hexagonal spiral, from the middle out, ring by ring. */
export function spiral(count: number): Cell[] {
  const cells: Cell[] = [];
  if (count <= 0) return cells;
  cells.push({ q: 0, r: 0, ...middle(0, 0), ring: 0 });
  for (let ring = 1; cells.length < count; ring++) {
    let q = DIRECTIONS[4][0] * ring;
    let r = DIRECTIONS[4][1] * ring;
    for (let side = 0; side < 6 && cells.length < count; side++) {
      for (let step = 0; step < ring && cells.length < count; step++) {
        cells.push({ q, r, ...middle(q, r), ring });
        q += DIRECTIONS[side][0];
        r += DIRECTIONS[side][1];
      }
    }
  }
  return cells;
}

/** The fisheye: icons grow to this much at its middle, within about this many cells. */
export const FISHEYE = { grow: 0.6, radius: 1.8 } as const;

/** The error function (Abramowitz and Stegun 7.1.26), good to 1.5e-7. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

/**
 * Where an icon at `x, y` goes, and how big it is, with the fisheye centered on `cx, cy`.
 * Its size falls off as a Gaussian; along each ray from the middle, spacing grows with size,
 * so neighbors make room for each other and never overlap. Far away, nothing changes but a
 * small even push outward.
 */
export function fisheye(x: number, y: number, cx: number, cy: number, { grow, radius } = FISHEYE) {
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);
  const scale = 1 + grow * Math.exp(-((d / radius) ** 2));
  if (d < 1e-6) return { x, y, scale };
  const reach = d + grow * radius * (Math.sqrt(Math.PI) / 2) * erf(d / radius);
  return { x: cx + (dx / d) * reach, y: cy + (dy / d) * reach, scale };
}

/** The cell nearest a point, for arrow keys on the honeycomb. */
export function nearest(cells: readonly Cell[], x: number, y: number, except: number): number {
  let best = -1;
  let distance = Number.POSITIVE_INFINITY;
  cells.forEach((cell, i) => {
    if (i === except) return;
    const d = Math.hypot(cell.x - x, cell.y - y);
    if (d < distance) {
      distance = d;
      best = i;
    }
  });
  return best;
}
