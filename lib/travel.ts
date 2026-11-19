import { prefersReducedMotion } from "./reduced-motion.ts";

/**
 * Travels to a section on the current page (the Island and Search, §6.2–§6.3): a smooth
 * scroll (instant with reduced motion) that stops below the Island, thanks to
 * scroll-padding-top, then the URL and focus follow. Returns false when the section isn't
 * on this page, so the caller navigates instead.
 */
export function travelTo(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  announceTravel();
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
  // Keyboard and screen reader users continue from the section's heading.
  const heading = target.querySelector<HTMLElement>("h1, h2");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  return true;
}

/**
 * Says a journey is under way: the surface controller holds its light until the page comes
 * to rest, then changes it once (lib/surface/controller.ts). A smooth scroll down the whole
 * page passed every section's light in a quarter of a second, a strobe (Part 17).
 */
export function announceTravel() {
  if (!prefersReducedMotion()) document.documentElement.setAttribute("data-traveling", "");
}

/** "/#work" on the home page is section "work"; anything else is a page. */
export function sectionOf(href: string, pathname: string): string | null {
  const match = /^\/#([\w-]+)$/.exec(href);
  return match && pathname === "/" ? match[1] : null;
}
