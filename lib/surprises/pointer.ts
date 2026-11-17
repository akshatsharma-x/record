/**
 * Where the pointer last was, for surprises that start from it (Search's "clarity"). One
 * passive listener, installed once by Search; the middle of the screen until it moves.
 */
let last: { x: number; y: number } | null = null;
let tracking = false;

export function trackPointer(): void {
  if (tracking || typeof window === "undefined") return;
  tracking = true;
  window.addEventListener(
    "pointermove",
    (event) => {
      last = { x: event.clientX, y: event.clientY };
    },
    { passive: true },
  );
}

export function lastPointer(): { x: number; y: number } {
  return last ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}
