import { showMeWhere } from "./surprises/show-me-where";
import { PHASES, sceneProgress } from "./chip";
import { chipState, onChip, setChip } from "./chip-state";
import { type EvidenceKind, evidenceTarget } from "./evidence";
import { FISHEYE, fisheye } from "./honeycomb";
import { island } from "./island/store";
import { jumpTo } from "./jump";
import { measure as frameRead, mutate } from "./frame";
import { prefersReducedMotion } from "./reduced-motion";

/**
 * The skills section's behavior (DESIGN.md §7.7), loaded as the section comes near
 * (components/ui/behavior.tsx). The server renders it all; this adds:
 *
 * - **The chip's stage**: its scroll progress, for the 3D scene and the labels, which wait
 *   until it has exploded. Tabbing into a label skips the scene to the exploded chip.
 * - **The layers**: a label hovered, focused or tapped slides its layer out and shows its
 *   skills; the die's button ripples the cores.
 * - **Show me where**: choosing a skill in the specs or the cloud lights up the roles,
 *   projects and papers that name it, dims the rest, and the Island offers a jump to the
 *   first. Choosing it again, "Show all" or Escape ends it.
 * - **The cloud**: a fisheye around the pointer (or the focused icon), drag to pan on touch
 *   screens, and arrow keys between neighbors.
 *
 * Returns what undoes it.
 */
export function attachSkills(root: HTMLElement): () => void {
  const undo: (() => void)[] = [];
  const listen = <K extends keyof HTMLElementEventMap>(target: HTMLElement | Window | Document, type: K, handler: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, handler as EventListener, options);
    undo.push(() => target.removeEventListener(type, handler as EventListener, options));
  };

  const chip = root.querySelector<HTMLElement>("#chip");
  if (chip) attachChip(chip, listen, undo);
  if (showMeWhere.on) attachShowMe(root, listen, undo);
  const cloud = root.querySelector<HTMLElement>("[data-cloud]");
  if (cloud) attachCloud(cloud, listen, undo);
  root.setAttribute("data-skills-ready", "");

  return () => {
    root.removeAttribute("data-skills-ready");
    for (const step of undo.reverse()) step();
  };
}

type Listen = <K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Window | Document,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
) => void;

// ─── The chip ────────────────────────────────────────────────────────────────

