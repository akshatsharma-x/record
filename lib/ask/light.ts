import { jumpTo } from "../jump";
import { SECTIONS } from "../sections";
import { travelTo } from "../travel";

/** How long a source stays lit after a chip brings the visitor to it, in milliseconds. */
export const LIT_MS = 2400;

/**
 * Takes the visitor to an answer's source on the home page and lights it up for a moment
 * (DESIGN.md §6.3): a section travels as the Island's links do; a role, a project, a paper
 * or a medal jumps as Show me where does. Returns false when it isn't on this page.
 */
export function showSource(target: string): boolean {
  const section = SECTIONS.some((entry) => entry.id === target);
  if (!(section ? travelTo(target) : jumpTo(target))) return false;
  const element = document.getElementById(target);
  // A section lights its heading; anything else lights itself.
  const lit = section ? (element?.querySelector<HTMLElement>("h1, h2") ?? element) : element;
  if (!lit) return true;
  lit.removeAttribute("data-ask-lit");
  // A reflow, so a second chip to the same place lights it again.
  void lit.offsetWidth;
  lit.setAttribute("data-ask-lit", "");
  window.setTimeout(() => lit.removeAttribute("data-ask-lit"), LIT_MS);
  return true;
}
