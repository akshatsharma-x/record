"use client";

import { useSyncExternalStore } from "react";
import { untilNextMinute } from "./hero.ts";

// One clock for every live value: it ticks on the minute, and again when the tab comes
// back. It's null on the server and while hydrating, so the HTML never holds a stale time.
let now: Date | null = null;
const listeners = new Set<() => void>();
let timer = 0;

function tick() {
  now = new Date();
  for (const listener of listeners) listener();
  timer = window.setTimeout(tick, untilNextMinute(Date.now()));
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    window.clearTimeout(timer);
    tick();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = new Date();
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
    () => now ?? (now = new Date()),
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