function attachChip(chip: HTMLElement, listen: Listen, undo: (() => void)[]) {
  const labels = Array.from(chip.querySelectorAll<HTMLButtonElement>(".chip-label"));
  const lists = Array.from(chip.querySelectorAll<HTMLElement>(".chip-list"));
  const posterLayers = () => Array.from(chip.querySelectorAll<SVGElement>(".chip-layer"));
  const die = chip.querySelector<HTMLButtonElement>("[data-chip-die]");
  let pinned: string | null = null;

  const scene = () => chip.getAttribute("data-scene") === "3d";
  const frameHeight = () => chip.querySelector<HTMLElement>(".chip-sticky")?.offsetHeight ?? window.innerHeight;
  const progress = () => {
    const box = chip.getBoundingClientRect();
    return sceneProgress({ top: box.top, height: box.height }, frameHeight());
  };
  const exploded = () => !scene() || progress() >= PHASES.explode[1] - 0.02;
  /**
   * Tabbing in skips the scroll scene to the exploded chip, at once: the chip's own easing
   * shows the explosion, and a smooth scroll still running as the keyboard moves on would
   * carry the page away from what has focus next (Safari doesn't stop it; Part 15). The die
   * too: until the chip has exploded it's invisible, and focus there showed nothing (Part 17).
   */
  const skipToExploded = () => {
    if (exploded()) return;
    const box = chip.getBoundingClientRect();
    const travel = box.height - frameHeight();
    window.scrollTo({ top: window.scrollY + box.top + travel * PHASES.explode[1], behavior: "instant" });
  };

  // Where the scene is, read with the frame's other reads; then written (lib/frame.ts).
  let at = 1;
  let gone = false;
  const write = () => {
    if (gone) return;
    chip.toggleAttribute("data-exploded", at >= PHASES.explode[1] - 0.02);
    if (Math.abs(at - chipState.progress) > 1e-4) setChip({ progress: at });
  };
  const measure = () => {
    at = scene() ? progress() : 1;
    mutate(write);
  };
  const schedule = () => frameRead(measure);
  listen(window, "scroll", schedule, { passive: true });
  listen(window, "resize", schedule);
  // The stage turns tall when the 3D chip takes over from the poster.
  const observer = new MutationObserver(schedule);
  observer.observe(chip, { attributes: true, attributeFilter: ["data-scene"] });
  undo.push(() => {
    observer.disconnect();
    gone = true;
  });
  measure();

  // What's out, everywhere it shows: the label, its list, and the poster's layer.
  const show = () => {
    const active = chipState.active;
    for (const label of labels) label.setAttribute("aria-expanded", String(label.dataset.layer === active));
    for (const list of lists) list.toggleAttribute("data-active", list.dataset.layer === active);
    for (const layer of posterLayers()) layer.toggleAttribute("data-active", layer.dataset.layer === active);
    chip.toggleAttribute("data-layer-out", active !== null);
  };
  undo.push(onChip(show));

  const activate = (id: string | null) => {
    if (chipState.active !== id) setChip({ active: id });
  };
  // A label scrolling under a still pointer isn't hovered on purpose: focus keeps its layer.
  const pointer = { x: Number.NaN, y: Number.NaN };
  listen(window, "pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });
  for (const label of labels) {
    const id = label.dataset.layer ?? null;
    listen(label, "pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      if (event.clientX === pointer.x && event.clientY === pointer.y && document.activeElement?.closest(".chip-labels")) return;
      activate(id);
    });
    // Leaving lets go of this layer only: not one that focus or a tap chose since.
    listen(label, "pointerleave", (event) => {
      if (event.pointerType !== "touch" && chipState.active === id && pinned !== id && document.activeElement !== label) activate(pinned);
    });
    listen(label, "focus", () => {
      skipToExploded();
      activate(id);
    });
    listen(label, "blur", () => {
      if (chipState.active === id && pinned !== id && !label.matches(":hover")) activate(pinned);
    });
    listen(label, "click", () => {
      pinned = pinned === id ? null : id;
      activate(pinned ?? id);
    });
  }
  listen(chip, "keydown", (event) => {
    if (event.key === "Escape" && chipState.active) {
      pinned = null;
      activate(null);
    }
  });

  if (die) {
    listen(die, "focus", skipToExploded);
    listen(die, "click", () => {
      setChip({ ripple: performance.now() });
      // The poster ripples in CSS; restarting the attribute restarts it.
      chip.removeAttribute("data-ripple");
      void chip.offsetWidth;
      chip.setAttribute("data-ripple", "");
    });
  }
}

// ─── Show me where ───────────────────────────────────────────────────────────

