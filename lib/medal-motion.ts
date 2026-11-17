/**
 * How a medal turns (DESIGN.md §7.8): a drag spins it, a release keeps it spinning with
 * inertia until friction lets a spring set it down on a face, and a click flips it. Time
 * drives it, never frames, and at rest it's exactly still: on a face, with no velocity, so
 * nothing redraws. Pure, so tests pin it.
 */

export interface MedalMotion {
  /** Around its vertical axis, in radians: 0 shows the face, π the back. */
  angle: number;
  velocity: number;
  /** A small lean toward a vertical drag, in radians, that springs back. */
  tilt: number;
  tiltVelocity: number;
  dragging: boolean;
  /** The face the spring is setting it down on, once friction has slowed it. */
  target: number | null;
}

export const MEDAL_MOTION = {
  /** Friction: velocity falls by e every this many seconds. */
  coast: 0.7,
  /** Below this speed (radians a second) the spring takes over. */
  settle: 3.2,
  /** The spring that sets it down, and the one that flips it: stiffness and damping ratio. */
  spring: { omega: 9, zeta: 0.82 },
  flip: { omega: 8.5, zeta: 0.74 },
  /** A release faster than this is a hard flick: it spins fast and throws a glint. */
  flick: 16,
  /** No spin is faster than this. */
  max: 46,
  /** How far a drag the medal's width turns it, and how much a vertical drag leans it. */
  dragTurn: Math.PI,
  leanPerWidth: 0.5,
  maxLean: 0.32,
  /** Close enough to rest that it snaps there and stops. */
  rest: { angle: 1e-4, velocity: 1e-3 },
  /** The glint's life, in seconds. */
  glint: 0.75,
} as const;

export function createMotion(face: "front" | "back" = "front"): MedalMotion {
  return { angle: face === "back" ? Math.PI : 0, velocity: 0, tilt: 0, tiltVelocity: 0, dragging: false, target: null };
}

/** Which face is toward the visitor at this angle. */
export function faceAt(angle: number): "front" | "back" {
  return ((Math.round(angle / Math.PI) % 2) + 2) % 2 === 0 ? "front" : "back";
}

/** The face it'll come to rest on: the next one in the direction it's turning. */
export function landing(motion: MedalMotion): number {
  if (motion.target !== null) return motion.target;
  const k = motion.angle / Math.PI;
  if (Math.abs(motion.velocity) < 1e-6) return Math.round(k) * Math.PI;
  return (motion.velocity > 0 ? Math.ceil(k - 1e-9) : Math.floor(k + 1e-9)) * Math.PI;
}

/** Turn it over: to the other face, the way it's already turning (else forward). */
export function flip(motion: MedalMotion): void {
  const from = motion.target ?? Math.round(motion.angle / Math.PI) * Math.PI;
  motion.target = from + (motion.velocity < 0 ? -Math.PI : Math.PI);
}

/** A drag moved it by `dx, dy` pixels on a medal `width` wide. */
export function drag(motion: MedalMotion, dx: number, dy: number, width: number): void {
  motion.dragging = true;
  motion.target = null;
  motion.angle += (dx / width) * MEDAL_MOTION.dragTurn;
  motion.tilt = Math.max(-MEDAL_MOTION.maxLean, Math.min(MEDAL_MOTION.maxLean, motion.tilt + (dy / width) * MEDAL_MOTION.leanPerWidth));
}

/** Let go at `velocity` radians a second: true if it was a hard flick. */
export function release(motion: MedalMotion, velocity: number): boolean {
  motion.dragging = false;
  motion.velocity = Math.max(-MEDAL_MOTION.max, Math.min(MEDAL_MOTION.max, velocity));
  motion.target = null;
  return Math.abs(velocity) >= MEDAL_MOTION.flick;
}

/** A damped spring's acceleration toward `to`. */
const spring = (x: number, v: number, to: number, { omega, zeta }: { omega: number; zeta: number }) =>
  omega * omega * (to - x) - 2 * zeta * omega * v;

/** True while it's moving. */
export function atRest(motion: MedalMotion): boolean {
  return !motion.dragging && motion.velocity === 0 && motion.tiltVelocity === 0 && motion.tilt === 0 && motion.angle % Math.PI === 0;
}

/**
 * Advances it by `dt` seconds, in small steps so the springs stay stable at any frame
 * rate. Returns true while it's still moving.
 */
export function step(motion: MedalMotion, dt: number): boolean {
  if (motion.dragging) return true;
  let left = Math.min(dt, 0.1);
  const flipping = motion.target !== null && Math.abs(motion.velocity) < MEDAL_MOTION.settle * 4;
  while (left > 0) {
    const h = Math.min(left, 1 / 240);
    left -= h;
    // The lean always springs back.
    motion.tiltVelocity += spring(motion.tilt, motion.tiltVelocity, 0, MEDAL_MOTION.spring) * h;
    motion.tilt += motion.tiltVelocity * h;
    if (motion.target === null && Math.abs(motion.velocity) > MEDAL_MOTION.settle) {
      // Coasting: friction alone.
      motion.velocity *= Math.exp(-h / MEDAL_MOTION.coast);
    } else {
      if (motion.target === null) motion.target = landing(motion);
      motion.velocity += spring(motion.angle, motion.velocity, motion.target, flipping ? MEDAL_MOTION.flip : MEDAL_MOTION.spring) * h;
    }
    motion.angle += motion.velocity * h;
  }
  const settled =
    motion.target !== null &&
    Math.abs(motion.angle - motion.target) < MEDAL_MOTION.rest.angle &&
    Math.abs(motion.velocity) < MEDAL_MOTION.rest.velocity;
  const upright = Math.abs(motion.tilt) < MEDAL_MOTION.rest.angle && Math.abs(motion.tiltVelocity) < MEDAL_MOTION.rest.velocity;
  if (settled && upright) {
    // Exactly on its face, a whole number of turns kept small, and still.
    const k = Math.round(motion.target! / Math.PI) % 2;
    motion.angle = k * Math.PI;
    motion.velocity = 0;
    motion.tilt = 0;
    motion.tiltVelocity = 0;
    motion.target = null;
    return false;
  }
  return true;
}
