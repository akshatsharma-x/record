import type { springs } from "./motion";

/**
 * Work (DESIGN.md §7.6) helpers for the browser: the covers' responsive sizes, and a spring
 * that can start moving, so the case-study sheet can turn around mid-flight and carry its
 * speed into the reverse instead of stopping dead.
 */

/** What a cover takes of the viewport, for next/image: half on desktop, all of it on phones. */
export const COVER_SIZES = "(min-width: 1069px) 50vw, 100vw";

type Spring = Pick<(typeof springs)[keyof typeof springs], "visualDuration" | "bounce">;

/**
 * A DESIGN.md spring from 0 to 1 that starts with velocity `v0` (progress per second), the
 * way Motion resolves { visualDuration, bounce }: damping ratio 1 − bounce, natural
 * frequency 2π / (1.2 · visualDuration). Returns progress and velocity at `t` seconds.
 */
export function springFrom(spring: Spring, v0: number) {
  const zeta = Math.max(1 - spring.bounce, 0.05);
  const omega = (2 * Math.PI) / (spring.visualDuration * 1.2);
  // y = x − 1 starts at −1 and decays to rest.
  const a = -1;
  if (zeta < 1) {
    const damped = omega * Math.sqrt(1 - zeta * zeta);
    const b = (v0 + zeta * omega * a) / damped;
    return (t: number) => {
      const envelope = Math.exp(-zeta * omega * t);
      const cos = Math.cos(damped * t);
      const sin = Math.sin(damped * t);
      const y = envelope * (a * cos + b * sin);
      const velocity = envelope * (-zeta * omega * (a * cos + b * sin) + damped * (b * cos - a * sin));
      return { progress: 1 + y, velocity };
    };
  }
  const b = v0 + omega * a;
  return (t: number) => {
    const envelope = Math.exp(-omega * t);
    const y = (a + b * t) * envelope;
    const velocity = envelope * (b - omega * (a + b * t));
    return { progress: 1 + y, velocity };
  };
}

/** Whether a spring run has come to rest at its target. */
export const atRest = ({ progress, velocity }: { progress: number; velocity: number }) =>
  Math.abs(1 - progress) < 0.0005 && Math.abs(velocity) < 0.01;
