"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePageModes } from "@/lib/page-modes";

// Each mode's parts load the first time it's on, so the first load carries only this.
const GridOverlay = dynamic(() => import("./grid-overlay").then((module) => module.GridOverlay), { ssr: false });

/**
 * The page modes (DESIGN.md §6.3, §8), from G, F and Search:
 * - The design grid (./grid-overlay.tsx): the layout's columns and gutters, the 8pt
 *   baseline, and the 734, 1068 and 1440 breakpoints marked, for designers.
 * - Focus mode (./focus-tracker.ts): everything but the section under the pointer, or the
 *   keyboard's focus, dims and softens. F again or Esc leaves it.
 */
export function PageModes() {
  const grid = usePageModes((state) => state.grid);
  const focus = usePageModes((state) => state.focus);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-focus-mode", focus);
    return () => root.removeAttribute("data-focus-mode");
  }, [focus]);

  useEffect(() => {
    if (!focus) return;
    let alive = true;
    let stop: (() => void) | null = null;
    void import("./focus-tracker").then(({ trackFocus }) => {
      if (alive) stop = trackFocus();
    });
    return () => {
      alive = false;
      stop?.();
    };
  }, [focus]);

  return grid ? <GridOverlay /> : null;
}
