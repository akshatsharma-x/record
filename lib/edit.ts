/**
 * "The edit" (DESIGN.md §7.4): how the scroll moves the playhead, which clip the viewer
 * shows, and playback. The scale is real time; the scroll isn't spent evenly on it. Each
 * stretch where a role or the conference is on screen gets the same dwell, and stretches
 * only the degree covers pass quickly, so a two-month internship isn't a flick of the
 * wheel. Pure: the browser passes today, and tests pin it.
 *
 * Runs under plain Node for tests: no path aliases.
 */

export const EDIT = {
  /** The scroll a role or the conference holds the viewer for, as a share of one dwell. */
  dwell: 1,
  /** Stretches only the degree covers: this much scroll per month, at most travelMax. */
  travelPerMonth: 0.03,
  travelMax: 0.5,
  /** Seconds one dwell takes to play at 1×. J and L shuttle up to the last speed. */
  playSeconds: 2.5,
  speeds: [1, 2, 4],
  /** Where the pinned edit runs: wide, tall screens, with motion. Elsewhere it's cards. */
  query: "(min-width: 1069px) and (min-height: 760px)",
} as const;

export type EditTrackId = "work" | "research" | "education" | "honors";

export interface ScrubClip {
  id: string;
  track: EditTrackId;
  lane: number;
  /** Months since year 0, fractional. */
  from: number;
  to: number;
}

export interface Stretch {
  /** The clip the viewer shows while the playhead is in this stretch. */
  id: string | null;
  from: number;
  to: number;
}

export interface Knot {
  /** Scroll progress through the pin, 0–1. */
  p: number;
  /** Months since year 0. */
  t: number;
}

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** A "YYYY-MM-DD" date as months since year 0, fractional: 2025-07-16 is the middle of July. */
export function monthsAt(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return year * 12 + (month - 1) + (day - 1) / daysIn(year, month);
}

/** Today in a time zone, as "YYYY-MM-DD". */
export function isoToday(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// Higher tracks cover lower ones, as in an editor; within a track, the upper lane does.
const PRIORITY: Record<EditTrackId, number> = { work: 3, research: 2, education: 1, honors: 0 };

/**
 * Time from `from` to `to`, cut into stretches by which clip the viewer shows: the top
 * track and lane under the playhead. Honors are markers, shown only when chosen.
 */
export function stretches(clips: readonly ScrubClip[], from: number, to: number): Stretch[] {
  const scrubbed = clips.filter((clip) => clip.track !== "honors");
  const cuts = [...new Set([from, to, ...scrubbed.flatMap((clip) => [clip.from, clip.to])])]
    .filter((t) => t >= from && t <= to)
    .sort((a, b) => a - b);
  const list: Stretch[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const middle = (cuts[i] + cuts[i + 1]) / 2;
    const top = scrubbed
      .filter((clip) => clip.from <= middle && middle < clip.to)
      .sort((a, b) => PRIORITY[b.track] - PRIORITY[a.track] || b.lane - a.lane)[0];
    const id = top?.id ?? null;
    const last = list.at(-1);
    if (last && last.id === id) last.to = cuts[i + 1];
    else list.push({ id, from: cuts[i], to: cuts[i + 1] });
  }
  return list;
}

export interface ScrubMap {
  stretches: Stretch[];
  knots: Knot[];
  /** The edit's length in dwells, which sets how long it plays. */
  dwells: number;
}

/** The mapping between scroll progress and time, with each stretch's share of the scroll. */
export function scrubMap(clips: readonly ScrubClip[], from: number, to: number): ScrubMap {
  const list = stretches(clips, from, to);
  const trackOf = new Map(clips.map((clip) => [clip.id, clip.track]));
  const weights = list.map((stretch) => {
    const track = stretch.id ? trackOf.get(stretch.id) : null;
    if (track === "work" || track === "research") return EDIT.dwell;
    return Math.min(EDIT.travelMax, (stretch.to - stretch.from) * EDIT.travelPerMonth);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const knots: Knot[] = [{ p: 0, t: from }];
  let sum = 0;
  list.forEach((stretch, i) => {
    sum += weights[i];
    knots.push({ p: sum / total, t: stretch.to });
  });
  return { stretches: list, knots, dwells: total };
}

function interpolate(knots: readonly Knot[], value: number, from: "p" | "t", to: "p" | "t"): number {
  if (value <= knots[0][from]) return knots[0][to];
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1];
    const b = knots[i];
    if (value <= b[from]) {
      const span = b[from] - a[from];
      return span === 0 ? b[to] : a[to] + ((value - a[from]) / span) * (b[to] - a[to]);
    }
  }
  return knots[knots.length - 1][to];
}

/** Where the playhead is for a scroll progress. */
export function timeAt(map: ScrubMap, p: number): number {
  return interpolate(map.knots, p, "p", "t");
}

/** The scroll progress that puts the playhead at a time. */
export function progressAt(map: ScrubMap, t: number): number {
  return interpolate(map.knots, t, "t", "p");
}

/** The clip the viewer shows at a time. */
export function activeAt(map: ScrubMap, t: number): string | null {
  const stretch = map.stretches.find((entry) => t < entry.to) ?? map.stretches.at(-1);
  return stretch?.id ?? null;
}

/**
 * Where choosing a clip puts the playhead, as scroll progress: the middle of the longest
 * stretch it shows in, or, for a honor, the middle of its year.
 */
export function targetOf(map: ScrubMap, clip: ScrubClip): number {
  const own = map.stretches.filter((stretch) => stretch.id === clip.id).sort((a, b) => b.to - b.from - (a.to - a.from))[0];
  if (own) return (progressAt(map, own.from) + progressAt(map, own.to)) / 2;
  return progressAt(map, (clip.from + clip.to) / 2);
}

/** Playback: how far the progress moves in `seconds` at a speed (negative plays backward). */
export function playStep(map: ScrubMap, p: number, speed: number, seconds: number): number {
  return Math.min(1, Math.max(0, p + (speed * seconds) / (EDIT.playSeconds * map.dwells)));
}

/** The next speed for J (backward) or L (forward), from the current one: 1×, 2×, 4×, then it holds. */
export function shuttle(current: number, direction: 1 | -1): number {
  if (Math.sign(current) !== direction) return direction * EDIT.speeds[0];
  const index = EDIT.speeds.indexOf(Math.abs(current) as (typeof EDIT.speeds)[number]);
  return direction * EDIT.speeds[Math.min(EDIT.speeds.length - 1, index + 1)];
}
