"use client";

import { useEffect } from "react";

/**
 * Loads the bento's behavior (lib/work-behavior.ts: the filter's reflow, the previews and
 * the tilt) once the section is within two screens, so it costs the first load nothing.
 * Until then, and without JavaScript, the filter still works: its radios are CSS's.
 */
export function WorkController() {
  useEffect(() => {
    const root = document.getElementById("work");
    if (!root) return;
    let alive = true;
    let detach: (() => void) | null = null;
    const load = () =>
      void import("@/lib/work-behavior").then(({ attachWork }) => {
        if (alive) detach = attachWork(root);
      });
    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => {
        alive = false;
        detach?.();
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: "200%" },
    );
    observer.observe(root);
    return () => {
      alive = false;
      observer.disconnect();
      detach?.();
    };
  }, []);

  return null;
}
