/**
 * Credentials' behavior (DESIGN.md §7.8), loaded as the section comes near (components/ui/
 * behavior.tsx). The server renders the wallet as a plain grid and each medal's still;
 * this stacks the passes like a wallet app and gives them their keys, tells the truth
 * about expiry by the visitor's calendar, and turns the medals. Each part returns what
 * undoes it.
 */
import { createMotion, drag, faceAt, flip, MEDAL_MOTION, release, step } from "./medal-motion";
import { medalState, touchMedal } from "./medal-state";
import { medalGlint } from "./surprises/medal-glint";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "./reduced-motion";
import { hasExpired, moveFocus, slots } from "./wallet";

/**
 * The wallet. Stacked (with motion), the pass in front shows whole and the rest wait
 * beneath it, each showing its top; hovering lifts one, and clicking it, or Enter, brings
 * it forward while the others slide down on the spring. The arrow keys, Home and End move
 * through the stack, and F turns the focused pass over (Escape turns it back). With
 * reduced motion it stays the server's grid, and the turn is a crossfade (CSS).
 */
export function attachWallet(wallet: HTMLElement): () => void {
  const passes = Array.from(wallet.querySelectorAll<HTMLElement>(":scope > .wallet-stack > .pass"));
  if (passes.length === 0) return () => undefined;
  const selects = passes.map((pass) => pass.querySelector<HTMLButtonElement>(".pass-select")!);
  const flips = passes.map((pass) => pass.querySelector<HTMLInputElement>(".pass-flip-input")!);
  let front = 0;
  let focused = 0;
  let stacked = false;
  let frame = 0;

  const apply = () => {
    const place = slots(passes.length, front);
    passes.forEach((pass, i) => {
      pass.style.setProperty("--slot", String(place[i]));
      pass.toggleAttribute("data-front", stacked && i === front);
      selects[i].setAttribute("aria-pressed", String(i === front));
      selects[i].tabIndex = i === focused ? 0 : -1;
      // Stacked, only the front pass's ⓘ is a tab stop; the arrows reach the rest.
      flips[i].tabIndex = !stacked || i === front ? 0 : -1;
    });
  };

  const turn = (i: number, over: boolean) => {
    flips[i].checked = over;
  };

  const bringForward = (i: number) => {
    focused = i;
    if (i !== front) {
      // The pass leaving the front turns back to its face as it slides down.
      turn(front, false);
      front = i;
    }
    apply();
  };

  const mode = () => {
    const next = !prefersReducedMotion();
    if (next === stacked) return;
    stacked = next;
    window.cancelAnimationFrame(frame);
    wallet.removeAttribute("data-moving");
    wallet.toggleAttribute("data-stacked", stacked);
    apply();
    // Springs only once the stack has settled where it starts.
    if (stacked) frame = window.requestAnimationFrame(() => wallet.setAttribute("data-moving", ""));
  };

  const indexOf = (target: EventTarget | null) => {
    const pass = (target as Element | null)?.closest?.<HTMLElement>(".pass");
    return pass ? passes.indexOf(pass) : -1;
  };

  const onClick = (event: MouseEvent) => {
    const select = (event.target as Element | null)?.closest?.(".pass-select");
    if (!select) return;
    bringForward(indexOf(select));
  };

  // A pass's ⓘ, clicked in the stack, brings it forward too.
  const onChange = (event: Event) => {
    const i = indexOf(event.target);
    if (i < 0 || !stacked || i === front) return;
    const over = flips[i].checked;
    bringForward(i);
    turn(i, over);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const i = indexOf(event.target);
    if (i < 0) return;
    const next = moveFocus(event.key, i, passes.length, stacked ? front : 0);
    if (next !== null) {
      event.preventDefault();
      if (stacked) {
        focused = next;
        apply();
        selects[next].focus();
      } else {
        flips[next].focus();
      }
      return;
    }
    if (event.key.toLowerCase() === "f" && !event.shiftKey) {
      // The pass's own key: handled here, so Search's F (focus mode) doesn't fire too.
      event.preventDefault();
      if (event.repeat) return;
      const over = !flips[i].checked;
      if (stacked) bringForward(i);
      turn(i, over);
      // Focus goes to the ⓘ, which says which side shows.
      flips[i].focus();
      return;
    }
    if (event.key === "Escape" && flips[i].checked) {
      event.preventDefault();
      turn(i, false);
      flips[i].focus();
    }
  };

  // What content couldn't know: an expiry that has passed since, by the visitor's calendar.
  const today = new Date();
  for (const expiry of wallet.querySelectorAll<HTMLElement>("[data-expiry]:not([data-expired])")) {
    if (!hasExpired(expiry.dataset.expiry ?? "", today)) continue;
    const badge = expiry.closest(".pass")?.querySelector<HTMLElement>("[data-expiry-badge]");
    const label = expiry.querySelector("[data-expiry-label]");
    if (label && badge?.textContent) label.textContent = badge.textContent;
    expiry.setAttribute("data-expired", "");
    badge?.removeAttribute("hidden");
  }

  mode();
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", mode);
  const forced = new MutationObserver(mode);
  forced.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  wallet.addEventListener("click", onClick);
  wallet.addEventListener("change", onChange);
  wallet.addEventListener("keydown", onKeyDown);
  return () => {
    window.cancelAnimationFrame(frame);
    query.removeEventListener("change", mode);
    forced.disconnect();
    wallet.removeEventListener("click", onClick);
    wallet.removeEventListener("change", onChange);
    wallet.removeEventListener("keydown", onKeyDown);
    wallet.removeAttribute("data-stacked");
    wallet.removeAttribute("data-moving");
    for (const pass of passes) {
      pass.style.removeProperty("--slot");
      pass.removeAttribute("data-front");
    }
  };
}

