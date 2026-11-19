import { Children, type ReactNode } from "react";

/**
 * Headline typesetting (DESIGN.md §4.4, Part 17), with no-break spaces, which hold at every
 * width and in every browser, where `text-wrap` only sometimes does:
 * - a dash never starts a line: it keeps to the word before it, everywhere;
 * - a headline's last word doesn't stand alone, where it's asked for: only where the
 *   measure is known to hold the last two words together (the hero's headline), since a
 *   pair wider than its column overflows it instead (Contact's at 1440 did).
 */
const NBSP = "\u00a0";

/** A dash keeps to the word before it: "systems —" ends a line, "— and" never starts one. */
export const bindDashes = (text: string) => text.replace(/ ([—–]) /g, `${NBSP}$1 `);

/** The last two words travel together. */
export const bindLastWord = (text: string) => text.replace(/ (\S+\s*)$/, `${NBSP}$1`);

/** A headline's string, typeset: its dashes bound, and its last word too when asked. */
export function typeset(text: string, { lastWord = false }: { lastWord?: boolean } = {}): string {
  const bound = bindDashes(text);
  return lastWord ? bindLastWord(bound) : bound;
}

/** A headline's children, typeset: every string's dashes bound. */
export function typesetNodes(children: ReactNode): ReactNode {
  if (typeof children === "string") return bindDashes(children);
  if (!Children.toArray(children).some((node) => typeof node === "string")) return children;
  return Children.toArray(children).map((node) => (typeof node === "string" ? bindDashes(node) : node));
}
