/**
 * The cursor engine (DESIGN.md §6.1). Client only: components/cursor/cursor.tsx loads it
 * where a fine pointer can hover and the browser has the popover top layer.
 *
 * - The hotspot carries the dot. Its transform is written inside the pointermove handler,
 *   so it is never a frame behind the pointer. Nothing about the dot's position springs.
 * - The shape is the morphing companion: a tinted rounded rect around magnetic targets, a
 *   glass circle over media and drag areas, a ring when disabled or navigating. It moves on
 *   retargetable springs (lib/motion.ts stepSpring) in one frame loop that sleeps at rest.
 * - The state comes from what's under the pointer (resolve.ts), recomputed on pointermove
 *   and on scroll, because scrolling changes what sits under a still pointer.
 * - The root is a popover="manual" in the top layer. When a dialog or another popover
 *   opens, the root re-stacks itself above it; if the browser refuses, it moves into the
 *   topmost dialog.
 * - The native cursor stays until the first real pointer position, returns for touch and
 *   pen, over native zones (CSS exempts them) and for good if the engine fails: a watchdog
 *   catches a thrown error or 500ms without a frame while the pointer moves.
 */
import { type SpringState, springAtRest, springSettle, springs, stepSpring } from "../motion.ts";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "../reduced-motion.ts";
import { CURSOR } from "./config.ts";
import { type Ink, inkAt } from "./ink.ts";
import { startsNavigation } from "./navigation.ts";
import { type CursorKind, hasOwnText, lineHeightOf, type Resolution, resolveElement, textLineAt } from "./resolve.ts";
import { createShakeDetector } from "./shake.ts";

export interface CursorController {
  setLarge(large: boolean): void;
  destroy(): void;
}

type Variant = "magnetic" | "glass" | "ring" | "spinner";
type Mode = "anchored" | "absolute";

interface Geometry {
  /** The center. Anchored: an offset from the pointer. Absolute: viewport coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

interface Magnet {
  element: Element;
  /** The target's untranslated box under the pointer. */
  rect: { left: number; top: number; width: number; height: number };
  radius: number;
  drifts: boolean;
}

const KEYS = ["x", "y", "w", "h", "r"] as const;
const SPRING = springs.snappy;
const RELEASE_MS = Math.round(springSettle(SPRING) * 1000);
const NOOP: CursorController = { setLarge() {}, destroy() {} };

/** After the watchdog trips, the page keeps the system cursor until it reloads. */
let failed = false;
let logged = false;

