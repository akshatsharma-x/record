/**
 * The hero's numbers and pure logic (DESIGN.md §7, Part 5). Its CSS twins live in
 * styles/tokens.css (--hero-*, --portrait-*); tests/unit/hero.test.ts keeps them in step.
 */

export const HERO = {
  /** A tilt of this many degrees reaches the full parallax on phones. The distances are tokens. */
  tiltRange: 20,
  /** How often the light field rechecks the visitor's hour (ms). */
  warmthRefresh: 10 * 60_000,
  /**
   * The glint across the name (Part 19), in the name's widths: 0 at its left edge, 1 at its
   * right. It rests off to the right (--hero-glint-x's initial value in styles/tokens.css),
   * and under a mouse follows the pointer, as far off either side as its band is wide.
   */
  glint: { parked: 1.6, min: -0.6, max: 1.6 },
  /**
   * How far the scroll-out runs (--hero-out 0 → 1), in the hero's heights (Part 19): it's
   * done by the time 60% of the hero has gone, so the tilt and the recede play while most
   * of it is still on screen.
   */
  outReach: 0.6,
  /**
   * Image slots for the portrait's layers: a full-height 3:4 frame from tablets up, the
   * full width on phones. The plate is always blurred, so it comes at half resolution:
   * fewer bytes, and too soft to compete with the subject for LCP.
   */
  sizes: { frame: "(min-width: 735px) 75svh, 100vw", plate: "(min-width: 735px) 38svh, 50vw", backdrop: "10vw" },
} as const;

// ─── The aperture dial ───────────────────────────────────────────────────────

/** Full stops, like an aperture ring, and the background blur each one gives (px). */
export const APERTURE = {
  stops: [1.4, 2, 2.8, 4, 5.6, 8, 11, 16],
  blur: [24, 16, 12, 8, 6, 4, 3, 2],
  /** ƒ4: the 8px the arrival settles on. */
  initial: 3,
  storageKey: "classyfolio:aperture",
} as const;

/** A stored or chosen stop, or the first setting for anything else (null and "" included). */
export function apertureIndex(value: unknown): number {
  const index = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isInteger(index) && index >= 0 && index < APERTURE.stops.length ? index : APERTURE.initial;
}

/** "ƒ2.8", as a camera writes it. */
export function formatStop(index: number): string {
  return `ƒ${APERTURE.stops[apertureIndex(index)]}`;
}

export function apertureBlur(index: number): number {
  return APERTURE.blur[apertureIndex(index)];
}

// ─── Clocks ──────────────────────────────────────────────────────────────────

/** Milliseconds until the next minute begins, so a clock ticks on the minute. */
export function untilNextMinute(now: number): number {
  return 60_000 - (now % 60_000);
}

// ─── The light field's warmth ────────────────────────────────────────────────

export type Light = "dawn" | "noon" | "dusk" | "night";

/** Hours of the visitor's day and the light at each; between keys, the light blends. */
const KEYS: readonly [hour: number, light: Light][] = [
  [0, "night"],
  [5, "night"],
  [7, "dawn"],
  [11, "noon"],
  [16, "noon"],
  [19, "dusk"],
  [21, "night"],
  [24, "night"],
];

/** Warm at dawn, neutral at noon, saffron at dusk, indigo at night: which two lights to mix, and how far. */
export function warmthAt(hours: number): { from: Light; to: Light; mix: number } {
  const h = ((hours % 24) + 24) % 24;
  for (let i = 1; i < KEYS.length; i++) {
    const [end, to] = KEYS[i];
    const [start, from] = KEYS[i - 1];
    if (h <= end) return { from, to, mix: end === start ? 0 : (h - start) / (end - start) };
  }
  return { from: "night", to: "night", mix: 0 };
}
