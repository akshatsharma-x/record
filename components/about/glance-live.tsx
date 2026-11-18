"use client";

import { type CSSProperties, useState, useSyncExternalStore } from "react";
import {
  clockHands,
  degreeProgress,
  formatClock,
  hoursLabel,
  minutesOf,
  monthsLabel,
  monthsSince,
  prefersHour12,
  wallMinutes,
  workingOverlap,
} from "@/lib/glance";
import { glanceFlips } from "@/lib/surprises/glance-flips";
import { useHydrated } from "@/lib/use-hydrated";
import { useNow, useVisitorTimeZone } from "@/lib/use-now";

/**
 * The At-a-glance tiles that depend on today (DESIGN.md §7, Part 6). Each renders its
 * facts on the server and fills in the live part after hydration, from lib/glance.ts, so
 * the static HTML never holds a stale number and the tile's size never changes.
 */

/** " · 6 months": how long the current role has run. */
export function LiveMonths({ since, timeZone }: { since: string; timeZone: string }) {
  const now = useNow();
  if (!now) return null;
  return <span data-live="">{` · ${monthsLabel(monthsSince(since, timeZone, now))}`}</span>;
}

// ─── Studying ────────────────────────────────────────────────────────────────

interface StudyingProps {
  label: string;
  degree: string;
  field: string;
  institution: string;
  start: string;
  end: string;
  endLabel: string;
  timeZone: string;
}

/** The degree's progress as a ring. Clicking flips it to the days left. */
export function StudyingTile({ label, degree, field, institution, start, end, endLabel, timeZone }: StudyingProps) {
  const now = useNow();
  const [flipped, setFlipped] = useState(false);
  const progress = now ? degreeProgress(start, end, timeZone, now) : null;
  const days = progress?.daysToGraduationMonth ?? null;
  // The flip is a surprise with its own flag; without it the tile is just the ring.
  const Flip = glanceFlips.on ? "button" : "div";

  return (
    <Flip
      {...(glanceFlips.on ? { type: "button" as const, onClick: () => setFlipped((value) => !value) } : {})}
      className="glance-flip"
      data-flipped={flipped || undefined}
    >
      <span className="glance-face" data-face="front" aria-hidden={flipped || undefined}>
        <span className="glance-label">{label}</span>{" "}
        <span className="glance-ring" style={{ "--ring": progress ? progress.percent : 0 } as CSSProperties}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle className="glance-ring-track" cx="24" cy="24" r="20" pathLength="100" />
            {progress ? <circle className="glance-ring-arc" cx="24" cy="24" r="20" pathLength="100" /> : null}
          </svg>
          <span className="glance-ring-label" data-live={progress ? "" : undefined}>
            {progress ? `${progress.percent}%` : end.slice(0, 4)}
          </span>
        </span>{" "}
        <span className="glance-detail">
          {degree} {field}
        </span>{" "}
        <span className="glance-meta">{institution}</span>
        {days !== null && glanceFlips.on ? <span className="sr-only"> Show the days to graduation</span> : null}
      </span>
      <span className="glance-face" data-face="back" aria-hidden={!flipped || undefined}>
        <span className="glance-label">{label}</span>{" "}
        <span className="glance-figure" data-live="">
          {days ?? ""}
        </span>{" "}
        <span className="glance-detail">{days === 1 ? "day to graduation" : "days to graduation"}</span>{" "}
        <span className="glance-meta">{endLabel}</span>
        <span className="sr-only">Show the progress</span>
      </span>
    </Flip>
  );
}

// ─── Local time ──────────────────────────────────────────────────────────────

const noop = () => () => {};

/** Whether the visitor's locale writes a 12-hour clock. The server assumes it does. */
function useLocaleHour12(): boolean {
  return useSyncExternalStore(noop, () => prefersHour12(), () => true);
}

