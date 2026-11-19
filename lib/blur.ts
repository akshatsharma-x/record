import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** How wide a placeholder is: enough for its colors, small enough to inline in the page. */
const PLACEHOLDER_WIDTH = 16;

/**
 * A picture's blur placeholder (DESIGN.md §5.4: images resolve from their blur
 * placeholders; Part 16): the picture at 16px wide, as a data URL that next/image shows,
 * blurred, until the picture itself arrives. Made once, at build, for a picture in /public;
 * anything else (another site's image) gets none and comes in on the cover's own color.
 */
export async function blurOf(src: string, root = process.cwd()): Promise<`data:image/png;base64,${string}` | null> {
  "use cache";
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  // Normalized from the root of /public, so ".." can't climb out of it.
  const file = path.join(root, "public", path.normalize(src));
  if (!existsSync(file)) throw new Error(`The picture ${src} isn't in /public.`);
  const png = await sharp(await readFile(file)).resize({ width: PLACEHOLDER_WIDTH }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
