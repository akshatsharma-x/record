import { SLOW_FRAME_MS } from "./frames";

/**
 * The 3D stage's governor (DESIGN.md §10): if drawing stays slower than 24ms a frame for
 * two seconds, the stage gives way to posters for the rest of the session. "Stays" is the
 * average over the last two seconds of drawing, so one quick frame doesn't excuse a slow
 * run, and one hitch doesn't condemn a quick one.
 *
 * The stage draws on demand, so the time between two frames is drawing time only when the
 * first asked for the second (a scene still moving): otherwise it's the stage at rest until
 * a scroll woke it, and starts a new run. So is a gap longer than `gapMs`, a hidden tab.
 * Pure, so the tests can feed it frames.
 */
export const GOVERNOR = { slowMs: SLOW_FRAME_MS, holdMs: 2000, gapMs: 1000 } as const;

export interface Governor {
  /**
   * One drawn frame, at `at` (ms), `ms` after the one before; `continuous` when the one
   * before asked for it. True once the stage has been too slow.
   */
  frame(at: number, ms: number, continuous: boolean): boolean;
}

export function createGovernor({ slowMs, holdMs, gapMs }: { slowMs: number; holdMs: number; gapMs: number } = GOVERNOR): Governor {
  let run: { at: number; ms: number }[] = [];
  let tripped = false;
  return {
    frame(at, ms, continuous) {
      if (tripped) return true;
      if (!continuous || ms > gapMs) {
        run = [];
        return false;
      }
      run.push({ at, ms });
      // Keep the frames of the last two seconds, and no more.
      while (run.length > 1 && at - (run[1].at - run[1].ms) >= holdMs) run.shift();
      if (at - (run[0].at - run[0].ms) < holdMs) return false;
      tripped = run.reduce((sum, frame) => sum + frame.ms, 0) / run.length > slowMs;
      return tripped;
    },
  };
}
