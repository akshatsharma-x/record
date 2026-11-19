/**
 * The surface controller (DESIGN.md §4.2). One scroll-linked loop crossfades the page
 * background between adjacent sections across the outgoing section's own empty foot (its
 * bottom padding; a quarter of a viewport where it has none), so the lights go down and
 * come up between two ideas rather than under one. Text tokens switch at the crossfade's
 * midpoint, when the background is closer to the next surface than to the last, and when
 * the scroll comes to rest partway, the light settles to the nearer end: no text is left
 * on a half-lit gray (Part 17).
 *
 * - Sections are top-level elements with data-section and data-surface. A scene that opens
 *   another section says so with data-section-for (the statement opens About), and is
 *   reported as that section.
 * - The backdrop is two fixed layers: "from" shows the current surface and "to" fades in
 *   the next one. Only opacity changes, so the compositor does the work (§2 rule 6).
 * - Progress follows scroll position, smoothed against elapsed time like a GSAP scrub,
 *   so mouse-wheel steps don't jump and 60 Hz and 120 Hz look the same.
 * - With reduced motion there's no crossfade (§5.7): sections paint their own surfaces,
 *   and the controller only reports which one the visitor is on.
 */
import { measure as frameRead, mutate } from "../frame.ts";
import { durations, scrubStep } from "../motion.ts";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "../reduced-motion.ts";
import type { SurfaceName, SurfaceState, Tone } from "../stores/surface.ts";

/** Where in the viewport a section counts as current: its middle. */
const PROBE = 0.5;
/** The crossfade spans at most the last fifth of a section, so a tall pinned scene finishes
    in its own light; within that, the section's bottom padding, or this share of the
    viewport where it has none (Part 17: half a viewport left text half-lit for 240px). */
const ZONE = 0.2;
const ZONE_MAX = 0.25;
/** How long the scroll rests before a light caught partway settles to the nearer end. */
const REST_MS = durations.microShort;
/** The settle's pace: an exponential ease, visibly done within the §5.3 UI durations. */
const SETTLE_TAU = durations.ui / 3000;
/** Close enough to the target to stop the loop. */
const SETTLED = 0.001;
/** The time a loop's first step stands for, in seconds: one frame at 60 Hz. */
const FIRST_STEP = 1 / 60;
/** How far past the viewport, in viewports, a section counts as near and takes the light. */
const NEAR = 0.5;

interface Measured {
  id: string | null;
  name: string | null;
  surface: SurfaceName;
  top: number;
  bottom: number;
  /** The section's empty foot, where its light hands over: its bottom padding, in px. */
  fade: number;
}

export interface Blend {
  from: number;
  to: number;
  /** 0–1 from `from` to `to`. */
  progress: number;
}

/**
 * The pure part: which sections the probe is between, and how far. `most` caps the zone's
 * length, and a section's own `fade` (its empty foot) narrows it further.
 */
export function blendAt(sections: readonly { top: number; bottom: number; fade?: number }[], probe: number, zone = ZONE, most = Infinity): Blend {
  if (sections.length === 0) return { from: -1, to: -1, progress: 0 };
  const last = sections.length - 1;
  if (probe < sections[0].top) return { from: 0, to: 0, progress: 0 };
  let index = sections.findIndex((section) => probe < section.bottom);
  if (index === -1) index = last;
  const section = sections[index];
  const height = section.bottom - section.top;
  const zoneStart = section.bottom - Math.min(height * zone, section.fade && section.fade > 0 ? section.fade : most);
  if (index === last || probe < zoneStart || height <= 0) return { from: index, to: index, progress: 0 };
  return { from: index, to: index + 1, progress: Math.min(1, (probe - zoneStart) / (section.bottom - zoneStart)) };
}

export interface SurfaceController {
  refresh(): void;
  destroy(): void;
}

