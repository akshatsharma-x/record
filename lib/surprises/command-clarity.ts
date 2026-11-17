import { prefersReducedMotion } from "../reduced-motion";
import { define } from "./define.ts";

/** Search "clarity": a focus ripple spreads from the pointer across the page. */
export const commandClarity = define({ id: "command-clarity", section: "search", on: true });

/** How long the whole ripple takes, in milliseconds, and the share of it the page spends going soft. */
export const RIPPLE_MS = 1200;
const SOFTEN = 0.15;

/** Slow to leave, quick across the middle, slow to arrive. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Where the ripple is `t` of the way through (0 to 1): how opaque the blurred layer is, and
 * how far the clear circle reaches, as a share of the way to the farthest corner plus the
 * soft edge. First the page goes soft; then focus spreads from the pointer to the corners.
 */
export function rippleAt(t: number): { opacity: number; spread: number } {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    opacity: Math.min(1, clamped / SOFTEN),
    spread: clamped <= SOFTEN ? 0 : easeInOut((clamped - SOFTEN) / (1 - SOFTEN)),
  };
}

/**
 * The page goes soft, then comes back into focus from the pointer outward: a ring of
 * sharpness spreading over a blurred layer, once, then gone. With reduced motion it's a
 * single soft pulse in place, with nothing moving.
 */
export function clarity(at: { x: number; y: number }): void {
  const layer = document.createElement("div");
  layer.className = "clarity";
  layer.setAttribute("aria-hidden", "true");
  layer.style.setProperty("--x", `${at.x}px`);
  layer.style.setProperty("--y", `${at.y}px`);
  layer.style.setProperty("--r", "0px");
  layer.style.opacity = "0";
  document.body.append(layer);
  if (prefersReducedMotion()) {
    layer.setAttribute("data-still", "");
    const pulse = layer.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: RIPPLE_MS / 2, easing: "ease-in-out" });
    void pulse.finished.then(() => layer.remove(), () => layer.remove());
    return;
  }
  // Past the farthest corner by the soft edge, so the last of the blur leaves the screen.
  const edge = Number.parseFloat(getComputedStyle(layer).getPropertyValue("--clarity-edge")) || 0;
  const reach = Math.hypot(Math.max(at.x, window.innerWidth - at.x), Math.max(at.y, window.innerHeight - at.y)) + edge;
  // The clock starts on the first frame the ripple is drawn, so a busy moment can't skip its start.
  let start: number | null = null;
  const frame = (time: number) => {
    start ??= time;
    const t = (time - start) / RIPPLE_MS;
    const { opacity, spread } = rippleAt(t);
    layer.style.setProperty("--r", `${(spread * reach).toFixed(1)}px`);
    layer.style.opacity = String(opacity);
    if (t < 1) requestAnimationFrame(frame);
    else layer.remove();
  };
  requestAnimationFrame(frame);
}
