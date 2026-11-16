/**
 * The surface controller (DESIGN.md §4.2). One scroll-linked loop crossfades the page
 * background between adjacent sections over the last 20% of each, so the lights go down
 * and come up. Text tokens switch at the crossfade's midpoint, when the background is
 * closer to the next surface than to the last.
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
import { scrubStep } from "../motion.ts";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "../reduced-motion.ts";
import type { SurfaceName, SurfaceState, Tone } from "../stores/surface.ts";

/** Where in the viewport a section counts as current: its middle. */
const PROBE = 0.5;
/** The crossfade spans the last fifth of each section. */
const ZONE = 0.2;
/** Close enough to the target to stop the loop. */
const SETTLED = 0.001;

interface Measured {
  id: string | null;
  name: string | null;
  surface: SurfaceName;
  top: number;
  bottom: number;
}

export interface Blend {
  from: number;
  to: number;
  /** 0–1 from `from` to `to`. */
  progress: number;
}

/** The pure part: which sections the probe is between, and how far. */
export function blendAt(sections: readonly { top: number; bottom: number }[], probe: number, zone = ZONE): Blend {
  if (sections.length === 0) return { from: -1, to: -1, progress: 0 };
  const last = sections.length - 1;
  if (probe < sections[0].top) return { from: 0, to: 0, progress: 0 };
  let index = sections.findIndex((section) => probe < section.bottom);
  if (index === -1) index = last;
  const section = sections[index];
  const height = section.bottom - section.top;
  const zoneStart = section.bottom - height * zone;
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
  let crossfade = false;
  let shown = { from: -1, to: -1, progress: 0 };
  let target: Blend = { from: -1, to: -1, progress: 0 };
  let frame = 0;
  let lastTime = 0;
  let lastReported = "";

  const measure = () => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-section][data-surface]"));
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
      };
    });
  };

  const updateMode = () => {
    crossfade = sections.length > 0 && !prefersReducedMotion();
    if (crossfade) root.setAttribute("data-surface-controller", "");
    else {
      root.removeAttribute("data-surface-controller");
      root.removeAttribute("data-surface-active");
    }
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
    const elapsed = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    const samePair = target.from === shown.from && target.to === shown.to;
    if (!crossfade || !samePair || elapsed === 0) {
      // A new pair of sections, or no crossfade: jump straight to the scroll position.
      shown = { ...target };
    } else {
      shown.progress += (target.progress - shown.progress) * scrubStep(elapsed);
      if (Math.abs(target.progress - shown.progress) < SETTLED) shown.progress = target.progress;
    }
    render();
    if (shown.progress !== target.progress) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  };

  const update = () => {
    target = blendAt(sections, window.scrollY + window.innerHeight * PROBE);
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const refresh = () => {
    measure();
    updateMode();
    lastTime = 0;
    // Paint the surface in the same task that made the sections transparent, so nothing
    // (a frame, a screen reader, axe) ever sees a section without its background.
    target = blendAt(sections, window.scrollY + window.innerHeight * PROBE);
    shown = { ...target };
    render();
  };

  const resizeObserver = new ResizeObserver(() => refresh());
  resizeObserver.observe(document.body);
  const attributeObserver = new MutationObserver(refresh);
  attributeObserver.observe(root, { attributes: true, attributeFilter: ["data-motion", "data-theme"] });
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
      resizeObserver.disconnect();
      attributeObserver.disconnect();
      media.removeEventListener("change", refresh);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", refresh);
      root.removeAttribute("data-surface-controller");
      root.removeAttribute("data-surface-active");
    },
  };
}
