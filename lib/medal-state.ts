/**
 * The medals' shared state (DESIGN.md §7.8): the DOM (lib/credentials-behavior.ts) turns
 * them, from drags, flicks, clicks and keys, and the 3D scene draws where they are. Plain
 * objects and one listener set, so neither side re-renders React to move a medal.
 */
import { createMotion, type MedalMotion } from "./medal-motion.ts";

export interface MedalState {
  motion: MedalMotion;
  /** When the last hard flick threw a glint (performance.now()), or 0. */
  glint: number;
}

const medals = new Map<string, MedalState>();
const listeners = new Set<(id: string) => void>();

export function medalState(id: string): MedalState {
  let state = medals.get(id);
  if (!state) {
    state = { motion: createMotion(), glint: 0 };
    medals.set(id, state);
  }
  return state;
}

/** Something about medal `id` changed: its scene redraws. */
export function touchMedal(id: string): void {
  for (const listener of listeners) listener(id);
}

export function onMedals(listener: (id: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