function attachShowMe(root: HTMLElement, listen: Listen, undo: (() => void)[]) {
  const status = root.querySelector<HTMLElement>("[data-show-me-status]");
  const caption = root.querySelector<HTMLElement>("[data-cloud-caption]");
  const words = {
    jump: root.getAttribute("data-jump") ?? "",
    none: root.getAttribute("data-none") ?? "",
    clear: root.getAttribute("data-clear") ?? "",
  };
  let current: { skill: string; label: string } | null = null;

  const jumpLink = (href: string, title: string) => {
    const link = document.createElement("a");
    link.className = "show-me-jump";
    link.href = href;
    link.textContent = `${words.jump} ${title} ›`;
    return link;
  };
  const clearButton = () => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "show-me-clear";
    button.textContent = words.clear;
    button.addEventListener("click", () => clear());
    return button;
  };

  const clear = () => {
    if (!current) return;
    island.dismiss(current.label);
    current = null;
    document.documentElement.removeAttribute("data-show-me");
    for (const match of document.querySelectorAll("[data-match]")) match.removeAttribute("data-match");
    for (const button of root.querySelectorAll<HTMLElement>("[data-skill][aria-pressed='true']")) button.setAttribute("aria-pressed", "false");
    for (const extra of root.querySelectorAll(".show-me-inline")) extra.remove();
    if (caption) caption.textContent = "";
    if (status) status.textContent = "";
  };

  const choose = (button: HTMLElement) => {
    const skill = button.dataset.skill!;
    const label = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? skill;
    if (current?.skill === skill) {
      clear();
      return;
    }
    clear();
    current = { skill, label };
    for (const same of root.querySelectorAll<HTMLElement>(`[data-skill="${CSS.escape(skill)}"]`)) same.setAttribute("aria-pressed", "true");

    // What names it: each role, project and paper, found on the page by the id its section gives it.
    const keys = (button.dataset.evidence ?? "").split(" ").filter(Boolean);
    const found = keys.flatMap((key) => {
      const [kind, id] = key.split(":") as [EvidenceKind, string];
      const target = document.getElementById(evidenceTarget(kind, id));
      const holder = document.querySelector<HTMLElement>(`[data-evidence-id="${CSS.escape(key)}"]`);
      holder?.setAttribute("data-match", "");
      for (const clip of document.querySelectorAll(`[data-evidence-clip="${CSS.escape(key)}"]`)) clip.setAttribute("data-match", "");
      return target ? [{ href: `#${target.id}`, title: target.textContent?.trim() ?? id }] : [];
    });
    document.documentElement.setAttribute("data-show-me", skill);

    const first = found[0];
    const used = found.map((hit) => hit.title).join(", ");
    island.show({ title: label, detail: first ? undefined : words.none, action: first ? { label: `${words.jump} ${first.title}`, href: first.href } : undefined, persist: true, tone: "accent" });
    if (status) status.textContent = first ? `${label}: ${used}.` : `${label}: ${words.none}.`;

    // The same jump right after the skill, so the keyboard reaches it in one step.
    const inline = document.createElement("span");
    inline.className = "show-me-inline";
    if (first) inline.append(jumpLink(first.href, first.title));
    else inline.append(words.none);
    inline.append(clearButton());
    if (button.closest("[data-cloud]") && caption) {
      caption.textContent = "";
      caption.append(`${label} · `, inline);
    } else {
      button.after(inline);
    }
  };

  listen(root, "click", (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>("[data-skill]");
    if (button && root.contains(button) && !button.hasAttribute("data-dragged")) choose(button);
  });

  // The jump, from the Island or beside the skill (lib/jump.ts, which Ask's chips share).
  listen(
    document,
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a.island-activity-action, a.show-me-jump");
      const href = link?.getAttribute("href");
      if (current && href?.startsWith("#") && jumpTo(href.slice(1))) event.preventDefault();
    },
    { capture: true },
  );
  listen(document, "keydown", (event) => {
    if (event.key === "Escape" && current) clear();
  });
  undo.push(clear);
}

// ─── The cloud ───────────────────────────────────────────────────────────────

