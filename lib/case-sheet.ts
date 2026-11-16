import { durations, springs } from "./motion";
import { prefersReducedMotion } from "./reduced-motion";
import { atRest, springFrom } from "./work";

/**
 * The case-study sheet's motion (DESIGN.md §7.6), App Store–style. A tile expands into a
 * full-screen sheet: its card grows into the sheet's panel while its title and cover fly to
 * their places, the rest of the case study fades in, and the page behind scales to .94,
 * dims and rounds its corners. Closing reverses it into the tile.
 *
 * Everything on screen is one state, a set of numbers between two ends (the tile and the
 * open sheet), carried by a spring. A new target starts from wherever the state is, with
 * its speed, so any transition can be interrupted: closing mid-expansion turns around.
 *
 * The sheet lives in a route (app/@modal), so the back button, Escape, × or a drag all
 * close it by leaving the route. React then unmounts it, or hides it in an <Activity> to
 * restore on forward; either way it must close its <dialog> at once, or a hidden modal would
 * leave the page inert. So the closing animation plays on a ghost: a copy of the sheet as it
 * was, which flies back into the tile and is removed. Nothing here touches React's DOM but
 * the dialog's open state and inline styles.
 */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The state on screen. Rects are in viewport pixels; title and cover move by transforms. */
interface State {
  /** The panel's visible rect (a clip) and its top and bottom corner radii. */
  px: number;
  py: number;
  pw: number;
  ph: number;
  pr: number;
  pb: number;
  /** The title's and cover's offsets and scale from where they're laid out. */
  tx: number;
  ty: number;
  tk: number;
  cx: number;
  cy: number;
  ck: number;
  /** The rest of the case study's opacity: 0 at the tile, 1 open. */
  fade: number;
  /** The page behind: 0 as it is, 1 scaled, dimmed and rounded. */
  page: number;
  /** The panel's opacity (only a sheet with no tile to come from fades). */
  alpha: number;
  /** A drag's offset, down. */
  dy: number;
  /** How far a ghost's panel is scrolled: a sheet closing from further down scrolls back up
   * as it folds, so its title and cover come home in a straight line. */
  scroll: number;
}

type Key = keyof State;
const KEYS: Key[] = ["px", "py", "pw", "ph", "pr", "pb", "tx", "ty", "tk", "cx", "cy", "ck", "fade", "page", "alpha", "dy", "scroll"];

const lerp = (from: State, to: State, p: number) =>
  Object.fromEntries(KEYS.map((key) => [key, from[key] + (to[key] - from[key]) * p])) as unknown as State;

/** Where the title and cover are laid out in the open sheet. */
interface Basis {
  panel: Rect;
  radius: { top: number; bottom: number };
  title: { rect: Rect; size: number } | null;
  cover: { element: Rect; drawing: Rect } | null;
  scrollTop: number;
}

/** What the sheet grows out of: a tile, or the next-project card. */
interface Origin {
  card: Rect;
  radius: number;
  title: { rect: Rect; size: number } | null;
  cover: Rect | null;
}

interface Layer {
  root: HTMLElement;
  panel: HTMLElement;
  dim: HTMLElement;
  title: HTMLElement | null;
  cover: HTMLElement | null;
  fades: HTMLElement[];
}

