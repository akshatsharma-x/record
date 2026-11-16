/**
 * The research chapters' illustrations (DESIGN.md §7.5): the idea of each paper drawn,
 * never its results. Every shape here is illustrative, is labeled so on the page, and is
 * never shown as a number. Pure: the components draw it, the tests pin it.
 */

export const RESEARCH = {
  /** Where the chapters pin: desktop screens tall enough for a chapter, with motion. */
  query: "(min-width: 1069px) and (min-height: 760px)",
  /** The share of a chapter's pin its illustration takes to play through; then it holds. */
  playShare: 0.75,
} as const;

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const round = (value: number) => Math.round(value * 100) / 100;

/** How far a chapter's illustration has played, 0–1, at a scroll progress through its pin. */
export function playAt(progress: number): number {
  return clamp(progress / RESEARCH.playShare);
}

// ─── The cold chain ──────────────────────────────────────────────────────────

export const CHAIN = {
  view: { width: 600, height: 440 },
  /** Where the illustrative temperature excursion happens, along the route (0–1). */
  excursion: 0.56,
  /** The route band and the temperature trace's band, in view units. */
  route: { left: 70, right: 530, top: 116, bottom: 176 },
  trace: { top: 296, bottom: 396, safeTop: 330, safeBottom: 366 },
} as const;

export interface ChainStop {
  /** Where it sits along the route, 0–1. */
  at: number;
  x: number;
  y: number;
  /** Illustrative risk, 0–1, drawn as a dial's needle. */
  risk: number;
  /** Illustrative attribution to each factor, summing to 1, drawn as bars. */
  attribution: number[];
}

/** How strongly the excursion bears on a point along the route: none before it, most just after. */
const excursionImpact = (u: number) => smoothstep(CHAIN.excursion - 0.12, CHAIN.excursion + 0.04, u) * (1 - 0.3 * clamp(u - CHAIN.excursion));

/**
 * The route's stops, evenly along it, rising and falling like a road. Their risk grows
 * with time on the road and jumps after the excursion. The first factor is the
 * excursion's, the second grows with time, and the rest share what's left; content lists
 * the factors in that order.
 */
export function chainStops(count: number, factors: number): ChainStop[] {
  const { left, right, top, bottom } = CHAIN.route;
  return Array.from({ length: count }, (_, i) => {
    const at = count === 1 ? 0 : i / (count - 1);
    const impact = excursionImpact(at);
    const weights = Array.from({ length: factors }, (_, j) => (j === 0 ? 0.12 + 0.75 * impact : j === 1 ? 0.25 + 0.35 * at : 0.1 + 0.04 * j));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return {
      at,
      x: round(left + at * (right - left)),
      y: i % 2 === 0 ? bottom : top,
      risk: round(clamp(0.12 + 0.22 * at + 0.55 * impact)),
      attribution: weights.map((weight) => round(weight / total)),
    };
  });
}

