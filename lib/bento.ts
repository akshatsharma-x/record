/**
 * The work bento's packing (DESIGN.md §4.5, §7.6): where each tile sits on the 12-column
 * grid for a given set of tiles, with no holes. Rows are square: as tall as a 4-span tile
 * is wide on desktop ("lg") and a 6-span tile on tablets ("md"), so each span keeps a fixed
 * aspect ratio. Phones stack the tiles. Pure, so tests can pack every filter state.
 *
 * Runs under plain Node for content/derive.ts: no path aliases.
 */

export const COLUMNS = 12;

export type Breakpoint = "lg" | "md";

/** A tile's place, in grid lines from 1. */
export interface Place {
  column: number;
  span: number;
  row: number;
  rows: number;
}

type Size = [span: number, rows: number];

/**
 * The sizes for `count` tiles in order, the first being the flagship when `flagship` is set:
 * the flagship takes a square of four quarters (8×2), the next tile stands tall beside it
 * (4×2), and the rest share rows.
 */
export function sizes(count: number, flagship: boolean, breakpoint: Breakpoint): Size[] {
  if (count <= 0) return [];
  if (breakpoint === "md") {
    // Two squares to a row; the flagship opens wide, the second stands tall beside a pair.
    if (count === 1) return [[12, 1]];
    if (count === 2) return [[6, 1], [6, 1]];
    const rest = count - 1;
    const head: Size[] = [[12, 1]];
    if (rest >= 3) {
      head.push([6, 2], [6, 1], [6, 1]);
      return [...head, ...pairs(rest - 3)];
    }
    return [...head, ...pairs(rest)];
  }
  if (count === 1) return [[12, 1]];
  if (!flagship) {
    if (count === 2) return [[6, 2], [6, 2]];
    if (count === 3) return [[4, 2], [4, 2], [4, 2]];
    return threes(count);
  }
  if (count === 2) return [[8, 2], [4, 2]];
  if (count === 3) return [[8, 2], [4, 1], [4, 1]];
  return [[8, 2], [4, 2], ...threes(count - 2)];
}

/** Rows of 6-span squares, a lone last tile running the full width. */
function pairs(count: number): Size[] {
  const out: Size[] = Array.from({ length: count - (count % 2) }, () => [6, 1] as Size);
  if (count % 2) out.push([12, 1]);
  return out;
}

/** Rows of three 4-span squares; one left over runs the full width, two share a row. */
function threes(count: number): Size[] {
  const whole = Math.floor(count / 3) * 3;
  const out: Size[] = Array.from({ length: whole }, () => [4, 1] as Size);
  const left = count - whole;
  if (left === 1) out.push([12, 1]);
  if (left === 2) out.push([6, 1], [6, 1]);
  return out;
}

/** Places sizes in order, each at the first free spot reading row by row. */
export function pack(list: readonly Size[]): Place[] {
  const taken: boolean[][] = [];
  const free = (row: number, column: number, span: number, rows: number) => {
    if (column + span > COLUMNS) return false;
    for (let r = row; r < row + rows; r++) for (let c = column; c < column + span; c++) if (taken[r]?.[c]) return false;
    return true;
  };
  return list.map(([span, rows]) => {
    for (let row = 0; ; row++) {
      for (let column = 0; column + span <= COLUMNS; column++) {
        if (!free(row, column, span, rows)) continue;
        for (let r = row; r < row + rows; r++) {
          taken[r] ??= [];
          for (let c = column; c < column + span; c++) taken[r][c] = true;
        }
        return { column: column + 1, span, row: row + 1, rows };
      }
    }
  });
}

/** Whether places fill their rows exactly: no gap, no overlap. */
export function fillsExactly(places: readonly Place[]): boolean {
  const height = Math.max(0, ...places.map((place) => place.row - 1 + place.rows));
  const cells = new Set<string>();
  for (const place of places) {
    for (let r = place.row; r < place.row + place.rows; r++) {
      for (let c = place.column; c < place.column + place.span; c++) {
        const key = `${r} ${c}`;
        if (cells.has(key)) return false;
        cells.add(key);
      }
    }
  }
  return cells.size === height * COLUMNS;
}
