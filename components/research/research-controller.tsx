"use client";

import { useEffect } from "react";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "@/lib/reduced-motion";
import { playAt, RESEARCH } from "@/lib/research";

/**
 * Plays #research's chapters from the scroll (DESIGN.md §7.5). While a chapter is pinned,
 * --play on it follows the scroll exactly, 0 to 1 over the first three quarters of its
 * pin, and a "chapterplay" event carries the same number to the illustrations that need
 * it in script. Unpinned (phones, reduced motion), --play is left unset, so CSS shows
 * every illustration's final frame, and each hears 1 once.
 */
export function ResearchController() {
  useEffect(() => {
    const section = document.getElementById("research");
    const chapters = Array.from(document.querySelectorAll<HTMLElement>("#research .chapter"));
    if (!section || chapters.length === 0) return;
    let pinned = false;
    let geometry: { top: number; length: number }[] = [];
    const heard = new Map<HTMLElement, string>();

    const measure = () => {
      geometry = chapters.map((chapter) => {
        const stage = chapter.querySelector<HTMLElement>(".chapter-stage");
        return { top: chapter.getBoundingClientRect().top + window.scrollY, length: Math.max(1, chapter.offsetHeight - (stage?.offsetHeight ?? 0)) };
      });
    };

    const tell = (chapter: HTMLElement, play: number) => {
      const key = play.toFixed(3);
      if (heard.get(chapter) === key) return;
      heard.set(chapter, key);
      chapter.dispatchEvent(new CustomEvent("chapterplay", { detail: play }));
    };

    const update = () => {
      chapters.forEach((chapter, i) => {
        if (!pinned) {
          chapter.style.removeProperty("--play");
          tell(chapter, 1);
          return;
        }
        const { top, length } = geometry[i];
        const play = playAt((window.scrollY - top) / length);
        chapter.style.setProperty("--play", play.toFixed(4));
        tell(chapter, play);
      });
    };

    /** Pinned, does every chapter's card fit its stage? Where one doesn't, they stay a column. */
    const fits = () =>
      chapters.every((chapter) => {
        const frame = chapter.querySelector<HTMLElement>(".chapter-frame");
        const card = chapter.querySelector<HTMLElement>(".paper-card");
        return !frame || !card || card.offsetHeight <= frame.clientHeight + 1;
      });

    const mode = () => {
      const wanted = window.matchMedia(RESEARCH.query).matches && !prefersReducedMotion();
      section.removeAttribute("data-unfit");
      pinned = wanted && fits();
      section.toggleAttribute("data-unfit", wanted && !pinned);
      measure();
      update();
    };

    mode();
    // The titles' serif comes in two screens ahead of the section (styles/components.css).
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.setAttribute("data-fonts", "");
        near.disconnect();
      },
      { rootMargin: "200%" },
    );
    near.observe(section);
    // The page above can change height (fonts, images): the pins' places follow. Whether they
    // pin at all is decided on resize and when the fonts settle, never in here, so this
    // callback changes no layout.
    const resize = new ResizeObserver(() => {
      measure();
      update();
    });
    resize.observe(document.body);
    window.addEventListener("resize", mode);
    let disposed = false;
    void document.fonts?.ready.then(() => {
      if (!disposed) mode();
    });
    const queries = [window.matchMedia(RESEARCH.query), window.matchMedia(REDUCED_MOTION_QUERY)];
    for (const query of queries) query.addEventListener("change", mode);
    const forced = new MutationObserver(mode);
    forced.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      disposed = true;
      near.disconnect();
      window.removeEventListener("resize", mode);
      resize.disconnect();
      forced.disconnect();
      for (const query of queries) query.removeEventListener("change", mode);
      window.removeEventListener("scroll", update);
      for (const chapter of chapters) chapter.style.removeProperty("--play");
      section.removeAttribute("data-unfit");
    };
  }, []);

  return null;
}
