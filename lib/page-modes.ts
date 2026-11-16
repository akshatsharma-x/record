import { create } from "zustand";

/**
 * Two page modes from Search (DESIGN.md §6.3), for this visit only:
 * - Show grid (G): the layout grid's columns over the page.
 * - Focus mode (F): the section being read stays lit and the rest of the page dims.
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
