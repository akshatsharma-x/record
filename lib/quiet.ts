/**
 * Quiet moments (DESIGN.md §10): heavy, one-off work, such as a 3D scene's first build,
 * waits until the page has stopped scrolling, so it never lands in the middle of a scroll.
 * Turns are taken one at a time, each in a quiet moment of its own, so several pieces of
 * work never pile into one long frame.
 */

/** How long the page must be still to count as quiet, in milliseconds. */
export const QUIET = 220;

let chain: Promise<void> = Promise.resolve();

/** Resolves at the next quiet moment after every earlier turn has had its own. */
export function quietTurn(): Promise<void> {
  chain = chain.then(
    () =>
      new Promise<void>((resolve) => {
        let timer = 0;
        const events = ["scroll", "wheel", "touchmove"] as const;
        const done = () => {
          for (const name of events) window.removeEventListener(name, arm);
          resolve();
        };
        function arm() {
          window.clearTimeout(timer);
          timer = window.setTimeout(done, QUIET);
        }
        for (const name of events) window.addEventListener(name, arm, { passive: true });
        arm();
      }),
  );
  return chain;
}
