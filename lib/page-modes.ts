import { create } from "zustand";

/**
 * Two page modes from Search (DESIGN.md §6.3, §8), for this visit only:
 * - The design grid (G): the layout grid's columns, gutters, baseline and breakpoints.
 * - Focus mode (F): the section under the pointer, or the focus, stays lit and the rest dims.
 */
export interface PageModes {
  grid: boolean;
  focus: boolean;
}

export const usePageModes = create<PageModes>(() => ({ grid: false, focus: false }));

export function togglePageMode(mode: keyof PageModes): boolean {
  const next = !usePageModes.getState()[mode];
  usePageModes.setState({ [mode]: next });
  return next;
}

/**
 * Where the design grid's ruler marks the breakpoints: the widest phone, tablet and laptop
 * layouts (734, 1068 and 1440), as styles/tokens.css's --grid-mark-* place them.
 */
export const GRID_MARKS = [734, 1068, 1440] as const;

/** The design grid's legend, as the page is laid out now. */
export function gridLegend(columns: string, gutter: string, width: number): string {
  return `${columns} columns · ${gutter} gutters · 8pt baseline · ${width}px`;
}