function attachCloud(cloud: HTMLElement, listen: Listen, undo: (() => void)[]) {
  const lattice = cloud.querySelector<HTMLElement>(".cloud-lattice")!;
  const cells = Array.from(cloud.querySelectorAll<HTMLElement>(".cloud-cell"));
  const homes = cells.map((cell) => ({ x: Number(cell.style.getPropertyValue("--cx")), y: Number(cell.style.getPropertyValue("--cy")) }));
  const size = () => Number.parseFloat(getComputedStyle(cloud).getPropertyValue("--cloud-cell")) || 64;
  let pan = { x: 0, y: 0 };
  let frame = 0;
  let center: { x: number; y: number } | null = null;
  let drag: { id: number; x: number; y: number; pan: { x: number; y: number }; moved: boolean } | null = null;

  /** Draws the honeycomb: panned, and magnified around `center` (in cells), if there is one. */
  const draw = () => {
    frame = 0;
    const cell = size();
    lattice.style.transform = `translate(${pan.x}px, ${pan.y}px)`;
    const magnify = center !== null && !prefersReducedMotion();
    cells.forEach((element, i) => {
      if (!magnify || !center) {
        element.style.transform = "";
        return;
      }
      const home = homes[i];
      const at = fisheye(home.x, home.y, center.x, center.y);
      element.style.transform = `translate(${((at.x - home.x) * cell).toFixed(1)}px, ${((at.y - home.y) * cell).toFixed(1)}px) scale(${at.scale.toFixed(3)})`;
      element.style.zIndex = String(Math.round(at.scale * 10));
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };
  undo.push(() => cancelAnimationFrame(frame));

  /** A point on screen, in cells from the honeycomb's middle. */
  const toCells = (clientX: number, clientY: number) => {
    const box = cloud.getBoundingClientRect();
    const cell = size();
    return { x: (clientX - box.left - box.width / 2 - pan.x) / cell, y: (clientY - box.top - box.height / 2 - pan.y) / cell };
  };
  const middle = () => {
    const cell = size();
    return { x: -pan.x / cell, y: -pan.y / cell };
  };

  const name = cloud.parentElement?.querySelector<HTMLElement>("[data-cloud-name]");
  const say = (cell: HTMLElement | null | undefined) => {
    if (name) name.textContent = cell?.getAttribute("aria-label") ?? "";
  };
  // The plain cursor dot over the cells: the fisheye is the feedback (DESIGN.md §6.1).
  for (const cell of cells) cell.setAttribute("data-cursor", "default");

  listen(cloud, "pointermove", (event) => {
    say((event.target as Element | null)?.closest<HTMLElement>(".cloud-cell"));
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 8) drag.moved = true;
      if (!drag.moved) return;
      pan = { x: drag.pan.x + dx, y: drag.pan.y + dy };
      center = event.pointerType === "touch" ? middle() : toCells(event.clientX, event.clientY);
      cloud.setAttribute("data-fisheye", "");
      schedule();
      return;
    }
    if (event.pointerType === "touch") return;
    // The pointer is the fisheye's middle.
    center = toCells(event.clientX, event.clientY);
    cloud.setAttribute("data-fisheye", "");
    schedule();
  });
  listen(cloud, "pointerleave", (event) => {
    say(null);
    if (event.pointerType === "touch" || drag) return;
    center = null;
    cloud.removeAttribute("data-fisheye");
    schedule();
  });
  // A drag pans it; on a touch screen the fisheye stays on the cloud's middle meanwhile.
  listen(cloud, "pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: { ...pan }, moved: false };
    for (const element of cells) element.removeAttribute("data-dragged");
  });
  const end = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) {
      // The tap that ends a drag isn't a choice (until the next touch).
      document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".cloud-cell")?.setAttribute("data-dragged", "");
    }
    drag = null;
  };
  listen(cloud, "pointerup", end);
  listen(cloud, "pointercancel", end);

  // The arrow keys move between neighbors; focus centers the fisheye and keeps the icon in view.
  let focused = 0;
  const focusCell = (index: number) => {
    cells[focused].tabIndex = -1;
    focused = index;
    cells[focused].tabIndex = 0;
    cells[focused].focus({ preventScroll: true });
  };
  const ANGLES: Record<string, number> = { ArrowRight: 0, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI, ArrowUp: -Math.PI / 2 };
  listen(cloud, "keydown", (event) => {
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusCell(event.key === "Home" ? 0 : cells.length - 1);
      return;
    }
    const angle = ANGLES[event.key];
    if (angle === undefined) return;
    event.preventDefault();
    const from = homes[focused];
    let best = -1;
    let score = Number.POSITIVE_INFINITY;
    homes.forEach((home, i) => {
      if (i === focused) return;
      const dx = home.x - from.x;
      const dy = home.y - from.y;
      const d = Math.hypot(dx, dy);
      const off = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle)));
      // Within 60° of the arrow's way, the nearest wins.
      if (off > Math.PI / 3 + 1e-6) return;
      const value = d + off;
      if (value < score) {
        score = value;
        best = i;
      }
    });
    if (best >= 0) focusCell(best);
  });
  listen(cloud, "focusin", (event) => {
    const index = cells.indexOf(event.target as HTMLElement);
    if (index < 0) return;
    focused = index;
    const cell = size();
    const box = cloud.getBoundingClientRect();
    const home = homes[index];
    // Pan so the focused icon is well inside the cloud.
    const x = home.x * cell + pan.x;
    const y = home.y * cell + pan.y;
    const limitX = box.width / 2 - cell * (1 + FISHEYE.grow);
    const limitY = box.height / 2 - cell * (1 + FISHEYE.grow);
    if (Math.abs(x) > limitX) pan.x -= x - Math.sign(x) * limitX;
    if (Math.abs(y) > limitY) pan.y -= y - Math.sign(y) * limitY;
    center = { x: home.x, y: home.y };
    say(cells[index]);
    cloud.setAttribute("data-fisheye", "");
    schedule();
  });
  listen(cloud, "focusout", (event) => {
    if (cloud.contains(event.relatedTarget as Node | null)) return;
    center = null;
    cloud.removeAttribute("data-fisheye");
    schedule();
  });
}
