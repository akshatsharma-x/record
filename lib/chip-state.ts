/**
 * What the chip's DOM and its 3D scene share (DESIGN.md §7.7): which layer is out, when the
 * cores last rippled, and how far the scroll scene has run. The skills behavior writes it;
 * the scene reads it and redraws. A plain store, so neither side waits on React.
 */
export interface ChipState {
  /** The layer slid out, by its id, or null. */
  active: string | null;
  /** When the cores last rippled (performance.now()), or 0. */
  ripple: number;
  /** The scroll scene's progress, 0 to 1 (lib/chip.ts, sceneProgress). */
  progress: number;
}

export const chipState: ChipState = { active: null, ripple: 0, progress: 0 };

const listeners = new Set<() => void>();

export function setChip(patch: Partial<ChipState>) {
  Object.assign(chipState, patch);
  for (const listener of listeners) listener();
}

export function onChip(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
