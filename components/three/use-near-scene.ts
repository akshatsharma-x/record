"use client";

import { useEffect, useState } from "react";
import { quietTurn } from "@/lib/quiet";
import { useStage } from "./stage";

/**
 * When a 3D view may take over from its poster (DESIGN.md §10). `near` turns on once the
 * element is three screens away, so three.js and the tier's probe never weigh on the page's
 * load; `scene` turns on once it's near, the stage is active and the element is off screen,
 * so the poster never swaps for the scene in view. With `quiet`, the swap (and the scene's
 * first build) also waits for a moment when the page isn't scrolling (lib/quiet.ts). The
 * edition it settles on is written to the element's data-scene ("3d" or "poster"), for
 * CSS and behaviors.
 */
export function useNearScene(id: string, { quiet = false }: { quiet?: boolean } = {}): { near: boolean; scene: boolean } {
  const { active } = useStage();
  const [near, setNear] = useState(false);
  const [scene, setScene] = useState(false);

  useEffect(() => {
    const element = document.getElementById(id);
    if (!element || typeof IntersectionObserver === "undefined") return;
    const approach = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        approach.disconnect();
        setNear(true);
      },
      { rootMargin: "300%" },
    );
    approach.observe(element);
    return () => approach.disconnect();
  }, [id]);

  useEffect(() => {
    const element = document.getElementById(id);
    if (!element || !active || !near || scene) return;
    let alive = true;
    let away = false;
    let waiting = false;
    // Only while the element is off screen does the poster give way to the scene.
    const swap = () => {
      if (alive && away) setScene(true);
    };
    const view = new IntersectionObserver((entries) => {
      away = !entries[entries.length - 1].isIntersecting;
      if (!away || waiting) return;
      if (!quiet) return swap();
      waiting = true;
      void quietTurn().then(() => {
        waiting = false;
        swap();
      });
    });
    view.observe(element);
    return () => {
      alive = false;
      view.disconnect();
    };
  }, [id, active, near, scene, quiet]);

  useEffect(() => {
    const element = document.getElementById(id);
    if (!element) return;
    const next = active && scene ? "3d" : "poster";
    if (element.getAttribute("data-scene") === next) return;
    // An edition can change the element's height (the chip's scene is a tall stage, its
    // poster isn't). Above the viewport, that would carry what's in view up or down. The
    // browser's scroll anchoring catches it only sometimes (WebKit and Chromium both skip it
    // in some cases), so the page keeps its place by itself (Part 15): everything below the
    // element moves with its bottom edge, so whatever drift that edge shows once the change
    // is laid out, after any anchoring the browser did, is what the page scrolls back.
    const edge = () => element.getBoundingClientRect().bottom;
    const before = edge();
    element.setAttribute("data-scene", next);
    if (before > 0) return;
    const drift = edge() - before;
    if (Math.abs(drift) >= 1) window.scrollBy({ top: drift, behavior: "instant" });
  }, [id, active, scene]);

  return { near, scene };
}
