/**
 * The At-a-glance tiles' live values (DESIGN.md §7, Part 6): how long the current role has
 * run, how far the degree has come, Akshat's clock, and how Akshat's working hours overlap
 * the visitor's day. The browser computes them from the facts content/derive.ts gives it,
 * so the page stays static and content never ships to the client. Pure: tests pin `now`.
 *
 * Runs under plain Node too (content/derive.ts uses it): relative imports with .ts
 * extensions, no path aliases.
 */
import { calendarDateIn, daysBetween, monthIndex, monthsInclusive, parseYearMonth, utcDate } from "./dates.ts";

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// ─── Durations ───────────────────────────────────────────────────────────────

/** A role's length so far in calendar months, counting the month it began: Jun–Nov is 6. */
export function monthsSince(start: string, timeZone: string, now: Date): number {
  return Math.max(0, monthsInclusive(parseYearMonth(start), calendarDateIn(timeZone, now)));
}

/** "6 months", "1 year", "2 years 3 months". */
export function monthsLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${rest === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

// ─── Degree progress ─────────────────────────────────────────────────────────

/**
 * Degree progress from the first day of the start month to the first day of the
 * graduation month, measured against today where Akshat is. Content knows the month,
 * not the day, so the days count to the graduation month.
 */
export function degreeProgress(start: string, end: string, timeZone: string, now: Date) {
  const today = calendarDateIn(timeZone, now);
  const todayDate = utcDate(today.year, today.month, today.day);
  const from = parseYearMonth(start);
  const to = parseYearMonth(end);
  const startDate = utcDate(from.year, from.month);
  const endDate = utcDate(to.year, to.month);
  const progress = clamp(daysBetween(startDate, todayDate) / daysBetween(startDate, endDate), 0, 1);
  return {
    progress,
    /** Rounded down, so it never overstates. */
    percent: Math.floor(progress * 100),
    monthsRemaining: Math.max(0, monthIndex(to) - monthIndex(today)),
    daysToGraduationMonth: Math.max(0, daysBetween(todayDate, endDate)),
    graduated: todayDate >= endDate,
  };
}

// ─── Clocks ──────────────────────────────────────────────────────────────────

/** Minutes after midnight of a "HH:MM" time. */
export function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** The wall-clock time in a time zone, as minutes after midnight. */
export function wallMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return part("hour") * 60 + part("minute");
}

/** How far a time zone is ahead of UTC at an instant, in minutes (India is 330, Auckland in November 780). */
export function zoneOffset(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  const instant = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), at.getUTCHours(), at.getUTCMinutes());
  return Math.round((wall - instant) / 60_000);
}

/** A clock face's hands for a time, in degrees from 12. */
export function clockHands(minutes: number): { hour: number; minute: number } {
  return { hour: ((minutes % 720) / 720) * 360, minute: ((minutes % 60) / 60) * 360 };
}

/** "9:41 PM" or "21:41", for minutes after midnight. */
export function formatClock(minutes: number, hour12: boolean, locale?: string): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const at = new Date(Date.UTC(2000, 0, 1, Math.floor(wrapped / 60), wrapped % 60));
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hourCycle: hour12 ? "h12" : "h23", timeZone: "UTC" }).format(at);
}

/** Whether a locale writes the time on a 12-hour clock. */
export function prefersHour12(locale?: string): boolean {
  const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
  return cycle === "h11" || cycle === "h12";
}

// ─── Overlap ─────────────────────────────────────────────────────────────────

export interface Overlap {
  /** How long both days share, in minutes. */
  minutes: number;
  /** Akshat's working hours on the visitor's clock (minutes after midnight; the end may pass 1440). */
  theirs: [number, number];
  /** The visitor's day on the visitor's clock. */
  yours: [number, number];
  /** The shared stretch on the visitor's clock, if any. */
  shared: [number, number] | null;
}

/**
 * How Akshat's working hours overlap the visitor's working day, today, on the visitor's
 * clock. Both days are placed on one timeline, trying the visitor's day a day either side
 * as well, since time zones can push one past midnight.
 */
export function workingOverlap(
  hours: { start: string; end: string; timeZone: string },
  day: { start: string; end: string; timeZone: string },
  now: Date,
): Overlap {
  const shift = zoneOffset(day.timeZone, now) - zoneOffset(hours.timeZone, now);
  const theirs: [number, number] = [minutesOf(hours.start) + shift, minutesOf(hours.end) + shift];
  const normalized = theirs[0] < 0 ? 1440 : theirs[0] >= 1440 ? -1440 : 0;
  theirs[0] += normalized;
  theirs[1] += normalized;
  const yours: [number, number] = [minutesOf(day.start), minutesOf(day.end)];
  let shared: [number, number] | null = null;
  for (const offset of [-1440, 0, 1440]) {
    const start = Math.max(theirs[0], yours[0] + offset);
    const end = Math.min(theirs[1], yours[1] + offset);
    if (end > start && (!shared || end - start > shared[1] - shared[0])) shared = [start - offset, end - offset];
  }
  return { minutes: shared ? shared[1] - shared[0] : 0, theirs, yours, shared };
}

/** "3 h 30 min", "7 h", "45 min". */
export function hoursLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