export function createSurfaceController(options: {
  from: HTMLElement;
  to: HTMLElement;
  onChange: (state: SurfaceState) => void;
}): SurfaceController {
  const root = document.documentElement;
  let sections: Measured[] = [];
  let nodes: HTMLElement[] = [];
  // The sections in the light: on screen or nearly, and the two being crossfaded. Only these
  // turn transparent and take the active surface's tokens; the rest paint their own surface,
  // so a change of light restyles a section or three, not the whole page (Part 16).
  let near = new Set<HTMLElement>();
  let view = { y: 0, h: 0 };
  let crossfade = false;
  let shown = { from: -1, to: -1, progress: 0 };
  let target: Blend = { from: -1, to: -1, progress: 0 };
  let frame = 0;
  let lastTime = 0;
  let lastReported = "";
  let rest = 0;
  /** Whether the light is settling after the scroll came to rest partway. */
  let settling = false;

  const measure = () => {
    nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-section][data-surface]"));
    const scrollY = window.scrollY;
    sections = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const surface = node.getAttribute("data-surface");
      return {
        id: node.getAttribute("data-section-for") || node.id || null,
        name: node.getAttribute("data-section-name"),
        surface: surface === "dark" || surface === "light-alt" ? surface : "light",
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
        fade: parseFloat(getComputedStyle(node).paddingBottom) || 0,
      };
    });
  };

  /** Marks the sections in the light, changing only those that come or go. */
  const light = (next: Set<HTMLElement>) => {
    for (const node of near) if (!next.has(node)) node.removeAttribute("data-surface-near");
    for (const node of next) if (!near.has(node)) node.setAttribute("data-surface-near", "");
    near = next;
  };

  const updateMode = () => {
    crossfade = sections.length > 0 && !prefersReducedMotion();
    if (crossfade) root.setAttribute("data-surface-controller", "");
    else {
      root.removeAttribute("data-surface-controller");
      root.removeAttribute("data-surface-active");
      light(new Set());
    }
  };

  /** On screen or within half a viewport of it, and the pair being crossfaded. */
  const nearby = (): Set<HTMLElement> => {
    const next = new Set<HTMLElement>();
    const margin = view.h * NEAR;
    sections.forEach((section, i) => {
      if (section.bottom > view.y - margin && section.top < view.y + view.h + margin) next.add(nodes[i]);
    });
    for (const i of [shown.from, shown.to]) if (nodes[i]) next.add(nodes[i]);
    return next;
  };

  const toneOf = (surface: SurfaceName): Tone =>
    root.getAttribute("data-theme") === "dark" || surface === "dark" ? "dark" : "light";

  const render = () => {
    const from = sections[shown.from];
    const to = sections[shown.to] ?? from;
    const active = shown.progress < 0.5 ? from : to;
    const surface: SurfaceName = active?.surface ?? "light";

    if (crossfade && from) {
      options.from.setAttribute("data-backdrop-surface", from.surface);
      options.to.setAttribute("data-backdrop-surface", to.surface);
      options.to.style.opacity = String(shown.progress);
      light(nearby());
      if (root.getAttribute("data-surface-active") !== surface) root.setAttribute("data-surface-active", surface);
    }

    const state: SurfaceState = {
      surface,
      tone: toneOf(surface),
      section: active?.id ?? null,
      name: active?.name ?? null,
      progress: Math.round(shown.progress * 1000) / 1000,
    };
    const key = `${state.surface}|${state.tone}|${state.section}|${state.name}|${state.progress}`;
    if (key !== lastReported) {
      lastReported = key;
      options.onChange(state);
    }
  };

  const tick = (time: number) => {
    frame = 0;
    // A loop's first frame takes one frame's step: where the light settled, the scroll that
    // follows eases it back rather than snapping it there.
    const elapsed = lastTime ? (time - lastTime) / 1000 : FIRST_STEP;
    lastTime = time;
    const samePair = target.from === shown.from && target.to === shown.to;
    if (!crossfade || !samePair) {
      // A new pair of sections, or no crossfade: jump straight to the scroll position.
      shown = { ...target };
    } else {
      const step = settling ? 1 - Math.exp(-elapsed / SETTLE_TAU) : scrubStep(elapsed);
      shown.progress += (target.progress - shown.progress) * step;
      if (Math.abs(target.progress - shown.progress) < SETTLED) shown.progress = target.progress;
    }
    render();
    if (shown.progress !== target.progress) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  };

  // A scroll reads with the frame's other reads, and the first step of the crossfade writes
  // after them, in the same frame (lib/frame.ts); the smoothing goes on from there.
  const start = () => {
    if (!frame) tick(performance.now());
  };
  const look = () => {
    view = { y: window.scrollY, h: window.innerHeight };
  };
  /**
   * A journey's end (lib/travel.ts): the light it held through the trip changes once, to the
   * destination's, crossfaded by CSS while data-surface-arriving is on (Part 17).
   */
  let arriving = 0;
  const arrive = () => {
    root.removeAttribute("data-traveling");
    look();
    target = blendAt(sections, view.y + view.h * PROBE, ZONE, view.h * ZONE_MAX);
    if (!crossfade) return;
    root.setAttribute("data-surface-arriving", "");
    shown = { ...target };
    render();
    window.clearTimeout(arriving);
    arriving = window.setTimeout(() => root.removeAttribute("data-surface-arriving"), durations.ui);
  };
  /** At rest partway through a crossfade, the light goes the rest of the way to the nearer end. */
  const settle = () => {
    rest = 0;
    if (root.hasAttribute("data-traveling")) return arrive();
    if (!crossfade || target.progress <= 0 || target.progress >= 1) return;
    target = { ...target, progress: target.progress < 0.5 ? 0 : 1 };
    settling = true;
    // Eased from the next frame on: a first step with no time elapsed would jump there.
    lastTime = performance.now();
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const read = () => {
    window.clearTimeout(rest);
    rest = window.setTimeout(settle, REST_MS);
    // On a journey the light holds: it changes once, when the page comes to rest.
    if (root.hasAttribute("data-traveling")) return;
    look();
    target = blendAt(sections, view.y + view.h * PROBE, ZONE, view.h * ZONE_MAX);
    settling = false;
    mutate(start);
  };
  const update = () => frameRead(read);

  const refresh = () => {
    measure();
    updateMode();
    lastTime = 0;
    // Paint the surface in the same task that made the sections transparent, so nothing
    // (a frame, a screen reader, axe) ever sees a section without its background.
    look();
    target = blendAt(sections, view.y + view.h * PROBE, ZONE, view.h * ZONE_MAX);
    shown = { ...target };
    render();
  };

  const resizeObserver = new ResizeObserver(() => refresh());
  resizeObserver.observe(document.body);
  const attributeObserver = new MutationObserver(refresh);
  attributeObserver.observe(root, { attributes: true, attributeFilter: ["data-motion", "data-theme"] });
  // A journey that never scrolls (it was there already) still ends.
  const travelObserver = new MutationObserver(() => {
    if (!root.hasAttribute("data-traveling")) return;
    window.clearTimeout(rest);
    rest = window.setTimeout(settle, REST_MS);
  });
  travelObserver.observe(root, { attributes: true, attributeFilter: ["data-traveling"] });
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", refresh);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", refresh);
  void document.fonts?.ready.then(refresh);
  refresh();

  return {
    refresh,
    destroy() {
      cancelAnimationFrame(frame);
      window.clearTimeout(rest);
      window.clearTimeout(arriving);
      travelObserver.disconnect();
      root.removeAttribute("data-traveling");
      root.removeAttribute("data-surface-arriving");
      resizeObserver.disconnect();
      attributeObserver.disconnect();
      media.removeEventListener("change", refresh);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", refresh);
      root.removeAttribute("data-surface-controller");
      root.removeAttribute("data-surface-active");
      light(new Set());
    },
  };
}
