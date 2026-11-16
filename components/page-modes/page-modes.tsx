"use client";

import { useEffect } from "react";
import { Container, Grid } from "@/components/ui/layout";
import { usePageModes } from "@/lib/page-modes";
import { useSurface } from "@/lib/stores/surface";

/**
 * The page modes Search and G and F turn on (DESIGN.md §6.3):
 * - Show grid: the layout grid's columns over the page, at the content width.
 * - Focus mode: the section being read stays lit while the rest of the page dims.
 */
export function PageModes() {
  const grid = usePageModes((state) => state.grid);
  const focus = usePageModes((state) => state.focus);
  const section = useSurface((state) => state.section);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-focus-mode", focus);
    return () => root.removeAttribute("data-focus-mode");
  }, [focus]);

  useEffect(() => {
    if (!focus || !section) return;
    const element = document.getElementById(section);
    element?.setAttribute("data-focused", "");
    return () => element?.removeAttribute("data-focused");
  }, [focus, section]);

  if (!grid) return null;
  return (
    <div className="grid-overlay" aria-hidden="true" data-testid="grid-overlay">
      <Container className="h-full">
        <Grid className="h-full">
          {Array.from({ length: 12 }, (_, column) => (
            <div key={column} className="grid-overlay-column" />
          ))}
        </Grid>
      </Container>
    </div>
  );
}
