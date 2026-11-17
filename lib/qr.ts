/**
 * A pass's QR code (DESIGN.md §7.8), made at build time from its public verify URL, so a
 * phone can scan the screen and land on the issuer's own page. Server-only: the page gets
 * one SVG path, never the encoder.
 */
import { create } from "qrcode";

export interface QrCode {
  /** The side, in modules, with the quiet zone. */
  size: number;
  /** Every dark module, as one path in module units: a run of modules per subpath. */
  d: string;
}

/** The quiet zone a scanner needs around the code, in modules (ISO/IEC 18004). */
export const QUIET_ZONE = 4;

/** Medium error correction: a smudged or glaring screen still scans. */
export function qrCode(text: string, quiet = QUIET_ZONE): QrCode {
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let row = 0; row < n; row++) {
    let column = 0;
    while (column < n) {
      if (!modules.get(row, column)) {
        column++;
        continue;
      }
      let run = 1;
      while (column + run < n && modules.get(row, column + run)) run++;
      // Commas between coordinates, so no run of digits ever looks like a phone number.
      d += `M${column + quiet},${row + quiet}h${run}v1h-${run}z`;
      column += run;
    }
  }
  return { size: n + 2 * quiet, d };
}

/** The dark modules back out of a path, row by row, for tests: what a scanner would see. */
export function qrModules({ size, d }: QrCode): boolean[][] {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  for (const [, x, y, run] of d.matchAll(/M(\d+),(\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(run); i++) grid[Number(y)][Number(x) + i] = true;
  }
  return grid;
}
