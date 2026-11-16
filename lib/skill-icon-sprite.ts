import { readFileSync } from "node:fs";
import path from "node:path";

/** Where Simple Icons keeps a file per logo. */
const ICONS = path.join(process.cwd(), "node_modules", "simple-icons", "icons");

/** A logo's path, from its file, or null if Simple Icons has no such slug. */
export function iconPath(slug: string): string | null {
  try {
    return /<path d="([^"]+)"/.exec(readFileSync(path.join(ICONS, `${slug}.svg`), "utf8"))?.[1] ?? null;
  } catch {
    return null;
  }
}

/** The sprite: a symbol per logo, in Simple Icons' 24-unit box, filled with the text color. */
export function skillIconSprite(slugs: readonly string[]): string {
  const symbols = [...new Set(slugs)].map((slug) => {
    const d = iconPath(slug);
    if (!d) throw new Error(`Simple Icons has no "${slug}"`);
    return `<symbol id="${slug}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`;
}
