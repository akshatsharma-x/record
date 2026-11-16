/**
 * The statement's word fill (DESIGN.md §7, Part 6). Each word fills from fg-3 to fg in
 * reading order as the visitor scrolls through the pin; styles/components.css turns one
 * number, --fill, into every word's color.
 *
 * The fill maps the scroll exactly, with no scrub smoothing: trackpads and touch already
 * scroll smoothly, and smoothing would make the words trail the page (§12).
 */
export const STATEMENT = {
  /** The share of the pin the fill takes; the full statement then holds for the rest. */
  fillShare: 0.8,
} as const;

/** How far the fill has come, 0–1, after `scrolled` px of a `pin` px pin. */
export function statementFill(scrolled: number, pin: number): number {
  if (pin <= 0) return 1;
  return Math.min(1, Math.max(0, scrolled / (pin * STATEMENT.fillShare)));
}
