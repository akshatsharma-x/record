import { prefersReducedMotion } from "./reduced-motion";
import { attachTilt } from "./tilt";
import { startViewTransition, supportsViewTransitions } from "./view-transition";

/** How much faster a running reflow finishes when the visitor picks another filter. */
const HURRY = 4;

/**
 * The bento's behavior (DESIGN.md §7.6), loaded as the section comes near
 * (components/ui/behavior.tsx). The server renders every tile and CSS places them for
 * the checked filter; this only adds motion and words:
 *
 * - **Filtering** reflows the grid in a View Transition, each tile gliding on the smooth
 *   spring. Picking another filter mid-flight hurries the running one to its end and then
 *   glides on, so a tile never jumps. A status line announces the count.
 * - **Previews** play once on hover or focus, or the first time a tile comes into view on a
 *   touch screen, and then rest on their final frame. Never with reduced motion.
 * - **Depth**: every card tilts toward the pointer under its specular highlight (§6.6).
 *
 * Returns what undoes it.
 */
export function attachWork(root: HTMLElement): () => void {
  const control = root.querySelector<HTMLFieldSetElement>(".work-filter");
  if (!control) return () => undefined;
  const tiles = Array.from(root.querySelectorAll<HTMLElement>(".work-tile"));
  const radios = Array.from(control.querySelectorAll<HTMLInputElement>("input[type='radio']"));
  const status = root.querySelector<HTMLElement>("[data-work-status]");
  const cleanups = tiles.flatMap((tile) => {
    const card = tile.querySelector<HTMLElement>(".work-card");
    return card ? [attachTilt(card)] : [];
  });

  // ─── Previews ─────────────────────────────────────────────────────────────
  const play = (tile: Element | null) => {
    if (!tile || tile.hasAttribute("data-playing") || prefersReducedMotion()) return;
    tile.setAttribute("data-playing", "");
  };
  // Each film runs inside its cover's clock; when the clock ends (or a filter hides the tile
  // mid-film), the film rests.
  const onAnimationEnd = (event: AnimationEvent) => {
    if (event.animationName !== "work-film-clock") return;
    (event.target as Element).closest(".work-tile")?.removeAttribute("data-playing");
  };
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== "touch") play(event.currentTarget as Element);
  };
  const onFocusIn = (event: FocusEvent) => play(event.currentTarget as Element);
  for (const tile of tiles) {
    tile.addEventListener("pointerenter", onPointerEnter);
    tile.addEventListener("focusin", onFocusIn);
  }
  root.addEventListener("animationend", onAnimationEnd);
  root.addEventListener("animationcancel", onAnimationEnd);

  // On touch screens, each preview plays once, the first time its tile is mostly in view.
  const touch = window.matchMedia("(hover: none)").matches;
  const reveal =
    touch && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              reveal?.unobserve(entry.target);
              play(entry.target);
            }
          },
          { threshold: 0.5 },
        )
      : null;
  for (const tile of tiles) reveal?.observe(tile);

  // ─── Filtering ───────────────────────────────────────────────────────────
  let current = radios.find((radio) => radio.checked) ?? radios[0];
  let running: ViewTransition | null = null;
  let pending: HTMLInputElement | null = null;

  const announce = () => {
    const position = String(radios.indexOf(current) + 1);
    const count = tiles.filter((tile) => tile.dataset.in?.split(" ").includes(position)).length;
    if (status) status.textContent = `${current.parentElement?.textContent ?? ""}: ${count} ${count === 1 ? "project" : "projects"}`;
  };

  const name = (on: boolean) => {
    for (const tile of tiles) tile.style.viewTransitionName = on ? `work-${tile.dataset.workTile}` : "";
    document.documentElement.toggleAttribute("data-work-filtering", on);
  };

  const go = (next: HTMLInputElement) => {
    if (running) {
      pending = next;
      for (const animation of document.getAnimations()) {
        const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement;
        if (pseudo?.startsWith("::view-transition")) animation.playbackRate = HURRY;
      }
      return;
    }
    name(true);
    running = startViewTransition(() => {
      next.checked = true;
      current = next;
    });
    if (!running) {
      name(false);
      return;
    }
    running.finished.finally(() => {
      running = null;
      name(false);
      announce();
      const after = pending;
      pending = null;
      if (after && after !== current) go(after);
    });
  };

  const onChange = (event: Event) => {
    const next = event.target;
    if (!(next instanceof HTMLInputElement) || next.type !== "radio") return;
    if (next === current && !running) return;
    if (prefersReducedMotion() || !supportsViewTransitions()) {
      current = next;
      announce();
      return;
    }
    // The radio is already checked. Put the shown one back for a moment, so the transition
    // captures the grid as it was, then check the new one inside it.
    current.checked = true;
    go(next);
  };
  control.addEventListener("change", onChange);
  root.setAttribute("data-work-ready", "");

  return () => {
    root.removeAttribute("data-work-ready");
    for (const cleanup of cleanups) cleanup();
    for (const tile of tiles) {
      tile.removeEventListener("pointerenter", onPointerEnter);
      tile.removeEventListener("focusin", onFocusIn);
    }
    root.removeEventListener("animationend", onAnimationEnd);
    root.removeEventListener("animationcancel", onAnimationEnd);
    control.removeEventListener("change", onChange);
    reveal?.disconnect();
    running?.skipTransition();
    name(false);
  };
}
