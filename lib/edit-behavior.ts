import { activeAt, EDIT, type EditTrackId, isoToday, monthsAt, playStep, type ScrubClip, scrubMap, shuttle, targetOf, timeAt } from "./edit";
import { measure as frameRead, mutate } from "./frame";
import { durations, gsapEase, type SpringState, springAtRest, springs, stepSpring } from "./motion";
import { prefersReducedMotion } from "./reduced-motion";
import { editShuttle } from "./surprises/edit-shuttle";

/** What the server tells the edit: where its scale starts, Akshat's time zone and every clip. */
export interface EditData {
  start: string;
  timeZone: string;
  clips: { id: string; track: EditTrackId; lane: number; start: string; end: string | null; panel: string }[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Aug 2025", for months since year 0. */
const monthLabel = (t: number) => `${MONTHS[Math.floor(t % 12)]} ${Math.floor(t / 12)}`;

type Motion = { kind: "spring"; goal: number; state: SpringState } | { kind: "play"; speed: number };

/** A computed CSS time ("3s", "450ms") in milliseconds. */
const parseTime = (value: string) => {
  const number = parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.trim().endsWith("ms") ? number : number * 1000;
};

/**
 * "The edit" (DESIGN.md §7.4), layered onto server-rendered markup and loaded as the section
 * comes near (components/ui/behavior.tsx), so it costs the first load nothing. On wide, tall
 * screens with motion it pins and scrubs: the playhead follows the scroll exactly, the clip
 * under it plays in the viewer, a click or a focus springs the playhead to a clip, and while
 * the timeline has focus Space plays and pauses and J, K and L shuttle. Playing scrolls the
 * page, so the visitor's own scroll always wins: any scroll it didn't make stops it, and
 * nothing holds the page. Elsewhere it leaves the cards and the read-only strip alone. CSS
 * decides whether it pins, so the section's height is the same before this arrives.
 */
export function attachEdit(root: HTMLElement, { start, timeZone, clips }: EditData): () => void {
  const stage = root.querySelector<HTMLElement>(".edit-stage");
  const timeline = root.querySelector<HTMLElement>(".edit-timeline");
  if (!stage || !timeline) return () => {};
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".edit-clip"));
  const panels = new Map(Array.from(root.querySelectorAll<HTMLElement>(".edit-panel"), (panel) => [panel.dataset.panel!, panel]));
  const label = root.querySelector<HTMLElement>(".edit-playhead-time");
  const overlay = root.querySelector<HTMLElement>(".edit-overlay");
  const hint = root.querySelector<HTMLElement>(".edit-hint");
  const viewer = root.querySelector<HTMLElement>(".edit-viewer");
  const texts = Array.from(root.querySelectorAll<HTMLElement>(".edit-panel-text"));
  const honors = buttons.filter((button) => button.dataset.track === "honors");
  const html = document.documentElement;

  // The scale runs from the first clip to today; ongoing clips end there.
  const today = isoToday(timeZone, new Date());
  const from = monthsAt(start);
  const to = monthsAt(today);
  root.style.setProperty("--span", (to - from).toFixed(3));
  root.setAttribute("data-today", "");
  const scrub: ScrubClip[] = clips.map((clip) => ({ id: clip.id, track: clip.track, lane: clip.lane, from: monthsAt(clip.start), to: monthsAt(clip.end ?? today) }));
  for (const clip of clips) {
    if (clip.end && monthsAt(clip.end) > to) buttons.find((button) => button.dataset.clip === clip.id)?.setAttribute("data-continues", "");
  }
  const map = scrubMap(scrub, from, to);
  const byId = new Map(scrub.map((clip) => [clip.id, clip]));
  const panelOf = new Map(clips.map((clip) => [clip.id, clip.panel]));

  let editing = false;
  let top = 0;
  let length = 1;
  let active: string | null = null;
  /** A honor chosen by click or focus: honors are markers, shown only when chosen. */
  let chosen: ScrubClip | null = null;
  let honor = 0;
  let motion: Motion | null = null;
  let expected = Number.NaN;
  let frame = 0;
  let last = 0;
  let counting = 0;

