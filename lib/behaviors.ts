/**
 * The sections' behaviors still waiting to load (components/ui/behavior.tsx), by the id of
 * the element each attaches to. A behavior loads as its section comes near; something
 * elsewhere that needs one now, such as a jump into the edit from Skills or from Ask, has it
 * load at once rather than land on a section that hasn't got its behavior yet.
 */
const waiting = new Map<string, () => Promise<void>>();

/** Offers a behavior's loader; returns what withdraws it. */
export function offerBehavior(id: string, load: () => Promise<void>): () => void {
  waiting.set(id, load);
  return () => {
    if (waiting.get(id) === load) waiting.delete(id);
  };
}

/** Resolves once the behavior on `id` is attached, loading it now if it hasn't; at once if there's none. */
export function behaviorReady(id: string): Promise<void> {
  return waiting.get(id)?.() ?? Promise.resolve();
}
