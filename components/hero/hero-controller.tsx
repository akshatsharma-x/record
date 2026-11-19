"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { measure, mutate } from "@/lib/frame";
import { HERO, warmthAt } from "@/lib/hero";
import { type SpringState, springAtRest, springs, stepSpring } from "@/lib/motion";
import { SCROLLED_STORAGE_KEY } from "@/lib/preferences";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "@/lib/reduced-motion";

const PAUSED_KEY = "classyfolio:hero-paused";

// The pause choice, for this session: a tiny store, so it hydrates as "playing".
let pausedValue: boolean | null = null;
const pausedListeners = new Set<() => void>();
function readPaused(): boolean {
  if (pausedValue === null) {
    try {
      pausedValue = sessionStorage.getItem(PAUSED_KEY) === "1";
    } catch {
      pausedValue = false;
    }
  }
  return pausedValue;
}
function writePaused(next: boolean) {
  pausedValue = next;
  try {
    if (next) sessionStorage.setItem(PAUSED_KEY, "1");
    else sessionStorage.removeItem(PAUSED_KEY);
  } catch {
    // Storage off: the choice lasts for this page.
  }
  for (const listener of pausedListeners) listener();
}
function subscribePaused(listener: () => void) {
  pausedListeners.add(listener);
  return () => pausedListeners.delete(listener);
}

/** Whether anything in the hero loops right now: the light field, or the cue before the first scroll. */
function subscribeLoops(listener: () => void) {
  const motion = window.matchMedia(REDUCED_MOTION_QUERY);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scrolled", "data-motion"] });
  motion.addEventListener("change", listener);
  return () => {
    observer.disconnect();
    motion.removeEventListener("change", listener);
  };
}

interface HeroControllerProps {
  /** The hero section's id. */
  target: string;
  edition: "type" | "portrait";
}

/**
 * The hero's behavior (DESIGN.md §7), layered onto server-rendered markup:
 * - Scroll-out: --hero-out runs 0 → 1 as the hero leaves; CSS turns it into motion.
 * - Loops pause off-screen, in a hidden tab, and with the pause button (WCAG 2.2.2).
 * - The scroll cue breathes until the first scroll, then never again (remembered).
 * - Typographic edition: the light's warmth follows the visitor's time of day.
 * - Portrait edition: the pointer, or a tilt that needs no permission, moves the layers
 *   in depth on the smooth spring.
 * With reduced motion there's no scroll-out, parallax or loop.
 */
export function HeroController({ target, edition }: HeroControllerProps) {
  const paused = useSyncExternalStore(subscribePaused, readPaused, () => false);
  // The pause button shows only while something loops.
  const loops = useSyncExternalStore(
    subscribeLoops,
    () => !prefersReducedMotion() && (edition === "type" || !document.documentElement.hasAttribute("data-scrolled")),
    () => false,
  );

  useEffect(() => {
    document.getElementById(target)?.toggleAttribute("data-paused", paused);
  }, [paused, target]);

  useEffect(() => {
    const hero = document.getElementById(target);
    if (!hero) return;
    const root = document.documentElement;
    let alive = true;

    // Scroll-out, and the first scroll: the scroll position read with the frame's other
    // reads, against the hero's height measured when it changes, and written after them
    // (lib/frame.ts).
    let height = Math.max(1, hero.offsetHeight);
    let out = 0;
    let first = false;
    const write = () => {
      if (!alive) return;
      if (first && !root.hasAttribute("data-scrolled")) {
        root.setAttribute("data-scrolled", "");
        try {
          localStorage.setItem(SCROLLED_STORAGE_KEY, "1");
        } catch {
          // Storage off: the cue rests for this visit only.
        }
      }
      hero.style.setProperty("--hero-out", out.toFixed(4));
    };
    const read = () => {
      const y = window.scrollY;
      first = y > 8;
      // With reduced motion the hero stays put as it scrolls away.
      out = prefersReducedMotion() ? 0 : Math.min(1, Math.max(0, y / height));
      mutate(write);
    };
    const onScroll = () => measure(read);
    const sized = new ResizeObserver(() => {
      height = Math.max(1, hero.offsetHeight);
      measure(read);
    });
    sized.observe(hero);
    read();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Loops rest off-screen and in a hidden tab.
    const intersection = new IntersectionObserver(([entry]) => hero.toggleAttribute("data-offscreen", !entry.isIntersecting));
    intersection.observe(hero);
    const onVisibility = () => hero.toggleAttribute("data-hidden-tab", document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);

    // The light's warmth, from the visitor's clock.
    let warmthTimer = 0;
    const warm = () => {
      const now = new Date();
      const { from, to, mix } = warmthAt(now.getHours() + now.getMinutes() / 60);
      hero.style.setProperty("--warmth-from", `var(--light-${from})`);
      hero.style.setProperty("--warmth-to", `var(--light-${to})`);
      hero.style.setProperty("--warmth-mix", `${Math.round(mix * 100)}%`);
      hero.setAttribute("data-warm", "");
      warmthTimer = window.setTimeout(warm, HERO.warmthRefresh);
    };
    if (edition === "type") warm();

    return () => {
      alive = false;
      sized.disconnect();
      window.removeEventListener("scroll", onScroll);
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(warmthTimer);
    };
  }, [target, edition]);

  // Portrait parallax: one sprung offset (-1…1 on each axis); each layer scales it by its depth.
  useEffect(() => {
    if (edition !== "portrait") return;
    const hero = document.getElementById(target);
    if (!hero) return;
    let goal = { x: 0, y: 0 };
    let x: SpringState = { value: 0, velocity: 0 };
    let y: SpringState = { value: 0, velocity: 0 };
    let frame = 0;
    let last = 0;

    const step = (time: number) => {
      frame = 0;
      const elapsed = last ? Math.min(0.1, (time - last) / 1000) : 1 / 60;
      last = time;
      x = stepSpring(x, goal.x, elapsed, springs.smooth);
      y = stepSpring(y, goal.y, elapsed, springs.smooth);
      hero.style.setProperty("--px", x.value.toFixed(4));
      hero.style.setProperty("--py", y.value.toFixed(4));
      if (springAtRest(x, goal.x, 0.001) && springAtRest(y, goal.y, 0.001)) last = 0;
      else frame = requestAnimationFrame(step);
    };
    const aim = (nx: number, ny: number) => {
      if (prefersReducedMotion()) return;
      goal = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = hero.getBoundingClientRect();
      aim((event.clientX - rect.left) / rect.width - 0.5, (event.clientY - rect.top) / rect.height - 0.5);
    };
    const onLeave = () => aim(0, 0);
    hero.addEventListener("pointermove", onPointer);
    hero.addEventListener("pointerleave", onLeave);

    // Phones: a tilt, only where it needs no permission prompt.
    let base: { beta: number; gamma: number } | null = null;
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      base ??= { beta: event.beta, gamma: event.gamma };
      aim((event.gamma - base.gamma) / HERO.tiltRange, (event.beta - base.beta) / HERO.tiltRange);
    };
    const needsPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function";
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && !needsPermission) window.addEventListener("deviceorientation", onTilt);

    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onPointer);
      hero.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [target, edition]);

  if (!loops) return null;
  return (
    <button
      type="button"
      className="hero-pause"
      aria-pressed={paused}
      aria-label={paused ? "Play the background motion" : "Pause the background motion"}
      onClick={() => writePaused(!paused)}
    >
      {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
    </button>
  );
}
