"use client";

import { useEffect } from "react";

/**
 * Each section's behavior, loaded once the section is within two screens, so it costs the
 * first load nothing (DESIGN.md §10). The server renders the section whole and CSS makes it
 * work without JavaScript; a behavior only adds motion and interaction. Each returns what
 * undoes it.
 */
const BEHAVIORS = {
  work: () => import("@/lib/work-behavior").then((module) => module.attachWork),
  skills: () => import("@/lib/skills-behavior").then((module) => module.attachSkills),
  research: () => import("@/lib/research-behavior").then((module) => module.attachResearch),
  paper: () => import("@/lib/research-behavior").then((module) => module.attachResearch),
} satisfies Record<string, () => Promise<(root: HTMLElement) => () => void>>;

export function Behavior({ section }: { section: keyof typeof BEHAVIORS }) {
  useEffect(() => {
    const root = document.getElementById(section);
    if (!root) return;
    let alive = true;
    let detach: (() => void) | null = null;
    const load = () =>
      void BEHAVIORS[section]().then((attach) => {
        if (alive) detach = attach(root);
      });
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (!entries.some((entry) => entry.isIntersecting)) return;
              observer?.disconnect();
              load();
            },
            { rootMargin: "200%" },
          );
    if (observer) observer.observe(root);
    else load();
    return () => {
      alive = false;
      observer?.disconnect();
      detach?.();
    };
  }, [section]);

  return null;
}
