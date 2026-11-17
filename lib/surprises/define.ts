/**
 * A surprise (DESIGN.md §8): something small to find, never in the way. Each lives in a file
 * of its own here, with its flag: on or off by default, and NEXT_PUBLIC_SURPRISES can turn
 * any on or off for a build ("+devanagari-name,-clarity"). The flag is fixed at build time,
 * so the server and the browser always agree. Its words are content's
 * (copy.colophon.things), and /colophon lists every one that's on, behind a spoiler.
 *
 * Plain Node too (content's checks and the tests): relative imports with .ts extensions.
 */

export type SurpriseSection = "hero" | "about" | "experience" | "research" | "skills" | "credentials" | "contact" | "search" | "global";

export interface Surprise {
  id: string;
  section: SurpriseSection;
  /** Whether it ships, after any override for this build. */
  on: boolean;
  /** Whether it ships by default (before overrides). */
  shipped: boolean;
}

/** "+a,-b": what this build turns on and off. */
export function overrides(spec: string | undefined): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const part of (spec ?? "").split(",").map((piece) => piece.trim()).filter(Boolean)) {
    const off = part.startsWith("-");
    out.set(part.replace(/^[+-]/, ""), !off);
  }
  return out;
}

const BUILD = overrides(process.env.NEXT_PUBLIC_SURPRISES);

export function define(surprise: { id: string; section: SurpriseSection; on: boolean }): Surprise {
  return { ...surprise, shipped: surprise.on, on: BUILD.get(surprise.id) ?? surprise.on };
}