function ClockFace({ minutes }: { minutes: number | null }) {
  const hands = minutes === null ? null : clockHands(minutes);
  return (
    <span
      className="glance-clock"
      data-live={hands ? "" : undefined}
      style={hands ? ({ "--hour": `${hands.hour}deg`, "--minute": `${hands.minute}deg` } as CSSProperties) : undefined}
    >
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle className="glance-clock-face" cx="24" cy="24" r="22" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} className="glance-clock-tick" x1="24" y1="4.5" x2="24" y2={i % 3 === 0 ? "8" : "6.5"} transform={`rotate(${i * 30} 24 24)`} />
        ))}
        {hands ? (
          <>
            <line className="glance-clock-hand" data-hand="hour" x1="24" y1="24" x2="24" y2="13" />
            <line className="glance-clock-hand" data-hand="minute" x1="24" y1="24" x2="24" y2="8" />
            <circle className="glance-clock-pin" cx="24" cy="24" r="1.6" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

/** A 24-hour track on the visitor's clock: Akshat's hours, the visitor's day, and what they share. */
function OverlapTrack({ theirs, yours, shared }: { theirs: [number, number]; yours: [number, number]; shared: [number, number] | null }) {
  // A stretch past midnight wraps onto the start of the track.
  const pieces = (range: [number, number]) =>
    [range, [range[0] - 1440, range[1] - 1440] as [number, number]]
      .map(([from, to]) => [Math.max(0, from), Math.min(1440, to)] as const)
      .filter(([from, to]) => to > from);
  const bar = (kind: string, range: [number, number]) =>
    pieces(range).map(([from, to]) => (
      <span
        key={`${kind}-${from}`}
        className="glance-track-bar"
        data-kind={kind}
        style={{ "--from": from / 1440, "--to": to / 1440 } as CSSProperties}
      />
    ));
  return (
    <span className="glance-track" aria-hidden="true">
      {bar("theirs", theirs)}
      {bar("yours", yours)}
      {shared ? bar("shared", shared) : null}
    </span>
  );
}

interface TimeProps {
  label: string;
  timeZone: string;
  zoneLabel: string;
  hours: { start: string; end: string };
  visitorDay: { start: string; end: string };
}

/** Akshat's live clock and working hours. Clicking switches 12- and 24-hour time and shows the overlap with the visitor's day. */
export function TimeTile({ label, timeZone, zoneLabel, hours, visitorDay }: TimeProps) {
  const now = useNow();
  const visitorZone = useVisitorTimeZone();
  const localeHour12 = useLocaleHour12();
  // The server and hydration write times one fixed way; the visitor's own locale takes
  // over after hydration, so the HTML always matches what React hydrates.
  const locale = useHydrated() ? undefined : "en-US";
  const [flipped, setFlipped] = useState(false);
  const hour12 = flipped ? !localeHour12 : localeHour12;

  const minutes = now ? wallMinutes(timeZone, now) : null;
  const clock = (value: string) => formatClock(minutesOf(value), hour12, locale);
  const span = `${clock(hours.start)}–${clock(hours.end)} ${zoneLabel}`;
  const overlap = now && visitorZone ? workingOverlap({ ...hours, timeZone }, { ...visitorDay, timeZone: visitorZone }, now) : null;
  const yourDay = `${clock(visitorDay.start)}–${clock(visitorDay.end)}`;

  const Flip = glanceFlips.on ? "button" : "div";
  return (
    <Flip
      {...(glanceFlips.on ? { type: "button" as const, onClick: () => setFlipped((value) => !value) } : {})}
      className="glance-flip"
      data-flipped={flipped || undefined}
    >
      <span className="glance-time">
        <ClockFace minutes={minutes} />
        <span className="glance-time-text">
          <span className="glance-label">{label}</span>{" "}
          <span className="glance-value" data-live={minutes !== null ? "" : undefined}>
            {minutes !== null ? (
              <>
                {formatClock(minutes, hour12, locale)} <span className="glance-zone">{zoneLabel}</span>
              </>
            ) : (
              zoneLabel
            )}
          </span>{" "}
          <span className="glance-detail">Working hours {span}</span>
          {overlap && flipped ? (
            <span className="glance-overlap" data-live="">
              <OverlapTrack {...overlap} />
              <span className="glance-meta">
                {overlap.shared
                  ? `Overlaps your ${yourDay} for ${hoursLabel(overlap.minutes)}: ${formatClock(overlap.shared[0], hour12, locale)}–${formatClock(overlap.shared[1], hour12, locale)} your time`
                  : `No overlap with your ${yourDay}: Akshat works ${formatClock(overlap.theirs[0], hour12, locale)}–${formatClock(overlap.theirs[1], hour12, locale)} your time`}
              </span>
            </span>
          ) : null}
          {overlap && glanceFlips.on ? (
            <span className="sr-only"> {flipped ? `Show ${localeHour12 ? "12" : "24"}-hour time` : "Show the overlap with your day"}</span>
          ) : null}
        </span>
      </span>
    </Flip>
  );
}