/** How far back a release looks to measure its speed, and how still a pointer counts as stopped. */
const SAMPLE = { window: 90, stale: 60 } as const;
/** A press that moves less than this many pixels is a click, not a drag. */
const CLICK_SLOP = 5;

/**
 * A medal. In 3D (its view's data-scene), a drag spins it with inertia, a hard flick spins
 * it fast and throws a glint, and a click, Enter or Space turns it over; lib/medal-motion.ts
 * moves it, the scene draws it, and at rest nothing runs. As a still, a click turns it over
 * in CSS. Its button says which side shows.
 */
export function attachMedal(medal: HTMLElement): () => void {
  const id = medal.dataset.medal;
  const button = medal.querySelector<HTMLButtonElement>(".medal-turn");
  if (!id || !button) return () => undefined;
  const state = medalState(id);
  state.motion = createMotion(medal.hasAttribute("data-flipped") ? "back" : "front");
  let frame = 0;
  let last = 0;
  let press: { x: number; y: number; id: number } | null = null;
  let point = { x: 0, y: 0 };
  let dragged = false;
  // The click that ends a drag isn't a turn.
  let swallow = false;
  let samples: { t: number; angle: number }[] = [];

  const is3d = () => medal.dataset.scene === "3d";

  const show = (side: "front" | "back") => {
    medal.toggleAttribute("data-flipped", side === "back");
    button.setAttribute("aria-pressed", String(side === "back"));
  };

  const tick = (time: number) => {
    const dt = last ? (time - last) / 1000 : 1 / 60;
    last = time;
    const moving = step(state.motion, dt);
    touchMedal(id);
    if (moving) {
      frame = window.requestAnimationFrame(tick);
      return;
    }
    // At rest: on a face, and nothing runs until the next touch.
    frame = 0;
    last = 0;
    medal.removeAttribute("data-spinning");
    show(faceAt(state.motion.angle));
  };

  const run = () => {
    medal.setAttribute("data-spinning", "");
    if (frame) return;
    last = 0;
    frame = window.requestAnimationFrame(tick);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!is3d() || event.button !== 0) return;
    press = { x: event.clientX, y: event.clientY, id: event.pointerId };
    point = { x: event.clientX, y: event.clientY };
    dragged = false;
    swallow = false;
    samples = [{ t: event.timeStamp, angle: state.motion.angle }];
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;
    if (!dragged && Math.hypot(event.clientX - press.x, event.clientY - press.y) < CLICK_SLOP) return;
    if (!dragged) {
      dragged = true;
      button.setPointerCapture(event.pointerId);
      window.cancelAnimationFrame(frame);
      frame = 0;
      medal.setAttribute("data-spinning", "");
    }
    drag(state.motion, event.clientX - point.x, event.clientY - point.y, button.offsetWidth || 1);
    point = { x: event.clientX, y: event.clientY };
    samples.push({ t: event.timeStamp, angle: state.motion.angle });
    samples = samples.filter((sample) => event.timeStamp - sample.t <= SAMPLE.window);
    touchMedal(id);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;
    press = null;
    if (!dragged) return;
    dragged = false;
    swallow = true;
    const first = samples[0];
    const latest = samples.at(-1)!;
    // A pointer that stopped before letting go lets the medal go still.
    const moving = event.timeStamp - latest.t <= SAMPLE.stale && latest.t > first.t;
    const velocity = moving ? ((latest.angle - first.angle) / (latest.t - first.t)) * 1000 : 0;
    if (release(state.motion, velocity) && medalGlint.on) throwGlint();
    run();
  };

  // The glint is the 3D scene's to draw; the medal says when one's in the air, while it lasts.
  let glinting = 0;
  const throwGlint = () => {
    state.glint = performance.now();
    medal.setAttribute("data-glint", "");
    window.clearTimeout(glinting);
    glinting = window.setTimeout(() => medal.removeAttribute("data-glint"), MEDAL_MOTION.glint * 1000);
  };

  const onPointerCancel = () => {
    if (!press) return;
    press = null;
    if (!dragged) return;
    dragged = false;
    release(state.motion, 0);
    run();
  };

  const onKeyDown = () => {
    swallow = false;
  };

  const onClick = (event: MouseEvent) => {
    if (swallow) {
      swallow = false;
      event.preventDefault();
      return;
    }
    if (is3d()) {
      flip(state.motion);
      show(faceAt(state.motion.target ?? state.motion.angle));
      run();
      return;
    }
    const side = medal.hasAttribute("data-flipped") ? "front" : "back";
    state.motion = createMotion(side);
    show(side);
  };

  // The cursor shows the drag only where there's a medal to spin.
  const cursor = () => button.setAttribute("data-cursor", is3d() ? "drag" : "default");
  cursor();
  const edition = new MutationObserver(cursor);
  edition.observe(medal, { attributes: true, attributeFilter: ["data-scene"] });

  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("pointermove", onPointerMove);
  button.addEventListener("pointerup", onPointerUp);
  button.addEventListener("pointercancel", onPointerCancel);
  button.addEventListener("click", onClick);
  button.addEventListener("keydown", onKeyDown);
  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(glinting);
    medal.removeAttribute("data-spinning");
    medal.removeAttribute("data-glint");
    edition.disconnect();
    button.removeEventListener("keydown", onKeyDown);
    button.removeEventListener("pointerdown", onPointerDown);
    button.removeEventListener("pointermove", onPointerMove);
    button.removeEventListener("pointerup", onPointerUp);
    button.removeEventListener("pointercancel", onPointerCancel);
    button.removeEventListener("click", onClick);
  };
}

/** The section's behavior: the wallet (or the kitchen's fixture wallet) and the medals. */
export function attachCredentials(root: HTMLElement): () => void {
  const undo = [
    ...Array.from(root.querySelectorAll<HTMLElement>(".wallet"), attachWallet),
    ...Array.from(root.querySelectorAll<HTMLElement>(".medal"), attachMedal),
  ];
  root.setAttribute("data-credentials-ready", "");
  return () => {
    root.removeAttribute("data-credentials-ready");
    for (const step of undo.reverse()) step();
  };
}
