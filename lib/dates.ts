/**
 * Date helpers for content. Content dates are "YYYY-MM" (month precision) unless a fact
 * is known to the day ("YYYY-MM-DD"). All math happens on UTC calendar dates, so results
 * never depend on the machine's time zone.
 *
 * Runs under plain Node for the prebuild content check: keep imports relative with
 * explicit .ts extensions, and use `import type` for types.
 */

export interface YearMonth {
  year: number;
  /** 1–12 */
  month: number;
}

export interface CalendarDate extends YearMonth {
  day: number;
}

export function parseYearMonth(value: string): YearMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Not a YYYY-MM date: "${value}"`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function parseIsoDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Not a YYYY-MM-DD date: "${value}"`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Months since year 0, so two dates can be subtracted. */
export function monthIndex({ year, month }: YearMonth): number {
  return year * 12 + (month - 1);
}

/** Whole calendar months from start through end, counting both: Jul–Aug is 2. */
export function monthsInclusive(start: YearMonth, end: YearMonth): number {
  return monthIndex(end) - monthIndex(start) + 1;
}

export function utcDate(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** The first day after a month-precision date ends: the exclusive end of "2026-07" is Aug 1. */
export function endOfMonthExclusive({ year, month }: YearMonth): Date {
  return utcDate(year, month + 1, 1);
}

/** The calendar date at `at` in a time zone, such as Akshat's Asia/Kolkata. */
export function calendarDateIn(timeZone: string, at: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}

const MS_PER_DAY = 86_400_000;

/** Whole days from a to b (both UTC midnights, so there are no DST surprises). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-06" → "Jun 2026", or "June 2026" with the long month */
export function formatYearMonth(value: string, locale = "en-US", month: "short" | "long" = "short"): string {
  const { year, month: m } = parseYearMonth(value);
  return new Intl.DateTimeFormat(locale, {
    month,
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(year, m));
}

/** "2026-04-28" → "28 Apr 2026" */
export function formatIsoDate(value: string, locale = "en-GB"): string {
  const { year, month, day } = parseIsoDate(value);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(year, month, day));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A span of months as a résumé writes it: "Jul–Aug 2025", "Dec 2025 – Jan 2026",
 * "Jun 2026 – present", or "Jun 2026" for one month.
 */
export function formatMonthRange(start: string, end: string): string {
  const from = parseYearMonth(start);
  if (end === "present") return `${MONTHS[from.month - 1]} ${from.year} – present`;
  const to = parseYearMonth(end);
  if (from.year === to.year && from.month === to.month) return `${MONTHS[from.month - 1]} ${from.year}`;
  if (from.year === to.year) return `${MONTHS[from.month - 1]}–${MONTHS[to.month - 1]} ${to.year}`;
  return `${MONTHS[from.month - 1]} ${from.year} – ${MONTHS[to.month - 1]} ${to.year}`;
}

/** A span of days: "28–29 Apr 2026", "30 Apr – 1 May 2026", or one day. */
export function formatDayRange(start: string, end: string): string {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (start === end) return `${from.day} ${MONTHS[from.month - 1]} ${from.year}`;
  if (from.year === to.year && from.month === to.month) return `${from.day}–${to.day} ${MONTHS[to.month - 1]} ${to.year}`;
  if (from.year === to.year) return `${from.day} ${MONTHS[from.month - 1]} – ${to.day} ${MONTHS[to.month - 1]} ${to.year}`;
  return `${from.day} ${MONTHS[from.month - 1]} ${from.year} – ${to.day} ${MONTHS[to.month - 1]} ${to.year}`;
}
