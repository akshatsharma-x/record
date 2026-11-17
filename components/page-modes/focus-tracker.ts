import { useSurface } from "@/lib/stores/surface";

/**
 * Focus mode's light (DESIGN.md §8, lib/surprises/focus-mode.ts): which section stays lit,
 * marked data-focused, while the rest dims and softens. Whichever moved last leads: the
 * mouse (the section under it, as the page scrolls beneath it too) or the keyboard's focus
 * (its section). Until either moves, it's the section being read, as the Island names it.
 * Loaded the first time F turns the mode on. Returns what undoes it.
 */
export function trackFocus(): () => void {
  let current: Element | null = null;
  let pointer: { x: number; y: number } | null = null;
  let led: "page" | "pointer" | "focus" = "page";
  let frame = 0;

  const mark = (target: Element | null) => {
    const next = target?.closest("[data-section]") ?? null;
    if (!next || next === current) return;
    current?.removeAttribute("data-focused");
    next.setAttribute("data-focused", "");
    current = next;
  };
  const read = (section: string | null) => mark(section ? document.getElementById(section) : null);
  read(useSurface.getState().section);

  const under = () => {
    frame = 0;
    if (pointer) mark(document.elementFromPoint(pointer.x, pointer.y));
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    pointer = { x: event.clientX, y: event.clientY };
    led = "pointer";
    if (!frame) frame = requestAnimationFrame(under);
  };
  // Scrolling moves the page under a still pointer; a scroll the focus caused doesn't count.
  const onScroll = () => {
    if (led === "pointer" && !frame) frame = requestAnimationFrame(under);
  };
  const onFocus = (event: FocusEvent) => {
    led = "focus";
    mark(event.target as Element);
  };
  const unsubscribe = useSurface.subscribe((state, previous) => {
    if (led === "page" && state.section !== previous.section) read(state.section);
  });

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("focusin", onFocus);
  return () => {
    cancelAnimationFrame(frame);
    unsubscribe();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("focusin", onFocus);
    current?.removeAttribute("data-focused");
  };
}
