import { prefersReducedMotion } from "./reduced-motion";

/**
 * Jumps to something on the home page (DESIGN.md §7.7, §6.3): Show me where's jump, and
 * Ask's source chips. A role is a panel in the edit, which moves only by its own playhead:
 * choosing its clip springs the edit there (a hash scroll would be taken for the visitor's
 * own, and stop it). Anything else scrolls into view and takes focus. Returns false when
 * it isn't on this page.
 */
export function jumpTo(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  const panel = target.closest<HTMLElement>(".edit-panel");
  const edit = document.getElementById("edit");
  const clip = panel && edit?.hasAttribute("data-editing") ? edit.querySelector<HTMLElement>(`.edit-clip[data-panel="${CSS.escape(panel.dataset.panel ?? "")}"]`) : null;
  if (clip) {
    clip.click();
    return true;
  }
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "center" });
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  return true;
}
