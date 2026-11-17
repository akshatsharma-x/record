/**
 * The dock's magnification (DESIGN.md §7.9): macOS's, where the icon under the pointer
 * swells and its neighbors swell less, on a cosine falloff, and the row spreads so no two
 * icons ever overlap. Pure, so tests pin it; lib/contact-behavior.ts springs toward it.
 */

export const DOCK = {
  /** How big the icon under the pointer grows. */
  grow: 1.6,
  /** How far the swell reaches, in icon widths, from the pointer to where it falls to nothing. */
  reach: 2.6,
} as const;

/** One icon's scale for a pointer `distance` away (both in icon widths): 1 at the reach and past it. */
export function swell(distance: number, { grow, reach } = DOCK): number {
  const d = Math.abs(distance);
  if (d >= reach) return 1;
  // A raised cosine: flat on top, flat at the edges, smooth in between.
  return 1 + (grow - 1) * ((Math.cos((Math.PI * d) / reach) + 1) / 2);
}

export interface Magnified {
  scales: number[];
  /** How far each icon's middle moves to make room, in pixels. */
  shifts: number[];
  /** Where the spread row starts and ends, from the dock's resting left edge, for its glass. */
  left: number;
  right: number;
}

/**
 * Each icon's scale and the shift that makes room for it, with the pointer at `pointer`
 * (pixels from the row's left edge, or null when it's away). Icons are `size` wide with
 * `gap` between them. The row spreads about the pointer: the spot under it stays under
 * it, so the icon you're reaching for doesn't slide away.
 */
export function magnify(count: number, size: number, gap: number, pointer: number | null): Magnified {
  const centers = Array.from({ length: count }, (_, i) => size / 2 + i * (size + gap));
  const base = count * size + (count - 1) * gap;
  if (pointer === null || count === 0) return { scales: centers.map(() => 1), shifts: centers.map(() => 0), left: 0, right: base };
  const scales = centers.map((center) => swell((pointer - center) / size));
  const widths = scales.map((scale) => size * scale);
  // The spread row, laid from 0: each icon at its new width, the gaps as they were.
  const starts: number[] = [];
  let x = 0;
  for (const w of widths) {
    starts.push(x);
    x += w + gap;
  }
  // Where the pointer's spot lands in the spread row: the same fraction across its icon
  // (or its gap) as it was across the resting one.
  const slot = Math.min(count - 1, Math.max(0, Math.floor(pointer / (size + gap))));
  const into = pointer - slot * (size + gap);
  const landed = into <= size ? starts[slot] + (into / size) * widths[slot] : starts[slot] + widths[slot] + (into - size);
  const delta = pointer - landed;
  return {
    scales,
    shifts: widths.map((w, i) => starts[i] + w / 2 + delta - centers[i]),
    left: starts[0] + delta,
    right: starts[count - 1] + widths[count - 1] + delta,
  };
}
