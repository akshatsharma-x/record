/**
 * Reduced motion (DESIGN.md §5.7). The operating system's setting, unless the page
 * overrides it with data-motion="reduce" or data-motion="full" on <html> (the kitchen's
 * toggle). CSS follows the same rule in styles/tokens.css.
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const forced = document.documentElement.getAttribute("data-motion");
  if (forced === "reduce") return true;
  if (forced === "full") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
