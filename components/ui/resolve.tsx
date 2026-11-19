"use client";

import { type ElementType, type HTMLAttributes, type ReactNode, useEffect, useRef } from "react";
import { gsapEase, resolve, seconds } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * GSAP and SplitText, loaded the first time a headline resolves, with the plugin registered
 * then and only then: once for the page, however many headlines follow (Part 16).
 */
let gsapReady: Promise<{ gsap: typeof import("gsap").gsap; SplitText: typeof import("gsap/SplitText").SplitText }> | null = null;
function loadGsap() {
  gsapReady ??= Promise.all([import("gsap"), import("gsap/SplitText")]).then(([{ gsap }, { SplitText }]) => {
    gsap.registerPlugin(SplitText);
    return { gsap, SplitText };
  });
  return gsapReady;
}

interface ResolveProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** "lines" rises each line through a mask (headlines); "block" resolves the element whole. */
  split?: "lines" | "block";
  children?: ReactNode;
}

/**
 * The Resolve, the site's signature entrance (DESIGN.md §5.4): content arrives out of focus
 * and comes into it. Opacity 0→1 and blur 12px→0 over 700ms on the ease-out curve; lines
 * rise through masks 60ms apart (SplitText), a block also rises 16px and scales from .98.
 *
 * - It runs once, when the element first scrolls into view, and GSAP loads only then.
 * - The text is real HTML from the start. It's hidden only while a script can reveal it,
 *   and it appears anyway if the reveal never runs (styles/globals.css).
 * - SplitText's aria handling keeps screen readers reading whole text, and the split is
 *   reverted afterwards so the DOM is exactly what was rendered.
 * - With reduced motion it's a 200ms fade.
 */
export function Resolve({ as: Tag = "div", split = "lines", children, ...rest }: ResolveProps) {
  const ref = useRef<HTMLElement>(null);
  const armed = useHydrated();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      element.setAttribute("data-resolved", "");
      return;
    }

    let cancelled = false;
    let stop = () => {};
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void loadGsap().then(({ gsap, SplitText }) => {
          if (cancelled) return;
          const ease = gsapEase(resolve.curve);
          const blur = `blur(${resolve.blur}px)`;
          if (split === "lines") {
            // Words split on a plain space alone, so a headline's no-break spaces (lib/typeset.ts)
            // hold in the split lines too, and the text doesn't reflow when it reverts (Part 17).
            const text = SplitText.create(element, { type: "lines", mask: "lines", aria: "auto", wordDelimiter: " ", reduceWhiteSpace: false });
            const tween = gsap.from(text.lines, {
              yPercent: 100,
              opacity: 0,
              filter: blur,
              duration: seconds(resolve.duration),
              stagger: seconds(resolve.stagger),
              ease,
              onComplete: () => text.revert(),
            });
            element.setAttribute("data-resolved", "");
            stop = () => {
              tween.kill();
              text.revert();
            };
          } else {
            const tween = gsap.from(element, {
              opacity: 0,
              y: resolve.y,
              scale: resolve.scale,
              filter: blur,
              duration: seconds(resolve.duration),
              ease,
              clearProps: "opacity,transform,filter",
            });
            element.setAttribute("data-resolved", "");
            stop = () => tween.kill();
          }
        });
      },
      { threshold: 0.2, rootMargin: "0% 0% -10% 0%" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      stop();
    };
  }, [split]);

  return (
    <Tag ref={ref} data-resolve="" data-armed={armed || undefined} {...rest}>
      {children}
    </Tag>
  );
}
