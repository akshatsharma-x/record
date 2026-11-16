/**
 * The highlights reel (DESIGN.md §7, Part 6). One card plays at a time: the one in view,
 * while the reel is on screen, the tab is visible and the visitor hasn't paused it.
 */
export const REEL = {
  /** The pause choice lasts for the session. */
  pausedKey: "classyfolio:reel-paused",
  /** How much of a card must show for it to be the one in view. */
  inView: 0.6,
  /** How much of the reel must show for it to play. */
  onScreen: 0.25,
  /** A pointer that moves this far (px) is dragging, not clicking. */
  dragSlop: 6,
} as const;

/** The card nearest a scroll position, given each card's start (px). */
export function nearestCard(starts: readonly number[], position: number): number {
  let best = 0;
  for (let i = 1; i < starts.length; i++) {
    if (Math.abs(starts[i] - position) < Math.abs(starts[best] - position)) best = i;
  }
  return best;
}
