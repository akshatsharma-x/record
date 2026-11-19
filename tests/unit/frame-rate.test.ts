import { describe, expect, it } from "vitest";
import { createMotion, flip, release, step } from "@/lib/medal-motion";
import { scrubStep, type SpringState, springs, stepSpring } from "@/lib/motion";

/**
 * No motion depends on the frame rate (DESIGN.md §2 rule 6, Part 16): each of the site's
 * steppers, run for the same second at 30, 60 and 120 Hz (a ProMotion display), ends in the
 * same place. A stepper that moved a fixed amount per frame would run twice as fast at
 * 120 Hz; these move by elapsed time, so they don't.
 */

const RATES = [30, 60, 120] as const;

/** Runs `frame(dt)` for `seconds` at `hz`. */
function run(hz: number, seconds: number, frame: (dt: number) => void) {
  const frames = Math.round(seconds * hz);
  for (let i = 0; i < frames; i++) frame(1 / hz);
}

describe("at 30, 60 and 120 Hz", () => {
  it("a scrubbed value (the statement, the surface, the chip, the haze) settles the same", () => {
    const at = RATES.map((hz) => {
      let shown = 0;
      run(hz, 0.4, (dt) => {
        shown += (1 - shown) * scrubStep(dt);
      });
      return shown;
    });
    for (const value of at) expect(value).toBeCloseTo(at[0], 12);
    // And it's partway there: the scrub eases, it doesn't jump.
    expect(at[0]).toBeGreaterThan(0.8);
    expect(at[0]).toBeLessThan(0.95);
  });

  it("a spring (the cursor's shape, the Island, the edit's playhead) lands the same, mid-flight too", () => {
    for (const name of Object.keys(springs) as (keyof typeof springs)[]) {
      const at = RATES.map((hz) => {
        let state: SpringState = { value: 0, velocity: 0 };
        // Halfway through, the target moves: the spring carries its velocity through.
        let target = 1;
        let elapsed = 0;
        run(hz, 0.6, (dt) => {
          elapsed += dt;
          if (elapsed > 0.2) target = 0.25;
          state = stepSpring(state, target, dt, springs[name]);
        });
        return state;
      });
      for (const state of at) {
        expect(state.value, name).toBeCloseTo(at[0].value, 6);
        expect(state.velocity, name).toBeCloseTo(at[0].velocity, 5);
      }
    }
  });

  it("a flung medal coasts, slows and comes to rest on the same face, at the same moment", () => {
    const at = RATES.map((hz) => {
      const motion = createMotion();
      release(motion, 40);
      let settledAt: number | null = null;
      let time = 0;
      run(hz, 6, (dt) => {
        time += dt;
        if (!step(motion, dt) && settledAt === null) settledAt = time;
      });
      return { angle: motion.angle, settledAt };
    });
    for (const result of at) {
      expect(result.angle).toBeCloseTo(at[0].angle, 9);
      expect(result.settledAt).not.toBeNull();
      // Within a frame of each other: when it stops is only as fine as the slowest rate's frame.
      expect(Math.abs(result.settledAt! - at[0].settledAt!)).toBeLessThanOrEqual(1 / 30 + 1e-9);
    }
  });

  it("a flipped medal turns over in the same time", () => {
    const at = RATES.map((hz) => {
      const motion = createMotion();
      flip(motion);
      let time = 0;
      let done = 0;
      run(hz, 3, (dt) => {
        time += dt;
        if (!step(motion, dt) && !done) done = time;
      });
      return { angle: motion.angle, done };
    });
    for (const result of at) {
      expect(result.angle).toBeCloseTo(at[0].angle, 9);
      expect(Math.abs(result.done - at[0].done)).toBeLessThanOrEqual(1 / 30 + 1e-9);
    }
  });
});
