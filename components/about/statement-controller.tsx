"use client";

import { useEffect } from "react";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "@/lib/reduced-motion";
import { statementFill } from "@/lib/statement";

/**
 * Drives the statement's fill: --fill follows the scroll through the pin, exactly, in the
 * scroll event itself. Geometry is measured on resize, so a scroll reads no layout. With
 * reduced motion the statement shows fully filled and doesn't pin (styles/components.css).
 * It writes before the frame's shared reads (lib/frame.ts) on purpose: the fill has to be
 * right in every callback of the frame, and it restyles only the statement's own words.
 */
export function StatementController({ target }: { target: string }) {
  useEffect(() => {
    const section = document.getElementById(target);
    const stage = section?.querySelector<HTMLElement>(".statement-stage");
    if (!section || !stage) return;
    let top = 0;
    let pin = 0;
    let written = "";

    const measure = () => {
      top = section.getBoundingClientRect().top + window.scrollY;
      pin = section.offsetHeight - stage.offsetHeight;
    };
    // Written only when it changes: above and below the pin it rests at 0 or 1, and every
    // other scroll of the page left the statement's words to restyle for nothing (Part 17).
    const update = () => {
      const fill = (prefersReducedMotion() ? 1 : statementFill(window.scrollY - top, pin)).toFixed(4);
      if (fill === written) return;
      written = fill;
      section.style.setProperty("--fill", fill);
    };
    const refresh = () => {
      measure();
      written = "";
      update();
    };

    refresh();
    const resize = new ResizeObserver(refresh);
    resize.observe(document.body);
    const motion = window.matchMedia(REDUCED_MOTION_QUERY);
    const forced = new MutationObserver(refresh);
    forced.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    window.addEventListener("scroll", update, { passive: true });
    motion.addEventListener("change", refresh);
    return () => {
      resize.disconnect();
      forced.disconnect();
      window.removeEventListener("scroll", update);
      motion.removeEventListener("change", refresh);
      section.style.removeProperty("--fill");
    };
  }, [target]);

  return null;
}