const rest = (value: number): SpringState => ({ value, velocity: 0 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function readSizes() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
  return {
    dot: read("--cursor-dot"),
    small: read("--cursor-dot-small"),
    ring: read("--cursor-ring"),
    media: read("--cursor-media"),
    drag: read("--cursor-drag"),
    padding: read("--cursor-magnet-padding"),
    drift: read("--cursor-drift"),
    driftLabel: read("--cursor-drift-label"),
    large: read("--cursor-large") || 1,
  };
}

function part(tag: string, className: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/** A chevron for the drag circle, drawn like a Lucide icon. */
function chevron(path: string): SVGSVGElement {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  for (const [name, value] of [
    ["viewBox", "0 0 24 24"],
    ["fill", "none"],
    ["stroke", "currentColor"],
    ["stroke-linecap", "round"],
    ["stroke-linejoin", "round"],
  ]) {
    svg.setAttribute(name, value);
  }
  const line = document.createElementNS(namespace, "path");
  line.setAttribute("d", path);
  svg.append(line);
  return svg;
}

export function createCursor(options: { large: boolean }): CursorController {
  if (failed) return NOOP;

  const html = document.documentElement;
  const sizes = readSizes();
  let large = options.large;

  // ─── The DOM ─────────────────────────────────────────────────────────────────

  const root = part("div", "cursor");
  root.setAttribute("popover", "manual");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("data-cursor-root", "");
  root.setAttribute("data-hidden", "");
  root.setAttribute("data-state", "default");
  root.setAttribute("data-ink", "dark");
  root.setAttribute("data-tone", "light");
  root.toggleAttribute("data-large", large);

  const shape = part("div", "cursor-shape");
  shape.setAttribute("data-variant", "magnetic");
  const label = part("span", "cursor-label");
  const arrows = part("span", "cursor-arrows");
  arrows.append(chevron("m15 18-6-6 6-6"), chevron("m9 18 6-6-6-6"));
  shape.append(part("span", "cursor-glass material-glass"), label, arrows, part("span", "cursor-slash"));

  const hotspot = part("div", "cursor-hotspot");
  const pulse = part("span", "cursor-pulse");
  const dot = part("span", "cursor-dot");
  hotspot.append(pulse, dot);
  root.append(shape, hotspot);
  document.body.append(root);

  try {
    root.showPopover();
  } catch (error) {
    root.remove();
    report("the top layer is unavailable", error);
    return NOOP;
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  let destroyed = false;
  let x = 0;
  let y = 0;
  /** A real pointer position has arrived. Until then the native cursor stays. */
  let positioned = false;
  let showing = false;
  let inside = false;
  let target: Element | null = null;
  let hitDirty = false;
  let rehitDirty = false;
  let inkDirty = true;

  let current: Resolution = { kind: "default", element: null };
  let kind: CursorKind = "default";
  let beam = 0;
  let ink: Ink = "dark";
  let inkElement: Element | null = null;
  let sampledAt = -Infinity;
  let sampled = false;
  let resampleTimer = 0;

  let reduced = prefersReducedMotion();
  let pressed = false;
  let busy = false;
  let navigating = false;

  // The shape: five springs, anchored to the pointer or absolute in the viewport.
  let mode: Mode = "anchored";
  const spring: Record<(typeof KEYS)[number], SpringState> = {
    x: rest(0),
    y: rest(0),
    w: rest(sizes.dot),
    h: rest(sizes.dot),
    r: rest(sizes.dot / 2),
  };
  let shapeVisible = false;
  let shapeMoving = false;
  let variant: Variant = "magnetic";

  // The magnet and its drift.
  let magnet: Magnet | null = null;
  const drift = { x: rest(0), y: rest(0) };
  let applied = { x: 0, y: 0 };
  const releasing = new Map<Element, number>();

  // The top layer.
  let host: HTMLElement = document.body;
  let offsetX = 0;
  let offsetY = 0;
  const modals: HTMLDialogElement[] = [];

  // Timers and the watchdog.
  let framePending = false;
  let requestedAt = 0;
  let spacedMoves = 0;
  let lastSpaced = 0;
  let lastFrame = 0;
  let lastMove = 0;
  let idleTimer = 0;
  let shakeTimer = 0;
  const navigation = { delay: 0, poll: 0, timeout: 0 };
  const shaker = createShakeDetector();

  // ─── Failure ─────────────────────────────────────────────────────────────────

  function report(reason: string, error?: unknown) {
    if (logged) return;
    logged = true;
    console.warn(`Cursor: ${reason}. The system cursor takes over.`, error ?? "");
  }

  function fail(reason: string, error?: unknown) {
    if (destroyed) return;
    failed = true;
    html.classList.remove("cursor-custom");
    try {
      teardown();
    } finally {
      report(reason, error);
    }
  }

  /** Runs a handler; if it throws, the system cursor takes over (§6.1 watchdog). */
  function guard<A extends unknown[]>(handler: (...args: A) => void): (...args: A) => void {
    return (...args: A) => {
      if (destroyed) return;
      try {
        handler(...args);
      } catch (error) {
        fail("the cursor loop threw", error);
      }
    };
  }

  // ─── Frames ──────────────────────────────────────────────────────────────────

  function requestFrame() {
    if (framePending || destroyed) return;
    framePending = true;
    requestedAt = performance.now();
    spacedMoves = 0;
    lastSpaced = 0;
    window.requestAnimationFrame(frame);
  }

  /** Called on every move: if frames have stopped while the pointer genuinely moves, give up. */
  function watch() {
    if (!framePending) return;
    const now = performance.now();
    // A backlog of moves after a long task arrives in a burst; only spaced moves count.
    if (now - lastSpaced >= CURSOR.watchdogSpacingMs) {
      spacedMoves += 1;
      lastSpaced = now;
    }
    if (spacedMoves >= CURSOR.watchdogMoves && now - requestedAt > CURSOR.watchdogMs) {
      fail(`no animation frame for ${CURSOR.watchdogMs}ms while the pointer moved`);
    }
  }

  const frame = guard((now: number) => {
    framePending = false;
    const elapsed = lastFrame ? clamp(now - lastFrame, 0, 100) / 1000 : 1 / 60;
    lastFrame = now;
    if (!positioned) return;
    if (hitDirty || rehitDirty || inkDirty) update();
    const moving = step(elapsed);
    if (moving) requestFrame();
    else lastFrame = 0;
  });

  // ─── What's under the pointer ────────────────────────────────────────────────

  function update() {
    let element = target;
    const rehit = rehitDirty || !element || !element.isConnected;
    if (rehit) element = document.elementFromPoint(x, y);
    hitDirty = false;
    rehitDirty = false;

    let next = resolveElement(element);
    let line = 0;
    if (next.kind === "default" && element && hasOwnText(element)) {
      const height = textLineAt(x, y);
      if (height) {
        next = { kind: "text", element };
        line = height;
      }
    } else if (next.kind === "text" && next.element) {
      line = lineHeightOf(next.element);
    }
    apply(next, line);
    if (magnet) {
      const rect = measure(magnet.element);
      if (rect.width && rect.height) magnet.rect = rect;
    }

    const now = performance.now();
    if (inkDirty || rehit || element !== inkElement || (sampled && now - sampledAt > CURSOR.sampleEveryMs)) {
      inkDirty = false;
      inkElement = element;
      const reading = inkAt(element, x, y, (sizes.dot * factor()) / 2);
      sampled = reading.sampled;
      sampledAt = now;
      setInk(reading.ink);
      // A video changes under a still pointer: look again shortly.
      window.clearTimeout(resampleTimer);
      if (sampled && element instanceof HTMLVideoElement) {
        resampleTimer = window.setTimeout(() => {
          inkDirty = true;
          requestFrame();
        }, CURSOR.sampleEveryMs);
      }
    }
  }

  function apply(next: Resolution, line: number) {
    if (next.kind === "text" && line !== beam) {
      beam = line;
      root.style.setProperty("--cursor-beam", `${line}px`);
    }
    if (next.kind === current.kind && next.element === current.element && next.label === current.label) return;
    current = next;
    let resolved = next.kind;

    const magnetic = resolved === "magnetic" ? next.element : null;
    if (magnet && magnet.element !== magnetic) releaseMagnet();
    if (magnetic && !magnet && !beginMagnet(magnetic)) resolved = "default";

    if (next.kind === "media") label.textContent = next.label ?? "";
    if (resolved !== kind) {
      kind = resolved;
      root.setAttribute("data-state", kind);
      root.toggleAttribute("data-native", kind === "native");
    }
  }

  function setInk(next: Ink) {
    if (next === ink) return;
    ink = next;
    root.setAttribute("data-ink", ink);
    // The shape's glass and label take the tone of what's behind them.
    root.setAttribute("data-tone", ink === "light" ? "dark" : "light");
  }

  // ─── The magnet ──────────────────────────────────────────────────────────────

  function measure(element: Element): Magnet["rect"] {
    const rects = element.getClientRects();
    let rect = rects.length === 1 ? rects[0] : element.getBoundingClientRect();
    if (rects.length > 1) {
      // A link that wraps: the line under the pointer.
      let nearest = Infinity;
      for (const candidate of Array.from(rects)) {
        const dx = Math.max(candidate.left - x, 0, x - candidate.right);
        const dy = Math.max(candidate.top - y, 0, y - candidate.bottom);
        if (dx * dx + dy * dy < nearest) {
          nearest = dx * dx + dy * dy;
          rect = candidate;
        }
      }
    }
    const own = magnet?.element === element;
    return {
      left: rect.left - (own ? applied.x : 0),
      top: rect.top - (own ? applied.y : 0),
      width: rect.width,
      height: rect.height,
    };
  }

  function beginMagnet(element: Element): boolean {
    const rect = measure(element);
    if (!rect.width || !rect.height) return false;
    if (rect.width > CURSOR.magnetMax.width || rect.height > CURSOR.magnetMax.height) return false;
    const style = getComputedStyle(element);
    const corner = style.borderTopLeftRadius;
    let radius = parseFloat(corner) || 0;
    if (corner.endsWith("%")) radius = (radius / 100) * Math.min(rect.width, rect.height);
    // Inline boxes can't move, and with reduced motion nothing drifts.
    const drifts = !reduced && element instanceof HTMLElement && style.display !== "inline";
    const accent = style.getPropertyValue("--color-accent").trim();
    if (accent) shape.style.setProperty("--cursor-accent", accent);
    else shape.style.removeProperty("--cursor-accent");

    const timer = releasing.get(element);
    if (timer) {
      window.clearTimeout(timer);
      releasing.delete(element);
    }
    magnet = { element, rect, radius, drifts };
    drift.x = rest(0);
    drift.y = rest(0);
    applied = { x: 0, y: 0 };
    if (drifts) element.setAttribute("data-cursor-magnet", "active");
    return true;
  }

  function writeDrift(element: Element, dx: number, dy: number) {
    const style = (element as HTMLElement).style;
    const label = sizes.drift ? sizes.driftLabel / sizes.drift - 1 : 0;
    style.setProperty("--cursor-drift-x", `${dx}px`);
    style.setProperty("--cursor-drift-y", `${dy}px`);
    style.setProperty("--cursor-label-x", `${dx * label}px`);
    style.setProperty("--cursor-label-y", `${dy * label}px`);
    applied = { x: dx, y: dy };
  }

  function clearDrift(element: Element) {
    const style = (element as HTMLElement).style;
    for (const name of ["--cursor-drift-x", "--cursor-drift-y", "--cursor-label-x", "--cursor-label-y"]) {
      style.removeProperty(name);
    }
  }

  /** The target springs back on its own (CSS), so leaving costs the loop nothing. */
  function releaseMagnet(immediately = false) {
    if (!magnet) return;
    const { element, drifts } = magnet;
    magnet = null;
    applied = { x: 0, y: 0 };
    if (!drifts) return;
    clearDrift(element);
    if (immediately || reduced) {
      element.removeAttribute("data-cursor-magnet");
      return;
    }
    element.setAttribute("data-cursor-magnet", "release");
    releasing.set(
      element,
      window.setTimeout(() => {
        releasing.delete(element);
        if (element.getAttribute("data-cursor-magnet") === "release") element.removeAttribute("data-cursor-magnet");
      }, RELEASE_MS),
    );
  }

  // ─── The shape ───────────────────────────────────────────────────────────────

  function factor() {
    return large ? sizes.large : 1;
  }

  function goal(): { mode: Mode; visible: boolean; variant: Variant | null; geometry: Geometry } {
    const scale = factor();
    const circle = (size: number, look: Variant) => ({
      mode: "anchored" as const,
      visible: true,
      variant: look,
      geometry: { x: 0, y: 0, w: size, h: size, r: size / 2 },
    });
    if (busy && kind !== "native") return circle(sizes.ring * scale, "spinner");
    if (kind === "magnetic" && magnet) {
      const { rect, radius } = magnet;
      const w = rect.width + 2 * sizes.padding;
      const h = rect.height + 2 * sizes.padding;
      return {
        mode: "absolute",
        visible: true,
        variant: "magnetic",
        geometry: {
          x: rect.left + rect.width / 2 + drift.x.value,
          y: rect.top + rect.height / 2 + drift.y.value,
          w,
          h,
          r: Math.min(radius + sizes.padding, Math.min(w, h) / 2),
        },
      };
    }
    if (kind === "media") return circle(sizes.media * scale, "glass");
    if (kind === "drag") return circle(sizes.drag * scale, "glass");
    if (kind === "disabled") return circle(sizes.ring * scale, "ring");
    const size = sizes.dot * scale;
    return { mode: "anchored", visible: false, variant: null, geometry: { x: 0, y: 0, w: size, h: size, r: size / 2 } };
  }

  function setMode(next: Mode) {
    if (next === mode) return;
    const sign = next === "absolute" ? 1 : -1;
    spring.x = { ...spring.x, value: spring.x.value + sign * x };
    spring.y = { ...spring.y, value: spring.y.value + sign * y };
    mode = next;
  }

  /** Advances the drift and the shape by `elapsed` seconds. Returns true while anything moves. */
  function step(elapsed: number): boolean {
    let moving = false;

    if (magnet?.drifts) {
      const { rect } = magnet;
      const goalX = clamp((x - rect.left - rect.width / 2) / (rect.width / 2), -1, 1) * sizes.drift;
      const goalY = clamp((y - rect.top - rect.height / 2) / (rect.height / 2), -1, 1) * sizes.drift;
      drift.x = stepSpring(drift.x, goalX, elapsed, SPRING);
      drift.y = stepSpring(drift.y, goalY, elapsed, SPRING);
      if (springAtRest(drift.x, goalX, CURSOR.restPx)) drift.x = rest(goalX);
      else moving = true;
      if (springAtRest(drift.y, goalY, CURSOR.restPx)) drift.y = rest(goalY);
      else moving = true;
      if (drift.x.value !== applied.x || drift.y.value !== applied.y) writeDrift(magnet.element, drift.x.value, drift.y.value);
    }

    const next = goal();
    setMode(next.mode);
    if (next.variant && next.variant !== variant) {
      variant = next.variant;
      shape.setAttribute("data-variant", variant);
    }
    if (next.visible !== shapeVisible) {
      shapeVisible = next.visible;
      shape.toggleAttribute("data-visible", shapeVisible);
    }

    let changed = false;
    for (const key of KEYS) {
      const to = next.geometry[key];
      const before = spring[key].value;
      spring[key] = reduced ? rest(to) : stepSpring(spring[key], to, elapsed, SPRING);
      if (springAtRest(spring[key], to, CURSOR.restPx)) spring[key] = rest(to);
      else moving = true;
      if (spring[key].value !== before) changed = true;
    }
    shapeMoving = moving;
    if (changed || shapeVisible) writeShape(changed);
    return moving;
  }

  function writeShape(resize = true) {
    const w = Math.max(0, spring.w.value);
    const h = Math.max(0, spring.h.value);
    const cx = (mode === "anchored" ? x + spring.x.value : spring.x.value) - offsetX;
    const cy = (mode === "anchored" ? y + spring.y.value : spring.y.value) - offsetY;
    shape.style.translate = `${cx - w / 2}px ${cy - h / 2}px`;
    if (!resize) return;
    const r = clamp(spring.r.value, 0, Math.min(w, h) / 2);
    shape.style.width = `${w}px`;
    shape.style.height = `${h}px`;
    shape.style.borderRadius = `${r}px`;
    shape.toggleAttribute("data-capsule", r >= Math.min(w, h) / 2 - 0.5);
  }

  /** Re-entry: the shape starts at the pointer, never flying in from where it was. */
  function snapShape() {
    const next = goal();
    mode = next.mode;
    for (const key of KEYS) spring[key] = rest(next.geometry[key]);
    if (mode === "anchored") {
      spring.x = rest(0);
      spring.y = rest(0);
    }
    writeShape();
  }

  // ─── Showing and hiding ──────────────────────────────────────────────────────

  function reveal() {
    if (showing) return;
    showing = true;
    root.removeAttribute("data-fade");
    root.removeAttribute("data-hidden");
    html.classList.add("cursor-custom");
  }

  /** Leaving the window fades the cursor out; the native cursor has nothing to show. */
  function conceal(fade: boolean) {
    showing = false;
    root.toggleAttribute("data-fade", fade);
    root.setAttribute("data-hidden", "");
    shaker.reset();
  }

  /** Touch, pen and native drag-and-drop: the system cursor, at once. */
  function yieldToNative() {
    conceal(false);
    html.classList.remove("cursor-custom");
    release();
  }

  function release() {
    if (!pressed) return;
    pressed = false;
    root.removeAttribute("data-pressed");
  }

  // ─── Locating ────────────────────────────────────────────────────────────────

  function shake() {
    root.setAttribute("data-shaking", "");
    window.clearTimeout(shakeTimer);
    shakeTimer = window.setTimeout(() => root.removeAttribute("data-shaking"), CURSOR.shake.growMs);
  }

  /** One pulse per idle period: the timer re-arms only after the pointer moves again. */
  function armIdle() {
    root.removeAttribute("data-idle");
    if (!idleTimer) idleTimer = window.setTimeout(checkIdle, CURSOR.idleMs);
  }

  function checkIdle() {
    idleTimer = 0;
    const still = performance.now() - lastMove;
    if (still < CURSOR.idleMs) {
      idleTimer = window.setTimeout(checkIdle, CURSOR.idleMs - still);
      return;
    }
    if (inside && showing && kind !== "native" && document.visibilityState === "visible") {
      root.setAttribute("data-idle", "");
    }
  }

  // ─── Navigating ──────────────────────────────────────────────────────────────

  function refreshBusy() {
    const next = navigating || html.hasAttribute("data-cursor-busy");
    if (next === busy) return;
    busy = next;
    root.toggleAttribute("data-busy", busy);
    requestFrame();
  }

  function stopNavigating() {
    window.clearTimeout(navigation.delay);
    window.clearInterval(navigation.poll);
    window.clearTimeout(navigation.timeout);
    navigating = false;
    refreshBusy();
  }

  function startNavigating() {
    stopNavigating();
    const from = location.href;
    navigation.delay = window.setTimeout(() => {
      navigating = true;
      refreshBusy();
    }, CURSOR.navigatingDelayMs);
    navigation.poll = window.setInterval(() => {
      if (location.href !== from) stopNavigating();
    }, CURSOR.navigatingPollMs);
    navigation.timeout = window.setTimeout(stopNavigating, CURSOR.navigatingTimeoutMs);
  }

  // ─── The top layer ───────────────────────────────────────────────────────────

  function raise() {
    if (destroyed) return;
    try {
      if (host !== document.body) {
        document.body.append(root);
        host = document.body;
        root.removeAttribute("data-reparented");
      }
      if (root.matches(":popover-open")) root.hidePopover();
      root.showPopover();
    } catch {
      // The browser won't re-stack the popover: ride inside the topmost dialog instead.
      const dialog = modals.at(-1);
      host = dialog ?? document.body;
      host.append(root);
      root.setAttribute("data-reparented", "");
    }
    measureOffset();
    if (positioned) {
      hotspot.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0)`;
      writeShape();
    }
  }

  const restack = guard(raise);

  /** Inside a transformed dialog, fixed positions start at the dialog's corner. */
  function measureOffset() {
    if (host === document.body) {
      offsetX = 0;
      offsetY = 0;
      return;
    }
    const rect = root.getBoundingClientRect();
    offsetX = rect.left;
    offsetY = rect.top;
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  const onPointerMove = guard((event: PointerEvent) => {
    if (!event.isTrusted) return;
    if (event.pointerType !== "mouse") {
      yieldToNative();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    inside = true;
    if (host !== document.body) measureOffset();
    // Zero lag: the dot moves here, in the handler, not a frame later.
    hotspot.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0)`;
    target = event.target instanceof Element ? event.target : null;
    if (!showing) {
      positioned = true;
      hitDirty = true;
      update();
      snapShape();
      reveal();
    } else if (mode === "anchored" && (shapeVisible || shapeMoving)) {
      writeShape(false);
    }
    hitDirty = true;
    if (pressed && event.buttons === 0) release();
    if (shaker.push(x, event.timeStamp)) shake();
    lastMove = performance.now();
    armIdle();
    watch();
    requestFrame();
  });

  const onPointerOver = guard((event: PointerEvent) => {
    if (!event.isTrusted || event.pointerType !== "mouse" || !positioned) return;
    target = event.target instanceof Element ? event.target : null;
    hitDirty = true;
    requestFrame();
  });

  const onPointerOut = guard((event: PointerEvent) => {
    if (!event.isTrusted || event.pointerType !== "mouse" || event.relatedTarget) return;
    inside = false;
    conceal(true);
  });

  const onPointerDown = guard((event: PointerEvent) => {
    if (!event.isTrusted) return;
    if (event.pointerType !== "mouse") {
      yieldToNative();
      return;
    }
    pressed = true;
    root.setAttribute("data-pressed", "");
  });

  const onPointerUp = guard(() => release());

  const onScroll = guard(() => {
    if (!positioned) return;
    rehitDirty = true;
    requestFrame();
  });

  const onClick = guard((event: MouseEvent) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (anchor instanceof HTMLAnchorElement && startsNavigation(event, anchor, location)) startNavigating();
  });

  const onToggle = guard((event: Event) => {
    if (event.target === root) return;
    if ((event as ToggleEvent).newState === "open") queueMicrotask(restack);
    rehitDirty = true;
    requestFrame();
  });

  const onVisibility = guard(() => {
    if (document.visibilityState === "hidden") conceal(false);
  });

  const onDragStart = guard(() => yieldToNative());
  const onMotion = guard(() => refreshPage());

  function refreshPage() {
    reduced = prefersReducedMotion();
    if (reduced && magnet?.drifts) {
      const element = magnet.element;
      releaseMagnet(true);
      if (kind === "magnetic") beginMagnet(element);
    }
    refreshBusy();
    inkDirty = true;
    rehitDirty = true;
    requestFrame();
  }

  const observer = new MutationObserver(
    guard((records: MutationRecord[]) => {
      let page = false;
      let restack = false;
      for (const record of records) {
        if (record.target === html) {
          page = true;
          continue;
        }
        if (record.target instanceof HTMLDialogElement) {
          const dialog = record.target;
          const index = modals.indexOf(dialog);
          if (index !== -1) modals.splice(index, 1);
          if (dialog.open && dialog.matches(":modal")) modals.push(dialog);
          restack = true;
        }
      }
      if (restack) raise();
      if (page || restack) refreshPage();
    }),
  );
  observer.observe(html, {
    attributes: true,
    attributeFilter: ["data-theme", "data-surface-active", "data-finish", "data-motion", "data-cursor-busy"],
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["open"], subtree: true });

  const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const capture = { capture: true, passive: true } as const;
  window.addEventListener("pointermove", onPointerMove, capture);
  window.addEventListener("pointerover", onPointerOver, capture);
  window.addEventListener("pointerout", onPointerOut, capture);
  window.addEventListener("pointerdown", onPointerDown, capture);
  window.addEventListener("pointerup", onPointerUp, capture);
  window.addEventListener("pointercancel", onPointerUp, capture);
  window.addEventListener("click", onClick, capture);
  window.addEventListener("dragstart", onDragStart, capture);
  window.addEventListener("scroll", onScroll, capture);
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("blur", onPointerUp);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("beforetoggle", onToggle, true);
  document.addEventListener("toggle", onToggle, true);
  document.addEventListener("fullscreenchange", restack);
  document.addEventListener("webkitfullscreenchange", restack);
  motionQuery.addEventListener("change", onMotion);
  pulse.addEventListener("animationend", () => root.removeAttribute("data-idle"));

  function teardown() {
    destroyed = true;
    html.classList.remove("cursor-custom");
    observer.disconnect();
    window.removeEventListener("pointermove", onPointerMove, capture);
    window.removeEventListener("pointerover", onPointerOver, capture);
    window.removeEventListener("pointerout", onPointerOut, capture);
    window.removeEventListener("pointerdown", onPointerDown, capture);
    window.removeEventListener("pointerup", onPointerUp, capture);
    window.removeEventListener("pointercancel", onPointerUp, capture);
    window.removeEventListener("click", onClick, capture);
    window.removeEventListener("dragstart", onDragStart, capture);
    window.removeEventListener("scroll", onScroll, capture);
    window.removeEventListener("resize", onScroll);
    window.removeEventListener("blur", onPointerUp);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("beforetoggle", onToggle, true);
    document.removeEventListener("toggle", onToggle, true);
    document.removeEventListener("fullscreenchange", restack);
    document.removeEventListener("webkitfullscreenchange", restack);
    motionQuery.removeEventListener("change", onMotion);
    for (const timer of [idleTimer, shakeTimer, resampleTimer, navigation.delay, navigation.timeout]) {
      window.clearTimeout(timer);
    }
    window.clearInterval(navigation.poll);
    releaseMagnet(true);
    for (const [element, timer] of releasing) {
      window.clearTimeout(timer);
      element.removeAttribute("data-cursor-magnet");
    }
    releasing.clear();
    try {
      if (root.matches(":popover-open")) root.hidePopover();
    } catch {
      // Removing it below takes it out of the top layer anyway.
    }
    root.remove();
  }

  return {
    setLarge(next: boolean) {
      if (destroyed || next === large) return;
      large = next;
      root.toggleAttribute("data-large", large);
      inkDirty = true;
      requestFrame();
    },
    destroy() {
      if (!destroyed) teardown();
    },
  };
}