const rectOf = (element: Element): Rect => {
  const r = element.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const visible = (rect: Rect) => rect.w > 0 && rect.h > 0 && rect.y + rect.h > 0 && rect.y < innerHeight && rect.x + rect.w > 0 && rect.x < innerWidth;

const px = (value: string) => Number.parseFloat(value) || 0;

/** The drawing inside a cover: an SVG fitted with "meet", or the cover itself. */
function drawingOf(cover: Element): Rect {
  const box = rectOf(cover);
  const svg = cover.querySelector("svg");
  const view = svg?.viewBox.baseVal;
  if (!svg || !view || !view.width) return box;
  const frame = rectOf(svg);
  const scale = Math.min(frame.w / view.width, frame.h / view.height);
  const w = view.width * scale;
  const h = view.height * scale;
  return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
}

const fontSize = (element: Element) => px(getComputedStyle(element).fontSize);

// ─── The page behind ─────────────────────────────────────────────────────────

interface Session {
  scrollY: number;
  opener: HTMLElement | null;
  content: HTMLElement | null;
  fixed: HTMLElement[];
  contentTop: number;
  scale: number;
  radius: number;
  motion: boolean;
}

let session: Session | null = null;

function openSession(): Session {
  if (session) return session;
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const content = document.querySelector<HTMLElement>(".content-layer");
  const active = document.activeElement;
  session = {
    scrollY: window.scrollY,
    opener: active instanceof HTMLElement && active !== document.body ? active : null,
    content,
    fixed: Array.from(document.querySelectorAll<HTMLElement>(".surface-backdrop, .stage-canvas")),
    contentTop: content ? content.getBoundingClientRect().top + window.scrollY : 0,
    scale: Number(styles.getPropertyValue("--case-page-scale")) || 1,
    radius: px(styles.getPropertyValue("--radius-card-l")),
    motion: !prefersReducedMotion(),
  };
  root.setAttribute("data-case-open", "");
  return session;
}

function paintPage(p: number) {
  if (!session) return;
  const { content, fixed, motion } = session;
  const s = motion ? 1 - (1 - session.scale) * p : 1;
  const r = motion ? session.radius * p : 0;
  const shaped = p > 0 && motion;
  if (content) {
    const top = window.scrollY - session.contentTop;
    content.style.transformOrigin = `50% ${top + innerHeight / 2}px`;
    content.style.transform = shaped ? `scale(${s})` : "";
    content.style.clipPath = shaped ? `inset(${top}px 0 ${content.offsetHeight - top - innerHeight}px 0 round ${r / s}px)` : "";
  }
  for (const element of fixed) {
    element.style.transform = shaped ? `scale(${s})` : "";
    element.style.clipPath = shaped ? `inset(0 round ${r / s}px)` : "";
  }
}

function closeSession() {
  if (!session) return;
  const { scrollY, content, fixed } = session;
  for (const element of [content, ...fixed]) {
    if (!element) continue;
    element.style.transform = "";
    element.style.transformOrigin = "";
    element.style.clipPath = "";
  }
  document.documentElement.removeAttribute("data-case-open");
  if (Math.abs(window.scrollY - scrollY) > 1) window.scrollTo({ top: scrollY, behavior: "instant" });
  session = null;
}

// ─── The state on screen ─────────────────────────────────────────────────────

let layer: Layer | null = null;
let basis: Basis | null = null;
let state: State | null = null;
let velocity = 0;
let run: { from: State; to: State; spring: ((t: number) => { progress: number; velocity: number }) | null; start: number; done?: () => void } | null = null;
let frame = 0;
/** The tile (or card) the sheet came from, hidden while the sheet stands in for it. */
let hidden: HTMLElement | null = null;
/** A copy of a sheet that has left its route, still on screen. */
let ghost: HTMLElement | null = null;
/** A sheet whose route is going, until we know whether another takes its place. */
let leaving: { dialog: HTMLDialogElement; slug: string } | null = null;
/** The card a click just opened, measured before its sheet replaced it. */
let clicked: { slug: string; origin: Origin; at: number } | null = null;
/**
 * A sheet that left for the next project, held still as a ghost until the next sheet opens
 * over it. React may take the old sheet down a commit before it puts the new one up.
 */
let awaiting: { slug: string; timer: number } | null = null;

function layerOf(root: HTMLElement): Layer {
  return {
    root,
    panel: root.querySelector<HTMLElement>("[data-case-panel]")!,
    dim: root.querySelector<HTMLElement>("[data-case-dim]")!,
    title: root.querySelector<HTMLElement>("[data-case-title]"),
    cover: root.querySelector<HTMLElement>("[data-case-cover]"),
    fades: Array.from(root.querySelectorAll<HTMLElement>("[data-case-fade]")),
  };
}

/** Where the sheet lays out its title and cover, as if scrolled to the top. */
function measure(target: Layer): Basis {
  const panel = rectOf(target.panel);
  const styles = getComputedStyle(target.panel);
  const scrollTop = target.panel.scrollTop;
  const top = (r: Rect): Rect => ({ ...r, y: r.y + scrollTop });
  return {
    panel,
    radius: { top: px(styles.borderTopLeftRadius), bottom: px(styles.borderBottomLeftRadius) },
    title: target.title ? { rect: top(rectOf(target.title)), size: fontSize(target.title) } : null,
    cover: target.cover ? { element: top(rectOf(target.cover)), drawing: top(drawingOf(target.cover)) } : null,
    scrollTop,
  };
}

/** The sheet open, as laid out. */
function opened(b: Basis, page = 1): State {
  const { panel, radius } = b;
  return { px: panel.x, py: panel.y, pw: panel.w, ph: panel.h, pr: radius.top, pb: radius.bottom, tx: 0, ty: 0, tk: 1, cx: 0, cy: 0, ck: 1, fade: 1, page, alpha: 1, dy: 0, scroll: 0 };
}

/**
 * The sheet folded into its tile; or, with no tile to fold into, faded out where it stands,
 * a little smaller. With reduced motion it only fades.
 */
function folded(b: Basis, origin: Origin | null, page = 0): State {
  const motion = session?.motion ?? !prefersReducedMotion();
  if (!origin || !motion) {
    const { panel } = b;
    const inset = motion ? Math.min(panel.w, panel.h) * 0.04 : 0;
    return { ...opened(b, page), px: panel.x + inset, py: panel.y + inset, pw: panel.w - 2 * inset, ph: panel.h - 2 * inset, fade: 0, alpha: 0 };
  }
  const state: State = { ...opened(b, page), px: origin.card.x, py: origin.card.y, pw: origin.card.w, ph: origin.card.h, pr: origin.radius, pb: origin.radius, fade: 0 };
  if (b.title && origin.title) {
    state.tk = origin.title.size / b.title.size;
    state.tx = origin.title.rect.x - b.title.rect.x;
    state.ty = origin.title.rect.y - b.title.rect.y;
  }
  if (b.cover && origin.cover) {
    const { element, drawing } = b.cover;
    const k = origin.cover.w / drawing.w;
    state.ck = k;
    state.cx = origin.cover.x - element.x - k * (drawing.x - element.x);
    state.cy = origin.cover.y - element.y - k * (drawing.y - element.y);
  }
  return state;
}

/** The same state, its title and cover offsets measured from where another sheet lays them out. */
function rebase(s: State, from: Basis, to: Basis): State {
  const next = { ...s };
  if (from.title && to.title) {
    next.tx += from.title.rect.x - to.title.rect.x;
    next.ty += from.title.rect.y - to.title.rect.y;
  }
  if (from.cover && to.cover) {
    next.cx += from.cover.element.x - to.cover.element.x;
    next.cy += from.cover.element.y - to.cover.element.y;
  }
  return next;
}

/** The content fades in over the second half of the opening, and out over the first half of the closing. */
const shown = (fade: number) => Math.min(1, Math.max(0, (fade - 0.45) / 0.55));

function paint(target: Layer, s: State, b: Basis) {
  const { panel } = b;
  const top = s.py - panel.y;
  const right = panel.x + panel.w - (s.px + s.pw);
  const bottom = panel.y + panel.h - (s.py + s.ph);
  const left = s.px - panel.x;
  const open = s.fade >= 1 && s.page >= 1 && s.dy === 0 && s.alpha >= 1 && Math.abs(top) + Math.abs(right) + Math.abs(bottom) + Math.abs(left) < 0.5;
  // At rest open, the sheet is plain layout again, so it follows resizes and scrolling.
  target.panel.style.clipPath = open ? "" : `inset(${top}px ${right}px ${bottom}px ${left}px round ${s.pr}px ${s.pr}px ${s.pb}px ${s.pb}px)`;
  target.panel.style.transform = s.dy ? `translateY(${s.dy}px)` : "";
  if (target.root.classList.contains("case-ghost")) target.panel.scrollTop = s.scroll;
  target.panel.style.opacity = s.alpha >= 1 ? "" : String(s.alpha);
  for (const [element, x, y, k] of [
    [target.title, s.tx, s.ty, s.tk],
    [target.cover, s.cx, s.cy, s.ck],
  ] as const) {
    if (!element) continue;
    const still = Math.abs(x) < 0.05 && Math.abs(y) < 0.05 && Math.abs(k - 1) < 0.0005;
    element.style.transformOrigin = still ? "" : "0 0";
    element.style.transform = still ? "" : `translate(${x}px, ${y}px) scale(${k})`;
  }
  const fade = shown(s.fade);
  for (const element of target.fades) element.style.opacity = fade >= 1 ? "" : String(fade);
  target.dim.style.opacity = String(s.page);
  paintPage(s.page);
}

function tick(now: number) {
  frame = 0;
  if (!run || !layer || !basis) return;
  const t = (now - run.start) / 1000;
  const step = run.spring ? run.spring(t) : { progress: Math.min(1, t / (durations.micro / 1000)), velocity: 0 };
  state = lerp(run.from, run.to, step.progress);
  velocity = step.velocity;
  const finished = run.spring ? atRest(step) : step.progress >= 1;
  if (finished) state = run.to;
  paint(layer, state, basis);
  if (finished) {
    const done = run.done;
    run = null;
    velocity = 0;
    done?.();
    return;
  }
  frame = requestAnimationFrame(tick);
}

/** Carries the state to `to` on the smooth spring, from where it is and at its speed. */
function animate(to: State, done?: () => void, start?: number) {
  const from = state ?? to;
  let v0 = start ?? 0;
  if (start === undefined && run) {
    // Turning around: keep the speed the page had, as a share of what's left to go.
    const speed = velocity * (run.to.page - run.from.page);
    const left = to.page - from.page;
    v0 = Math.abs(left) > 0.01 ? Math.max(-20, Math.min(20, speed / left)) : 0;
  }
  const motion = session?.motion ?? !prefersReducedMotion();
  run = { from, to, start: performance.now(), spring: motion ? springFrom(springs.smooth, v0) : null, done };
  if (!frame) frame = requestAnimationFrame(tick);
}

function originOf(slug: string): Origin | null {
  if (clicked && clicked.slug === slug && performance.now() - clicked.at < 3000) {
    const { origin } = clicked;
    clicked = null;
    return origin;
  }
  for (const element of document.querySelectorAll<HTMLElement>(`[data-work-origin="${CSS.escape(slug)}"]`)) {
    if (element.closest(".case-sheet, .case-ghost")) continue;
    const origin = measureOrigin(element);
    if (origin && visible(origin.card)) {
      hide(element);
      return unscaled(origin);
    }
  }
  return null;
}

function measureOrigin(element: HTMLElement): Origin | null {
  const card = rectOf(element);
  if (!card.w) return null;
  const title = element.querySelector("[data-work-title]");
  const cover = element.querySelector("[data-work-cover]");
  return {
    card,
    radius: px(getComputedStyle(element).borderTopLeftRadius),
    title: title ? { rect: rectOf(title), size: fontSize(title) } : null,
    cover: cover ? drawingOf(cover) : null,
  };
}

/** A tile measured in a scaled page, as it will be once the page is itself again. */
function unscaled(origin: Origin): Origin {
  const p = state?.page ?? 0;
  const s = session && session.motion ? 1 - (1 - session.scale) * p : 1;
  if (s === 1) return origin;
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const fix = (r: Rect): Rect => ({ x: cx + (r.x - cx) / s, y: cy + (r.y - cy) / s, w: r.w / s, h: r.h / s });
  return {
    card: fix(origin.card),
    radius: origin.radius / s,
    title: origin.title ? { rect: fix(origin.title.rect), size: origin.title.size / s } : null,
    cover: origin.cover ? fix(origin.cover) : null,
  };
}

function hide(element: HTMLElement | null) {
  if (hidden && hidden !== element) hidden.removeAttribute("data-work-open");
  hidden = element;
  hidden?.setAttribute("data-work-open", "");
}

/** A still copy of a sheet, so it can keep flying after its route has gone. */
function ghostOf(target: Layer): Layer {
  ghost?.remove();
  const copy = document.createElement("div");
  copy.className = "case-ghost";
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
  for (const name of ["data-surface", "data-case-sheet"]) {
    const value = target.root.getAttribute(name);
    if (value !== null) copy.setAttribute(name, value);
  }
  const scrollTop = basis?.scrollTop ?? target.panel.scrollTop;
  copy.append(target.dim.cloneNode(true), target.panel.cloneNode(true));
  for (const element of copy.querySelectorAll("[id]")) element.removeAttribute("id");
  document.body.append(copy);
  ghost = copy;
  const next = layerOf(copy);
  next.panel.scrollTop = scrollTop;
  return next;
}

function removeGhost() {
  ghost?.remove();
  ghost = null;
}

// ─── Opening and closing ─────────────────────────────────────────────────────

interface Sheet {
  dismiss: () => void;
}

/**
 * Opens a case study's sheet (components/work/case-sheet.tsx, in a layout effect) and
 * returns what closes it. `requestClose` leaves the route; the route's leaving closes it.
 */
export function presentSheet(dialog: HTMLDialogElement, slug: string, requestClose: () => void): Sheet {
  // React may take a sheet down and put the same one straight back (Strict Mode does).
  if (leaving?.dialog === dialog) {
    leaving = null;
    return sheetFor(dialog, slug, requestClose);
  }
  const replacing = leaving ? layer : null;
  leaving = null;

  openSession();
  let handover: Layer | null = null;
  if (replacing) {
    handover = ghostOf(replacing);
    if (replacing.root instanceof HTMLDialogElement && replacing.root.open) replacing.root.close();
    if (basis && state) paint(handover, state, basis);
  } else if (awaiting && awaiting.slug !== slug && layer && ghost) {
    window.clearTimeout(awaiting.timer);
    handover = layer;
  }
  awaiting = null;

  const returning = !replacing && ghost?.getAttribute("data-case-sheet") === slug && state !== null;
  const origin = originOf(slug);
  // Opened from the keyboard, the focus ring follows focus into the sheet; from a click, it
  // stays quiet (WebKit would ring the title).
  const keyboard = document.activeElement instanceof HTMLElement && document.activeElement.matches(":focus-visible");
  dialog.showModal();
  layer = layerOf(dialog);
  // Focus starts on the project's name, so a screen reader says what opened; × is a step back.
  layer.title?.focus({ preventScroll: true, focusVisible: keyboard } as FocusOptions);
  const fresh = measure(layer);

  if (returning && state && basis) {
    // Opened again while it was still folding away: pick it up from the ghost, where it is.
    state = rebase(state, basis, fresh);
    removeGhost();
    basis = fresh;
  } else {
    if (!handover) removeGhost();
    basis = fresh;
    state = folded(fresh, origin, state?.page ?? 0);
  }
  paint(layer, state, basis);
  animate(opened(basis), () => {
    // The next-project card it grew from is gone with the last sheet.
    if (handover) removeGhost();
    if (session?.motion) layer?.cover?.setAttribute("data-playing", "");
  });
  return sheetFor(dialog, slug, requestClose);
}

function sheetFor(dialog: HTMLDialogElement, slug: string, requestClose: () => void): Sheet {
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    requestClose();
  };

  const onCancel = (event: Event) => {
    event.preventDefault();
    close();
  };
  // A browser may close the dialog itself (an Escape it won't let a page refuse twice).
  const onClose = () => {
    if (layer?.root === dialog) close();
  };
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("[data-case-close]") || target.closest("[data-case-dim]")) {
      close();
      return;
    }
    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const hash = anchor.getAttribute("href")!;
    // Footnotes and their back-links move within the sheet, without a history entry, so
    // closing it is always one step back.
    if (hash.startsWith("#")) {
      event.preventDefault();
      const note = dialog.querySelector<HTMLElement>(`[id="${CSS.escape(hash.slice(1))}"]`);
      if (!note) return;
      note.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "instant" : "smooth" });
      if (note.tabIndex < 0 && !note.matches("a, button")) note.tabIndex = -1;
      note.focus({ preventScroll: true });
      return;
    }
    // The next project: remember the card, so the next sheet grows out of it.
    const next = anchor.closest<HTMLElement>("[data-work-origin]");
    if (next && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const origin = measureOrigin(next);
      if (origin) clicked = { slug: next.dataset.workOrigin!, origin, at: performance.now() };
    }
  };
  const onScroll = () => {
    if (basis && layer?.root === dialog) basis.scrollTop = layer.panel.scrollTop;
  };

  // A downward drag from the top of the sheet pulls it away (touch screens).
  let drag: { y: number; last: number; at: number; speed: number; active: boolean } | null = null;
  const panel = dialog.querySelector<HTMLElement>("[data-case-panel]")!;
  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || !state) return;
    // A sheet still settling open can be caught; one still growing out of its tile can't.
    if (run && (run.to.page < 1 || state.page < 0.9)) return;
    const y = event.touches[0].clientY;
    drag = { y, last: y, at: event.timeStamp, speed: 0, active: false };
  };
  const onTouchMove = (event: TouchEvent) => {
    if (!drag || !layer || !basis || !state || layer.root !== dialog) return;
    const y = event.touches[0].clientY;
    const dy = y - drag.y;
    if (!drag.active) {
      if (dy <= 0 || panel.scrollTop > 0) {
        if (dy < 0) drag = null;
        return;
      }
      drag.active = true;
      run = null;
    }
    event.preventDefault();
    const dt = Math.max(1, event.timeStamp - drag.at);
    drag.speed = ((y - drag.last) / dt) * 1000;
    drag.last = y;
    drag.at = event.timeStamp;
    const pulled = Math.max(0, dy);
    state = { ...opened(basis), dy: pulled, page: 1 - Math.min(1, pulled / basis.panel.h) };
    paint(layer, state, basis);
  };
  const onTouchEnd = () => {
    const ended = drag;
    drag = null;
    if (!ended?.active || !basis || !state) return;
    const far = state.dy > basis.panel.h * 0.25;
    const flung = ended.speed > basis.panel.h * 1.2;
    if (far || flung) {
      flingSpeed = ended.speed;
      close();
    } else {
      // Back into place, keeping the finger's speed: moving down, it gives a little first.
      animate(opened(basis), undefined, Math.min(20, Math.max(-20, -ended.speed / Math.max(1, state.dy))));
    }
  };

  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("close", onClose);
  dialog.addEventListener("click", onClick);
  panel.addEventListener("scroll", onScroll, { passive: true });
  panel.addEventListener("touchstart", onTouchStart, { passive: true });
  panel.addEventListener("touchmove", onTouchMove, { passive: false });
  panel.addEventListener("touchend", onTouchEnd);
  panel.addEventListener("touchcancel", onTouchEnd);

  return {
    dismiss() {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("click", onClick);
      panel.removeEventListener("scroll", onScroll);
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
      panel.removeEventListener("touchend", onTouchEnd);
      panel.removeEventListener("touchcancel", onTouchEnd);
      if (layer?.root !== dialog) return;
      // At rest it may have scrolled or resized: measure the sheet while it's still laid out
      // (React may hide it before the fold).
      const now = !run && panel.getBoundingClientRect().width > 0 ? measure(layer) : null;
      // Wait for the rest of this commit: another sheet may be taking this one's place.
      leaving = { dialog, slug };
      queueMicrotask(() => {
        if (leaving?.dialog !== dialog) return;
        leaving = null;
        fold(dialog, slug, now);
      });
    },
  };
}

