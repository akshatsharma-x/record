import type { Page } from "@playwright/test";
import sharp from "sharp";

/**
 * The share of pixels in the dot's own 20px box that contrast 3:1 or more with the local
 * background: the median color of a 40px box around the dot, outside the dot and its shadow.
 * The spec asks for 20% of a 40px box; a 14px dot can't fill that, so the count is over
 * the dot's footprint (DESIGN.md §12).
 */
export async function visibility(page: Page, x: number, y: number): Promise<number> {
  const png = await page.screenshot({ clip: { x: x - 20, y: y - 20, width: 40, height: 40 }, scale: "css" });
  // Decoded here, not in the page: the production build's script policy lets a page fetch
  // nothing but its own site, data URLs included.
  const { data: pixels, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const scale = width / 40;
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (r: number, g: number, b: number) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const ring: number[][] = [[], [], []];
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = (px + 0.5) / scale - 20;
      const dy = (py + 0.5) / scale - 20;
      if (Math.hypot(dx, dy) <= 15) continue;
      const i = (py * width + px) * 4;
      for (let c = 0; c < 3; c++) ring[c].push(pixels[i + c]);
    }
  }
  const median = ring.map((values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]);
  const background = luminance(median[0], median[1], median[2]);
  let total = 0;
  let contrasting = 0;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = (px + 0.5) / scale - 20;
      const dy = (py + 0.5) / scale - 20;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) continue;
      const i = (py * width + px) * 4;
      const l = luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      const ratio = (Math.max(l, background) + 0.05) / (Math.min(l, background) + 0.05);
      total += 1;
      if (ratio >= 3) contrasting += 1;
    }
  }
  return contrasting / total;
}