  const measure = () => {
    top = root.getBoundingClientRect().top + window.scrollY;
    length = Math.max(1, root.offsetHeight - stage.offsetHeight);
  };

  /** Pinned, does every panel fit the viewer? Offsets, so the Resolve's transforms don't count. */
  const fits = () => {
    if (!viewer) return false;
    const room = viewer.clientHeight + 1;
    return texts.every((text) => {
      const first = text.firstElementChild as HTMLElement | null;
      const last = text.lastElementChild as HTMLElement | null;
      return !first || !last || last.offsetTop + last.offsetHeight - first.offsetTop <= room;
    });
  };

  // A clip's name sits inside it when it fits, beside it when its lane has room there, and
  // otherwise is left to the viewer and the clip's accessible name. Measured: names and the
  // scale vary.
  const place = () => {
    for (const button of buttons) button.removeAttribute("data-label");
    const margin = 2 * parseFloat(getComputedStyle(root).getPropertyValue("--spacing"));
    const rows = new Map<string, { button: HTMLButtonElement; left: number; right: number; room: number; need: number }[]>();
    for (const button of buttons) {
      const clip = byId.get(button.dataset.clip ?? "");
      const title = button.querySelector<HTMLElement>(".edit-clip-title");
      if (!clip || !title) continue;
      const box = button.getBoundingClientRect();
      const key = `${clip.track} ${clip.lane}`;
      rows.set(key, [...(rows.get(key) ?? []), { button, left: box.left, right: box.right, room: title.clientWidth, need: title.scrollWidth }]);
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.left - b.left);
      row.forEach((entry, i) => {
        const end = row[i + 1]?.left ?? entry.button.parentElement!.getBoundingClientRect().right;
        const spot = entry.need <= entry.room ? "inside" : entry.need + margin <= end - entry.right ? "beside" : "none";
        entry.button.setAttribute("data-label", spot);
      });
    }
  };
  const progress = () => Math.min(1, Math.max(0, (window.scrollY - top) / length));

  /** A figure's digits, at a share of its stated value. */
  const figure = (element: HTMLElement, share: number) => {
    const target = Number(element.dataset.count) * share;
    element.textContent = element.hasAttribute("data-group")
      ? Math.round(target).toLocaleString("en-US")
      : target.toFixed(Number(element.dataset.decimals ?? 0));
  };
  const figures = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));

  /** Every figure as stated: when a count is cut short, and whenever the edit is a stack. */
  const settle = () => {
    cancelAnimationFrame(counting);
    for (const element of figures) figure(element, 1);
  };

  /** The panel's figures count up from zero, once, each time it comes on. */
  const count = (panel: HTMLElement) => {
    settle();
    if (prefersReducedMotion()) return;
    const ease = gsapEase("out");
    const start = performance.now();
    // A figure inside a visual starts counting when the visual shows it (--count-delay, CSS).
    const counted = Array.from(panel.querySelectorAll<HTMLElement>("[data-count]"), (element) => ({
      element,
      begin: start + parseTime(getComputedStyle(element).getPropertyValue("--count-delay")),
    }));
    const tick = (now: number) => {
      let running = false;
      for (const { element, begin } of counted) {
        const t = Math.min(1, Math.max(0, (now - begin) / durations.count));
        figure(element, ease(t));
        running ||= t < 1;
      }
      if (running) counting = requestAnimationFrame(tick);
    };
    for (const { element } of counted) figure(element, 0);
    counting = requestAnimationFrame(tick);
  };

  const setActive = (panel: string | null) => {
    if (panel === active) return;
    active = panel;
    for (const [id, element] of panels) {
      const on = id === panel;
      element.toggleAttribute("data-active", on);
      element.inert = !on;
    }
    for (const button of buttons) {
      if (button.dataset.panel === panel) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    }
    const element = panel ? panels.get(panel) : null;
    if (element) count(element);
  };

  // Where the playhead is, read from the scroll; then everything that shows it, written.
  let shown = 0;
  const apply = () => {
    if (!editing) return;
    const t = shown;
    // On the overlay, the only thing that reads it: set on the section, every frame of the
    // scrub would restyle every panel too (Part 16).
    overlay?.style.setProperty("--playhead", (t - from).toFixed(4));
    if (label) label.textContent = monthLabel(t);
    // A chosen honor holds while the spring carries the playhead to its year, and lets go
    // once the playhead leaves that year.
    if (chosen && motion?.kind !== "spring" && (t < chosen.from || t >= chosen.to)) chosen = null;
    const clip = chosen?.id ?? activeAt(map, t);
    setActive(clip ? (panelOf.get(clip) ?? null) : null);
  };
  const render = () => {
    shown = timeAt(map, progress());
    apply();
  };

  const setHint = () => {
    if (hint) hint.textContent = motion?.kind === "play" ? "Press Space to pause" : "Press Space to play";
  };

  const stop = () => {
    motion = null;
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    root.removeAttribute("data-playing");
    setHint();
  };

  const step = (now: number) => {
    frame = 0;
    if (!motion) return;
    // The visitor scrolled since the last frame: theirs wins, before this one overrides it.
    if (Math.abs(window.scrollY - expected) > 2) {
      stop();
      render();
      return;
    }
    const elapsed = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    let p = progress();
    if (motion.kind === "spring") {
      motion.state = stepSpring(motion.state, motion.goal, elapsed, springs.smooth);
      p = Math.min(1, Math.max(0, motion.state.value));
      if (springAtRest(motion.state, motion.goal, 0.0005)) {
        p = motion.goal;
        motion = null;
      }
    } else {
      p = playStep(map, p, motion.speed, elapsed);
      if ((motion.speed > 0 && p >= 1) || (motion.speed < 0 && p <= 0)) motion = null;
    }
    window.scrollTo(0, top + p * length);
    expected = window.scrollY;
    if (motion) frame = requestAnimationFrame(step);
    else stop();
  };

  const run = (next: Motion) => {
    motion = next;
    expected = window.scrollY;
    root.toggleAttribute("data-playing", next.kind === "play");
    setHint();
    if (!frame) frame = requestAnimationFrame(step);
  };

  const springTo = (goal: number) => run({ kind: "spring", goal, state: { value: progress(), velocity: 0 } });
  const play = (speed: number) => run({ kind: "play", speed });

  const roving = () => {
    honors.forEach((button, i) => {
      button.tabIndex = editing && i === honor ? 0 : -1;
    });
  };

  const choose = (button: HTMLButtonElement) => {
    const clip = byId.get(button.dataset.clip ?? "");
    if (!clip) return;
    chosen = clip.track === "honors" ? clip : null;
    if (clip.track === "honors") {
      honor = honors.indexOf(button);
      roving();
    }
    springTo(targetOf(map, clip));
    if (chosen) setActive(panelOf.get(clip.id) ?? null);
  };

  // The visitor's own scroll is always in charge: anything not ours stops playback. A scroll
  // reads with the frame's other reads and writes after them (lib/frame.ts).
  const scrolled = () => {
    if (!editing) return;
    if (motion && Math.abs(window.scrollY - expected) > 2) stop();
    shown = timeAt(map, progress());
    mutate(apply);
  };
  const onScroll = () => frameRead(scrolled);
  const onWheel = () => motion && stop();

  const onClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(".edit-clip");
    if (button && editing) choose(button);
  };
  // Tab moves through the clips: each one focused is chosen. The browser scrolls a focused
  // clip into view after this event, so the choice waits a frame rather than take that
  // scroll for the visitor's own and stop.
  let focusing = 0;
  const onFocus = (event: FocusEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(".edit-clip");
    if (!button || !editing) return;
    cancelAnimationFrame(focusing);
    focusing = requestAnimationFrame(() => {
      if (editing && document.activeElement === button) choose(button);
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!editing || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    // Space and J, K and L are a surprise of their own, with its own flag.
    const shuttling = editShuttle.on;
    if (shuttling && key === " ") {
      event.preventDefault();
      if (motion?.kind === "play") stop();
      else play(1);
    } else if (shuttling && key === "k") {
      event.preventDefault();
      stop();
    } else if (shuttling && (key === "l" || key === "j")) {
      event.preventDefault();
      play(shuttle(motion?.kind === "play" ? motion.speed : 0, key === "l" ? 1 : -1));
    } else if ((key === "arrowleft" || key === "arrowright") && (event.target as HTMLElement).dataset.track === "honors") {
      event.preventDefault();
      honor = (honor + (key === "arrowright" ? 1 : -1) + honors.length) % honors.length;
      roving();
      honors[honor].focus();
    }
  };
  // Space activates a button on release; here it plays, so the release mustn't click.
  const onKeyUp = (event: KeyboardEvent) => {
    if (editing && event.key === " ") event.preventDefault();
  };

  // A footnote's ↩ that lands in a panel that isn't showing brings its clip up.
  const onHash = () => {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    const panel = target?.closest<HTMLElement>(".edit-panel");
    if (!editing || !panel || panel.hasAttribute("data-active")) return;
    const button = buttons.find((entry) => entry.dataset.panel === panel.dataset.panel);
    if (button) choose(button);
  };

  const enter = () => {
    const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches && html.getAttribute("data-motion") !== "reduce";
    const wanted = window.matchMedia(EDIT.query).matches && motionOk;
    // Pinned, every panel must fit the viewer; where one doesn't, the edit stays a stack.
    root.removeAttribute("data-unfit");
    const next = wanted && fits();
    root.toggleAttribute("data-unfit", wanted && !next);
    if (next === editing) {
      if (editing) {
        place();
        measure();
        render();
      }
      return;
    }
    editing = next;
    root.toggleAttribute("data-editing", editing);
    if (editing) timeline.removeAttribute("aria-hidden");
    else timeline.setAttribute("aria-hidden", "true");
    for (const button of buttons) if (button.dataset.track !== "honors") button.tabIndex = editing ? 0 : -1;
    roving();
    if (editing) {
      place();
      measure();
      active = null;
      render();
    } else {
      stop();
      settle();
      active = null;
      chosen = null;
      for (const panel of panels.values()) {
        panel.removeAttribute("data-active");
        panel.inert = false;
      }
      for (const button of buttons) button.removeAttribute("aria-current");
    }
  };

  // Off-screen and in a hidden tab, the visuals rest.
  const visibility = new IntersectionObserver(([entry]) => root.toggleAttribute("data-offscreen", !entry?.isIntersecting));
  visibility.observe(root);
  const onVisibility = () => root.toggleAttribute("data-hidden-tab", document.visibilityState === "hidden");

  // The page above can change height (fonts, images): the pin's place follows. Whether it
  // pins at all is decided on resize, never in here, so this callback changes no layout.
  const resize = new ResizeObserver(() => {
    if (!editing) return;
    measure();
    render();
  });
  resize.observe(document.body);
  const queries = [window.matchMedia(EDIT.query), window.matchMedia("(prefers-reduced-motion: no-preference)")];
  for (const query of queries) query.addEventListener("change", enter);
  const forced = new MutationObserver(enter);
  forced.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
  let disposed = false;
  // Text metrics settle when the fonts arrive, and with them whether every panel fits.
  void document.fonts?.ready.then(() => {
    if (!disposed) enter();
  });
  window.addEventListener("resize", enter);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchstart", onWheel, { passive: true });
  window.addEventListener("hashchange", onHash);
  document.addEventListener("visibilitychange", onVisibility);
  timeline.addEventListener("click", onClick);
  timeline.addEventListener("focusin", onFocus);
  timeline.addEventListener("keydown", onKeyDown);
  timeline.addEventListener("keyup", onKeyUp);
  enter();

  return () => {
    disposed = true;
    cancelAnimationFrame(focusing);
    stop();
    cancelAnimationFrame(counting);
    window.removeEventListener("resize", enter);
    visibility.disconnect();
    resize.disconnect();
    forced.disconnect();
    for (const query of queries) query.removeEventListener("change", enter);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onWheel);
    window.removeEventListener("hashchange", onHash);
    document.removeEventListener("visibilitychange", onVisibility);
    timeline.removeEventListener("click", onClick);
    timeline.removeEventListener("focusin", onFocus);
    timeline.removeEventListener("keydown", onKeyDown);
    timeline.removeEventListener("keyup", onKeyUp);
  };
}