/** How fast a drag let go, in pixels per second, for the fold that follows it. */
let flingSpeed = 0;

/** The sheet's route has gone: it flies back into its tile as a ghost. */
function fold(dialog: HTMLDialogElement, slug: string, now: Basis | null) {
  if (!layer || layer.root !== dialog || !basis || !state) return;
  const live = layer;
  if (now) {
    // Start from the sheet as it was laid out as it left, scrolled where it was.
    state = { ...opened(now, state.page), dy: state.dy, scroll: now.scrollTop };
    basis = now;
  } else if (!run) {
    state = { ...state, scroll: basis.scrollTop };
  }
  layer = ghostOf(live);
  if (dialog.open) dialog.close();
  paint(layer, state, basis);

  // Leaving for the next project: hold still until its sheet opens over this one.
  if (clicked && clicked.slug !== slug && performance.now() - clicked.at < durations.count) {
    run = null;
    velocity = 0;
    awaiting = { slug, timer: window.setTimeout(() => flyHome(slug), durations.count) };
    return;
  }
  flyHome(slug);
}

/** A ghost flies back into its project's tile, or fades where it is, and the page comes back. */
function flyHome(slug: string) {
  awaiting = null;
  if (!layer || !basis || !state) return;
  const target = targetOf(slug);
  const origin = target ? measureOrigin(target) : null;
  hide(target);
  const to = folded(basis, origin ? unscaled(origin) : null, 0);
  const speed = flingSpeed;
  flingSpeed = 0;
  const start = speed > 0 && state.dy > 0 ? Math.min(20, speed / Math.max(1, basis.panel.h)) : undefined;
  // Focus goes back to the tile, or to whatever opened the sheet.
  const link = target?.matches("a[href]") ? target : target?.querySelector<HTMLElement>("a[href]");
  const focus = link ?? session?.opener;
  focus?.focus({ preventScroll: true });
  animate(
    to,
    () => {
      removeGhost();
      hide(null);
      layer = null;
      basis = null;
      state = null;
      closeSession();
    },
    start,
  );
}

/** Where a closing sheet lands: its project's tile, if it's on screen. */
function targetOf(slug: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-work-origin="${CSS.escape(slug)}"]`)) {
    if (element.closest(".case-sheet, .case-ghost")) continue;
    if (visible(rectOf(element))) return element;
  }
  return null;
}
