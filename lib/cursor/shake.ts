import { CURSOR } from "./config.ts";

interface Point {
  x: number;
  t: number;
}

/**
 * Detects a shake, as on macOS: enough fast horizontal direction reversals inside a short
 * window. Pure: feed it x positions with timestamps in milliseconds.
 */
export function createShakeDetector(options = CURSOR.shake) {
  let previous: Point | null = null;
  /** Where the current stroke began: the last reversal, or the end of the last pause. */
  let start: Point | null = null;
  let direction = 0;
  const reversals: number[] = [];

  return {
    /** Returns true once, when a shake completes. */
    push(x: number, t: number): boolean {
      if (!previous || !start || t - previous.t > options.pauseMs) {
        // First point, or the pointer rested: a new stroke starts here.
        previous = { x, t };
        start = { x, t };
        direction = 0;
        return false;
      }
      const dx = x - previous.x;
      if (dx === 0) {
        previous = { x, t };
        return false;
      }
      const heading = Math.sign(dx);
      if (direction !== 0 && heading !== direction) {
        // The stroke that just ended counts if it was long and fast enough.
        const travel = Math.abs(previous.x - start.x);
        const time = Math.max(1, previous.t - start.t);
        if (travel >= options.minTravel && travel / time >= options.minSpeed) reversals.push(t);
        start = previous;
      }
      direction = heading;
      previous = { x, t };
      while (reversals.length > 0 && t - reversals[0] > options.windowMs) reversals.shift();
      if (reversals.length >= options.reversals) {
        reversals.length = 0;
        return true;
      }
      return false;
    },
    reset() {
      previous = null;
      start = null;
      direction = 0;
      reversals.length = 0;
    },
  };
}
