"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { APERTURE, apertureBlur, apertureIndex, formatStop } from "@/lib/hero";

// The setting lasts for the session. The head script applies it before paint too.
let stored: number | null = null;
const listeners = new Set<() => void>();
function read(): number {
  if (stored === null) {
    try {
      stored = apertureIndex(sessionStorage.getItem(APERTURE.storageKey) ?? APERTURE.initial);
    } catch {
      stored = APERTURE.initial;
    }
  }
  return stored;
}
function write(index: number) {
  stored = apertureIndex(index);
  try {
    sessionStorage.setItem(APERTURE.storageKey, String(stored));
  } catch {
    // Storage off: it lasts for this page.
  }
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A cursive ƒ, drawn rather than typed: set in the serif, this one glyph cost Chrome two
 * italic font files (237KB) before the first paint.
 */
function ApertureGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="aperture-glyph"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.5 4.8c-1-.9-3.2-1-4.2.6-1.6 2.6-2 9-3.1 12.4-.8 2.5-2.7 3.1-4.7 2.2" />
      <path d="M8.6 10.2h7.2" />
    </svg>
  );
}

/**
 * The aperture dial (a surprise, DESIGN.md §7): a small ƒ button opens a dial of full
 * stops from ƒ1.4 to ƒ16 that sets the background's blur live, like Portrait mode's
 * depth control. A real range input, so keys and screen readers work: "ƒ2.8".
 */
export function Aperture({ target }: { target: string }) {
  const dialId = useId();
  const [open, setOpen] = useState(false);
  const index = useSyncExternalStore(subscribe, read, () => APERTURE.initial);

  useEffect(() => {
    document.getElementById(target)?.style.setProperty("--aperture-blur", `${apertureBlur(index)}px`);
  }, [index, target]);

  return (
    <div className="aperture" data-open={open || undefined}>
      <button
        type="button"
        className="aperture-button"
        aria-expanded={open}
        aria-controls={dialId}
        onClick={() => setOpen((value) => !value)}
      >
        <ApertureGlyph />
        <span className="sr-only">Aperture</span>
      </button>
      <div id={dialId} className="aperture-dial" hidden={!open}>
        {/* Not a <label>: that would make the whole face a button to the cursor. */}
        <div className="aperture-label">
          <span className="aperture-value" aria-hidden="true">
            {formatStop(index)}
          </span>
          <input
            type="range"
            aria-label="Aperture"
            className="aperture-range"
            min={0}
            max={APERTURE.stops.length - 1}
            step={1}
            value={index}
            aria-valuetext={formatStop(index)}
            onChange={(event) => write(Number(event.currentTarget.value))}
          />
        </div>
        <span className="aperture-scale" aria-hidden="true">
          {APERTURE.stops.map((stop) => (
            <span key={stop}>{stop}</span>
          ))}
        </span>
      </div>
    </div>
  );
}
