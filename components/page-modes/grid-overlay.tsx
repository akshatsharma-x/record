"use client";

import { useEffect, useState } from "react";
import { Container, Grid } from "@/components/ui/layout";
import { GRID_MARKS, gridLegend } from "@/lib/page-modes";

/** The grid's legend, as the page is laid out right now: columns, gutter, baseline and width. */
function useLegend() {
  const [legend, setLegend] = useState("");
  useEffect(() => {
    const measure = () => {
      const style = getComputedStyle(document.documentElement);
      const columns = style.getPropertyValue("--grid-columns").trim();
      const gutter = style.getPropertyValue("--grid-gutter").trim();
      setLegend(gridLegend(columns, gutter, window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return legend;
}

/**
 * The design grid (DESIGN.md §8, lib/surprises/design-grid.ts), for the designers who'll
 * want to check: the layout's columns and gutters at the content width, the 8pt baseline,
 * and the 734, 1068 and 1440 breakpoints, each the right edge of a window that wide. It
 * loads the first time G turns it on, and never takes a click.
 */
export function GridOverlay() {
  const legend = useLegend();
  return (
    <div className="grid-overlay" aria-hidden="true" data-testid="grid-overlay">
      <div className="grid-overlay-baseline" />
      <Container className="h-full">
        <Grid className="h-full">
          {Array.from({ length: 12 }, (_, column) => (
            <div key={column} className="grid-overlay-column" />
          ))}
        </Grid>
      </Container>
      <div className="grid-overlay-ruler">
        {GRID_MARKS.map((mark) => (
          <span key={mark} className="grid-overlay-mark" data-mark={mark}>
            {mark}
          </span>
        ))}
      </div>
      <p className="grid-overlay-legend">{legend}</p>
    </div>
  );
}
