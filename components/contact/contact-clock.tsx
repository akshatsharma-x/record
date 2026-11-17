"use client";

import { formatClock, prefersHour12, wallMinutes, workingOverlap } from "@/lib/glance";
import { useHydrated } from "@/lib/use-hydrated";
import { useNow, useVisitorTimeZone } from "@/lib/use-now";

interface ContactClockProps {
  /** Akshat's time zone, and how to name the place ("in Jaipur", or "IST"). */
  place: { label: string; timeZone: string };
  hours: { start: string; end: string };
  /** The visitor's working day, on their own clock. */
  visitorDay: { start: string; end: string };
  words: { clock: string; overlap: string; noOverlap: string };
}

const fill = (template: string, slots: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, slot: string) => slots[slot] ?? "");

/** Word joiners either side of the range's dash, so "9:00 AM–1:30 PM" wraps as one. */
const joined = ({ from, to }: { from: string; to: string }) => ({ from: `${from}\u2060`, to: `\u2060${to}` });

/**
 * A stretch of the day as the visitor's locale writes a range, split at its dash: "3:30" and
 * "6:30 PM" (the meridiem once, where both share it), or "15:30" and "18:30".
 */
export function rangeEnds(from: number, to: number, hour12: boolean, locale?: string): { from: string; to: string } {
  const at = (minutes: number) => {
    const wrapped = ((minutes % 1440) + 1440) % 1440;
    return new Date(Date.UTC(2000, 0, 1, Math.floor(wrapped / 60), wrapped % 60));
  };
  const format = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hourCycle: hour12 ? "h12" : "h23", timeZone: "UTC" });
  const [start, end] = format.formatRange(at(from), at(to)).split(/\s*[–-]\s*/);
  // Each end stays whole on a line: "9:00 AM" never breaks before its "AM".
  const whole = (text: string) => text.replace(/\s/g, "\u202f");
  return end === undefined
    ? { from: whole(formatClock(from, hour12, locale)), to: whole(formatClock(to, hour12, locale)) }
    : { from: whole(start), to: whole(end) };
}

/**
 * The close's live lines (DESIGN.md §7.9): Akshat's time and place, then how Akshat's
 * working hours meet the visitor's day: the overlap on the visitor's clock, or when a
 * message will be read. Only the browser knows the visitor's clock, so both fill in after
 * hydration, on the minute; the HTML never holds a stale time.
 */
export function ContactClock({ place, hours, visitorDay, words }: ContactClockProps) {
  const now = useNow();
  const visitorZone = useVisitorTimeZone();
  // The server and hydration write one fixed way; the visitor's locale takes over after.
  const locale = useHydrated() ? undefined : "en-US";
  if (!now || !visitorZone) return <p className="contact-clock" aria-hidden="true" />;
  const hour12 = locale ? true : prefersHour12();
  const time = formatClock(wallMinutes(place.timeZone, now), hour12, locale);
  const overlap = workingOverlap({ ...hours, timeZone: place.timeZone }, { ...visitorDay, timeZone: visitorZone }, now);
  return (
    <p className="contact-clock" data-live="">
      <span className="contact-clock-line">{fill(words.clock, { time, place: place.label })}</span>
      <span className="contact-clock-line">
        {overlap.shared ? fill(words.overlap, joined(rangeEnds(overlap.shared[0], overlap.shared[1], hour12, locale))) : words.noOverlap}
      </span>
    </p>
  );
}
