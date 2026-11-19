"use client";

import { useSyncExternalStore } from "react";
import { dateLine } from "@/lib/hero";
import { clockTime, subscribe } from "@/lib/use-now";

interface DateLineProps {
  /** Akshat's clock: the time zone, and how to name it ("IST", or "in Jaipur"). */
  place: { label: string; timeZone: string };
  /** What shows before JavaScript, and without it: the place, never a stale time. */
  fallback: string;
  className?: string;
}

/**
 * The hero's date line, like a Lock Screen (DESIGN.md §7): Akshat's date and live time, in
 * the visitor's locale. Only the browser knows the visitor's locale and the minute, so the
 * server renders the fallback and the client fills it in after hydration.
 */
export function DateLine({ place, fallback, className }: DateLineProps) {
  const text = useSyncExternalStore(
    subscribe,
    // The site's one clock, which ticks on the minute and can be frozen (Search's "9:41").
    () => dateLine(clockTime(), place),
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
