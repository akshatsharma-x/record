/**
 * The one way to start a View Transition. It marks <html> with data-view-transition while
 * any transition runs, so the cursor can take its own transition name for exactly that
 * long and stay live above the snapshots (DESIGN.md §6.1). Outside transitions the cursor
 * has no name, because a name would make it a backdrop root and stop its glass blurring.
 */
let running = 0;

export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

export function startViewTransition(update: () => void): ViewTransition | null {
  if (!supportsViewTransitions()) return null;
  const root = document.documentElement;
  running += 1;
  root.setAttribute("data-view-transition", "");
  const transition = document.startViewTransition(update);
  transition.finished
    .catch(() => undefined)
    .finally(() => {
      running -= 1;
      if (running === 0) root.removeAttribute("data-view-transition");
    });
  return transition;
}
