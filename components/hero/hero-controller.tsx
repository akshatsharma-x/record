"use client";

import { useEffect } from "react";
import { measure, mutate } from "@/lib/frame";
import { HERO, warmthAt } from "@/lib/hero";
import { jumpTo } from "@/lib/jump";
import { type SpringState, springAtRest, springs, stepSpring } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/reduced-motion";

interface HeroControllerProps {
  /** The hero section's id. */
  target: string;
  edition: "type" | "portrait";
}

/**
 * The hero's behavior (DESIGN.md §7.1), layered onto server-rendered markup:
 * - Scroll-out: --hero-out runs 0 → 1 as the hero leaves; CSS turns it into motion.
 * - Typographic edition: the light's warmth follows the visitor's time of day.
 * - Depth: the pointer, or a tilt that needs no permission, moves the layers on the smooth
 *   spring: the portrait's plate, name and subject, the typographic edition's upper dot
 *   grid and its light (Part 18), and the pool of lit dots under a mouse (Part 19).
 * - The glint: under a mouse, the band of light on the name follows the pointer across it,
 *   on the same spring, and slides off when it leaves (Part 19).
 * Nothing loops, so there's nothing to pause (Part 18). With reduced motion there's no
 * scroll-out, parallax, glint or lit dots.
 */
export function HeroController({ target, edition }: HeroControllerProps) {
  // A fact about one thing jumps to it (lib/jump.ts): the current role's lands the edit's
  // playhead on that role, not on the timeline's start (Part 17). Without JavaScript it's
  // the link to its heading.
  useEffect(() => {
    const hero = document.getElementById(target);
    if (!hero) return;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-jump]");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (jumpTo(decodeURIComponent(link.hash.slice(1)))) event.preventDefault();
    };
    hero.addEventListener("click", onClick);
    return () => hero.removeEventListener("click", onClick);
  }, [target]);

  useEffect(() => {
    const hero = document.getElementById(target);
    if (!hero) return;
    let alive = true;

    // Scroll-out: the scroll position read with the frame's other reads, against the hero's
    // height measured when it changes, and written after them (lib/frame.ts).
    let height = Math.max(1, hero.offsetHeight);
    let out = 0;
    const write = () => {
      if (alive) hero.style.setProperty("--hero-out", out.toFixed(4));
    };
    const read = () => {
      // With reduced motion the hero stays put as it scrolls away.
      out = prefersReducedMotion() ? 0 : Math.min(1, Math.max(0, window.scrollY / (height * HERO.outReach)));
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
      window.clearTimeout(warmthTimer);
    };
  }, [target, edition]);

  // Depth: one sprung offset (-1…1 on each axis); each layer scales it by its own depth.
  // The glint's place across the name rides a spring of its own, in the name's widths.
  useEffect(() => {
    const hero = document.getElementById(target);
    if (!hero) return;
    const name = hero.querySelector<HTMLElement>(".hero-name");
    const { parked } = HERO.glint;
    let goal: { x: number; y: number; glint: number } = { x: 0, y: 0, glint: parked };
    let x: SpringState = { value: 0, velocity: 0 };
    let y: SpringState = { value: 0, velocity: 0 };
    let glint: SpringState = { value: parked, velocity: 0 };
    let frame = 0;
    let last = 0;

    const step = (time: number) => {
      frame = 0;
      const elapsed = last ? Math.min(0.1, (time - last) / 1000) : 1 / 60;
      last = time;
      x = stepSpring(x, goal.x, elapsed, springs.smooth);
      y = stepSpring(y, goal.y, elapsed, springs.smooth);
      glint = stepSpring(glint, goal.glint, elapsed, springs.smooth);
      hero.style.setProperty("--px", x.value.toFixed(4));
      hero.style.setProperty("--py", y.value.toFixed(4));
      hero.style.setProperty("--hero-glint-x", glint.value.toFixed(4));
      if (springAtRest(x, goal.x, 0.001) && springAtRest(y, goal.y, 0.001) && springAtRest(glint, goal.glint, 0.001)) last = 0;
      else frame = requestAnimationFrame(step);
    };
    const aim = (nx: number, ny: number, nglint: number = parked) => {
      if (prefersReducedMotion()) return;
      goal = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
        glint: Math.max(HERO.glint.min, Math.min(HERO.glint.max, nglint)),
      };
      if (!frame) frame = requestAnimationFrame(step);
    };

    // A mouse lights the dots under it (data-pointer) and draws the glint to it: the band
    // sits under the pointer while it's over the name, and off to that side beyond it.
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
      if (edition === "type" && !hero.hasAttribute("data-pointer")) hero.setAttribute("data-pointer", "");
      const rect = hero.getBoundingClientRect();
      const box = edition === "type" ? name?.getBoundingClientRect() : undefined;
      aim(
        (event.clientX - rect.left) / rect.width - 0.5,
        (event.clientY - rect.top) / rect.height - 0.5,
        box?.width ? (event.clientX - box.left) / box.width : parked,
      );
    };
    const onLeave = () => {
      hero.removeAttribute("data-pointer");
      aim(0, 0);
    };
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

  return null;
}
