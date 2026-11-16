"use client";

import { useEffect } from "react";

/**
 * Marks each At-a-glance tile the first time it's on screen, so its one animation plays
 * then (DESIGN.md §5.6) and it rests after. Before JavaScript, tiles simply show their
 * final state.
 */
export function GlanceReveal() {
  useEffect(() => {
    const tiles = document.querySelectorAll<HTMLElement>(".glance-tile:not([data-revealed])");
    if (tiles.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.4 },
    );
    for (const tile of tiles) {
      tile.setAttribute("data-armed", "");
      observer.observe(tile);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
