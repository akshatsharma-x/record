"use client";

import { useEffect } from "react";
import { offerBehavior } from "@/lib/behaviors";

/**
 * Each section's behavior, loaded once the section is within two screens, so it costs the
 * first load nothing (DESIGN.md §10). The server renders the section whole and CSS makes it
 * work without JavaScript; a behavior only adds motion and interaction. Each returns what
 * undoes it. A behavior that needs what only the server knows takes it as `data`, and one
 * that's needed before its section comes near loads at once (lib/behaviors.ts).
 */
const BEHAVIORS = {
  work: () => import("@/lib/work-behavior").then((module) => module.attachWork),
  skills: () => import("@/lib/skills-behavior").then((module) => module.attachSkills),
  research: () => import("@/lib/research-behavior").then((module) => module.attachResearch),
  paper: () => import("@/lib/research-behavior").then((module) => module.attachResearch),
  credentials: () => import("@/lib/credentials-behavior").then((module) => module.attachCredentials),
  contact: () => import("@/lib/contact-behavior").then((module) => module.attachContact),
  experience: () => import("@/lib/edit-behavior").then((module) => module.attachEdit),
  // A surprise's (DESIGN.md §8): the name's morph, on the heading, while its flag is on.
  "name-morph": () => import("@/lib/surprises/devanagari-name").then((module) => module.attachNameMorph),
} satisfies Record<string, () => Promise<(root: HTMLElement, data: never) => () => void>>;

type Section = keyof typeof BEHAVIORS;
/** What a section's behavior takes from the server, if anything. */
type DataOf<S extends Section> = Parameters<Awaited<ReturnType<(typeof BEHAVIORS)[S]>>>[1];

/**
 * `id` is the element it attaches to, when that isn't the section's own (the edit's, the
 * kitchen's fixtures).
 */
export function Behavior<S extends Section>({ section, id = section, data }: { section: S; id?: string } & (DataOf<S> extends undefined ? { data?: never } : { data: DataOf<S> })) {
  useEffect(() => {
    const root = document.getElementById(id);
    if (!root) return;
    let alive = true;
    let detach: (() => void) | null = null;
    let loading: Promise<void> | null = null;
    const load = () =>
      (loading ??= BEHAVIORS[section]().then((attach) => {
        // The props tie `data` to the section, so it's the data this attach takes.
        if (alive) detach = (attach as (root: HTMLElement, data: unknown) => () => void)(root, data);
      }));
    const withdraw = offerBehavior(id, load);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (!entries.some((entry) => entry.isIntersecting)) return;
              observer?.disconnect();
              void load();
            },
            { rootMargin: "200%" },
          );
    if (observer) observer.observe(root);
    else void load();
    return () => {
      alive = false;
      withdraw();
      observer?.disconnect();
      detach?.();
    };
  }, [section, id, data]);

  return null;
}
