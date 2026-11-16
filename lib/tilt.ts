import { depth } from "./motion";
import { prefersReducedMotion } from "./reduced-motion";

/**
 * Depth on hover (DESIGN.md §6.6) for one card: it tilts toward the pointer, at most 6°,
 * under a specular highlight that follows it, like a tvOS poster, and springs back when the
 * pointer leaves (styles/components.css, .tilt). Pointer only: off for touch and for
 * reduced motion. Updates are batched into one frame and only transforms change, so nothing
 * repaints. Returns what undoes it. TiltCard uses it, and so does any controller that tilts
 * cards the server rendered.
 */
export function attachTilt(card: HTMLElement): () => void {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let frame = 0;
  let pointer: { x: number; y: number } | null = null;

  const apply = () => {
    frame = 0;
    if (!pointer) return;
    card.style.setProperty("--tilt-rx", `${(-pointer.y * depth.tilt).toFixed(2)}deg`);
    card.style.setProperty("--tilt-ry", `${(pointer.x * depth.tilt).toFixed(2)}deg`);
    card.style.setProperty("--spec-x", `${(pointer.x * depth.specularTravel).toFixed(1)}%`);
    card.style.setProperty("--spec-y", `${(pointer.y * depth.specularTravel).toFixed(1)}%`);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch" || !finePointer.matches || prefersReducedMotion()) return;
    const rect = card.getBoundingClientRect();
    pointer = { x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: ((event.clientY - rect.top) / rect.height) * 2 - 1 };
    card.setAttribute("data-tilting", "");
    if (!frame) frame = requestAnimationFrame(apply);
  };

  const onLeave = () => {
    pointer = null;
    card.removeAttribute("data-tilting");
    for (const name of ["--tilt-rx", "--tilt-ry", "--spec-x", "--spec-y"]) card.style.removeProperty(name);
  };

  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(frame);
    card.removeEventListener("pointermove", onMove);
    card.removeEventListener("pointerleave", onLeave);
  };
}