/** A smooth path through points (Catmull–Rom as cubic Béziers), written "x,y". */
export function smoothPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const p = (point: { x: number; y: number }) => `${round(point.x)},${round(point.y)}`;
  let d = `M${p(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i - 1] ?? points[i];
    const b = points[i];
    const c = points[i + 1];
    const e = points[i + 2] ?? c;
    const c1 = { x: b.x + (c.x - a.x) / 6, y: b.y + (c.y - a.y) / 6 };
    const c2 = { x: c.x - (e.x - b.x) / 6, y: c.y - (e.y - b.y) / 6 };
    d += `C${p(c1)} ${p(c2)} ${p(c)}`;
  }
  return d;
}

/** The illustrative temperature along the route, 0–1 of the trace's height: in the safe range but for the excursion. */
export function temperatureAt(u: number): number {
  const ripple = 0.05 * Math.sin(u * 19) + 0.03 * Math.sin(u * 7 + 1);
  const bump = Math.exp(-(((u - CHAIN.excursion) / 0.06) ** 2));
  return clamp(0.42 + ripple + 0.5 * bump);
}

/** The trace as points in view units, from the route's start to `until` (0–1). */
export function tracePoints(until = 1, samples = 60): { x: number; y: number }[] {
  const { left, right } = CHAIN.route;
  const { top, bottom } = CHAIN.trace;
  return Array.from({ length: samples + 1 }, (_, i) => {
    const u = (i / samples) * until;
    return { x: left + u * (right - left), y: bottom - temperatureAt(u) * (bottom - top) };
  });
}

/** The tap-to-step sequence: each stop in turn, then the whole chain again (the final frame). */
export function nextStop(current: number | null, count: number): number | null {
  if (current === null) return 0;
  return current + 1 < count ? current + 1 : null;
}

// ─── The haze ────────────────────────────────────────────────────────────────

export const HAZE = {
  /** "Now" on the time axis (0–1); the forecast runs from here to the horizon. */
  now: 0.55,
  horizon: 1,
  /** The tap-to-step positions after "now", as shares of the forecast. */
  steps: [0, 1 / 3, 2 / 3, 1],
  /** The city scene and the chart under it, in view units. */
  scene: { width: 600, height: 260 },
  chart: { width: 600, height: 160, left: 24, right: 576, top: 26, bottom: 126, axis: 136 },
} as const;

/** The illustrative fine-particle level over time, 0–1: clear now, an episode ahead, easing by the horizon. */
export function levelAt(x: number): number {
  const base = 0.32 + 0.08 * Math.sin(x * 9) + 0.05 * Math.sin(x * 23 + 2);
  const episode = 0.5 * Math.exp(-(((x - 0.82) / 0.15) ** 2));
  return clamp(base + episode);
}

/** How thick the haze looks at a level: clear below a quarter, thickest toward the top. */
export function hazeDensity(level: number): number {
  return smoothstep(0.25, 0.85, level);
}

/** The uncertainty band's half-width at x: none up to now, widening toward the horizon. */
export function bandAt(x: number): number {
  if (x <= HAZE.now) return 0;
  const reach = (x - HAZE.now) / (HAZE.horizon - HAZE.now);
  return 0.02 + 0.22 * reach ** 1.3;
}

const pair = (x: number, y: number) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;

/** A time (0–1) across the chart, in view units. */
export const hazeX = (time: number) => HAZE.chart.left + time * (HAZE.chart.right - HAZE.chart.left);

/** A level (0–1) up the chart, in view units: in its middle band, so a peak's uncertainty still fits. */
export const hazeY = (level: number) => HAZE.chart.bottom - (0.08 + 0.72 * level) * (HAZE.chart.bottom - HAZE.chart.top);

/** The level from one time to another as "x,y" points, or the band's edge when offset is ±1. */
export function hazeLine(from: number, to: number, offset = 0, samples = 60): string[] {
  const count = Math.max(2, Math.round(samples * (to - from)));
  return Array.from({ length: count + 1 }, (_, i) => {
    const time = from + ((to - from) * i) / count;
    return pair(hazeX(time), hazeY(levelAt(time) + offset * bandAt(time)));
  });
}

/** The forecast's shapes at a reach: its line and its band, empty at now. */
export function forecastPaths(time: number): { ahead: string; band: string } {
  if (time <= HAZE.now) return { ahead: "", band: "" };
  const upper = hazeLine(HAZE.now, time, 1);
  const lower = hazeLine(HAZE.now, time, -1).reverse();
  return { ahead: `M${hazeLine(HAZE.now, time).join("L")}`, band: `M${upper.join("L")}L${lower.join("L")}Z` };
}

/** Where the "Forecast" label sits, and whether there's room for it yet. */
export function forecastLabel(time: number): { x: number; shown: boolean } {
  const share = (time - HAZE.now) / (HAZE.horizon - HAZE.now);
  return { x: (hazeX(HAZE.now) + hazeX(time)) / 2, shown: share > 0.3 };
}

/** The handle's time for a step (0 is now, the last is the horizon). */
export function stepTime(step: number): number {
  const share = HAZE.steps[clamp(step, 0, HAZE.steps.length - 1)];
  return HAZE.now + share * (HAZE.horizon - HAZE.now);
}

/** Where scrolling puts the handle as a chapter plays: from now to the horizon. */
export function handleAt(play: number): number {
  return HAZE.now + smoothstep(0.1, 1, play) * (HAZE.horizon - HAZE.now);
}

/** The forecast's words for a time, for the handle's screen-reader value. */
export function timeWords(x: number): string {
  const reach = (x - HAZE.now) / (HAZE.horizon - HAZE.now);
  if (reach <= 0.02) return "Now";
  if (reach < 0.5) return "A little ahead";
  if (reach < 0.98) return "Further ahead";
  return "As far ahead as the forecast reaches";
}

export interface Particle {
  /** Position in the scene, 0–1 of its width and height. */
  x: number;
  y: number;
  /** Radius, as a share of the scene's height. */
  r: number;
  /** The density at which it appears: lower comes first, so the haze thickens evenly. */
  threshold: number;
}

/** A seeded field of haze particles, densest near the ground. */
export function particles(count: number, seed = 20260428): Particle[] {
  let value = seed;
  const random = () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
  return Array.from({ length: count }, () => {
    const height = random();
    return {
      x: random(),
      // Squared toward the bottom: haze sits low over a city.
      y: 1 - height * height * 0.85,
      r: 0.08 + random() * 0.14,
      threshold: random(),
    };
  });
}

/** How visible a particle is at a density (0–1): it fades in over a short span around its threshold. */
export function particleAlpha(particle: Particle, density: number): number {
  return smoothstep(particle.threshold - 0.1, particle.threshold + 0.1, density * 1.15);
}

/** The city's buildings, seeded, as rectangles in view units along the bottom of the scene. */
export function skyline(width: number, height: number, seed = 20260429): { x: number; y: number; w: number; h: number }[] {
  let value = seed;
  const random = () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
  const buildings: { x: number; y: number; w: number; h: number }[] = [];
  let x = 0;
  while (x < width) {
    const w = round(width * (0.035 + random() * 0.05));
    const tall = random() > 0.82;
    const h = round(height * (tall ? 0.42 + random() * 0.2 : 0.14 + random() * 0.2));
    buildings.push({ x: round(x), y: round(height - h), w, h });
    x += w + round(width * random() * 0.008);
  }
  return buildings;
}
