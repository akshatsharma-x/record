"use client";

import { useSyncExternalStore } from "react";
import { untilNextMinute } from "./hero.ts";

// One clock for every live value: it ticks on the minute, and again when the tab comes
// back. It's null on the server and while hydrating, so the HTML never holds a stale time.
let now: Date | null = null;
const listeners = new Set<() => void>();
let timer = 0;

// Search's "9:41" (DESIGN.md §8): for a few seconds, every clock reads a time of its choosing.
let frozen: { at: Date; until: number } | null = null;
let thaw = 0;

/** What every clock on the site shows right now: the time, or the frozen one. */
export function clockTime(): Date {
  return frozen && Date.now() < frozen.until ? frozen.at : new Date();
}

function announce() {
  now = clockTime();
  for (const listener of listeners) listener();
}

/** Every clock shows `at` for `ms`, then the time again. */
export function freezeClocks(at: Date, ms: number): void {
  window.clearTimeout(thaw);
  frozen = { at, until: Date.now() + ms };
  announce();
  thaw = window.setTimeout(() => {
    frozen = null;
    announce();
  }, ms);
}

function tick() {
  now = clockTime();
  for (const listener of listeners) listener();
  timer = window.setTimeout(tick, untilNextMinute(Date.now()));
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    window.clearTimeout(timer);
    tick();
  }
}

/** Hears every tick, and every freeze and thaw. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = clockTime();
    timer = window.setTimeout(tick, untilNextMinute(Date.now()));
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

/** The current time, to the minute, in the browser only. */
export function useNow(): Date | null {
  return useSyncExternalStore(
    subscribe,
    () => now ?? (now = clockTime()),
    () => null,
  );
}

const noop = () => () => {};

/** The visitor's own time zone, in the browser only. */
export function useVisitorTimeZone(): string | null {
  return useSyncExternalStore(
    noop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}
