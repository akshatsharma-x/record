"use client";

import { useSyncExternalStore } from "react";
import { dateLine, untilNextMinute } from "@/lib/hero";

interface DateLineProps {
  /** Akshat's clock: the time zone, and how to name it ("IST", or "in Jaipur"). */
  place: { label: string; timeZone: string };
  /** What shows before JavaScript, and without it: the place, never a stale time. */
  fallback: string;
  className?: string;
}

/** Ticks on the minute, and again when the tab comes back. */
function subscribe(onChange: () => void): () => void {
  let timer = 0;
  const tick = () => {
    onChange();
    timer = window.setTimeout(tick, untilNextMinute(Date.now()));
  };
  timer = window.setTimeout(tick, untilNextMinute(Date.now()));
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * The hero's date line, like a Lock Screen (DESIGN.md §7): today's date where the visitor
 * is, in their locale, then Akshat's live time. Only the browser knows the visitor's day,
 * so the server renders the fallback and the client fills it in after hydration.
 */
export function DateLine({ place, fallback, className }: DateLineProps) {
  const text = useSyncExternalStore(
    subscribe,
    () => dateLine(new Date(), place),
    () => null,
  );
  // Two keyed spans, so the live line arrives as new content: rewriting the fallback's
  // own text in place would count as that text moving (a layout shift).
  return (
    <p className={className} data-live={text ? "" : undefined}>
      {text ? <span key="live">{text}</span> : <span key="fallback">{fallback}</span>}
    </p>
  );
}
