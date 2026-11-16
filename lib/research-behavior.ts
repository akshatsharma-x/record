/**
 * Research's behavior (DESIGN.md §7.5), loaded as its section, or a paper's page, comes
 * near (components/ui/behavior.tsx). The server renders everything; these set attributes:
 * the chapters' pins, the cards' actions, and each illustration's motion. Each part returns
 * what undoes it.
 */
import { Check, CircleAlert } from "lucide-react";
import { ISLAND_TIMING, island } from "./island/store";
import { createHazeEngine } from "./haze";
import { prefersReducedMotion, REDUCED_MOTION_QUERY } from "./reduced-motion";
import { forecastLabel, forecastPaths, handleAt, HAZE, hazeDensity, hazeX, hazeY, levelAt, nextStop, playAt, RESEARCH, stepTime, timeWords } from "./research";

/** The words a Button shows (its last span: an icon may come first). */
const wordsOf = (button: HTMLElement) => button.querySelector<HTMLElement>(":scope > span:last-of-type") ?? button;

/**
 * What moves in the haze (components/research/haze.tsx): the forecast's reach. Dragging
 * the handle (or its arrow keys) moves it, and the haze thickens or clears with the level
 * there. While its chapter plays, the scroll carries the handle from now to the horizon
 * until the visitor takes it. Elsewhere it opens on its final frame, and Step through taps
 * it along the forecast. It sets the server's markup's attributes; nothing re-renders.
 */
export function attachHaze(root: HTMLElement, resolution: number): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>(".haze-canvas");
  const scene = root.querySelector<HTMLElement>(".haze-scene");
  const input = root.querySelector<HTMLInputElement>(".haze-handle");
  if (!canvas || !scene || !input) return () => undefined;
  const band = root.querySelector(".haze-band");
  const ahead = root.querySelector(".haze-ahead");
  const label = root.querySelector(".haze-label-forecast");
  const cursor = root.querySelector(".haze-cursor");
  const dot = root.querySelector(".haze-dot");
  const said = root.querySelector<HTMLElement>("[data-haze-said]");
  const button = root.querySelector<HTMLButtonElement>("[data-haze-step]");
  const engine = createHazeEngine(canvas);
  const span = HAZE.horizon - HAZE.now;
  let taken = false;
  let step = HAZE.steps.length - 1;
  let shown = Number.NaN;

  const draw = (time: number) => {
    if (time === shown) return;
    shown = time;
    const level = levelAt(time);
    const density = hazeDensity(level);
    const paths = forecastPaths(time);
    const where = forecastLabel(time);
    const x = String(hazeX(time));
    for (const [path, d] of [
      [band, paths.band],
      [ahead, paths.ahead],
    ] as const) {
      if (d) path?.setAttribute("d", d);
      else path?.removeAttribute("d");
    }
    label?.setAttribute("x", String(where.x));
    if (where.shown) label?.removeAttribute("visibility");
    else label?.setAttribute("visibility", "hidden");
    cursor?.setAttribute("x1", x);
    cursor?.setAttribute("x2", x);
    dot?.setAttribute("cx", x);
    dot?.setAttribute("cy", String(hazeY(level)));
    input.value = String(Math.round(((time - HAZE.now) / span) * resolution));
    input.setAttribute("aria-valuetext", timeWords(time));
    scene.style.setProperty("--density", density.toFixed(3));
    engine.setDensity(density);
  };
  draw(HAZE.horizon);

  const onInput = () => {
    taken = true;
    draw(HAZE.now + (Number(input.value) / resolution) * span);
  };
  // While the chapter is pinned, its play moves the handle, unless the visitor has it.
  const chapter = root.closest(".chapter");
  const onPlay = (event: Event) => {
    const play = (event as CustomEvent<number>).detail;
    if (play <= 0) taken = false;
    if (!taken) draw(handleAt(play));
  };
  // Tap to step: from now to the horizon, said aloud.
  const onStep = () => {
    step = (step + 1) % HAZE.steps.length;
    taken = true;
    draw(stepTime(step));
    if (said) said.textContent = timeWords(stepTime(step));
  };

  input.addEventListener("input", onInput);
  chapter?.addEventListener("chapterplay", onPlay);
  button?.addEventListener("click", onStep);
  return () => {
    engine.destroy();
    input.removeEventListener("input", onInput);
    chapter?.removeEventListener("chapterplay", onPlay);
    button?.removeEventListener("click", onStep);
  };
}

/**
 * Which of the cold chain's "Why?" panels is open (components/research/cold-chain.tsx):
 * the stop under the mouse, else the focused one, else the one tapped or stepped to.
 * Escape closes it until the next hover, focus or tap (WCAG 1.4.13). The markup is all
 * the server's; this only sets attributes.
 */
export function attachChain(root: HTMLElement): () => void {
  const stage = root.querySelector<HTMLElement>(".chain-stage");
  if (!stage) return () => undefined;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".chain-hit"));
  const stops = Array.from(root.querySelectorAll<SVGGElement>(".chain-stop"));
  const panels = Array.from(root.querySelectorAll<HTMLElement>(".chain-why"));
  const said = root.querySelector<HTMLElement>("[data-chain-said]");
  const step = root.querySelector<HTMLButtonElement>("[data-chain-step]");
  let hovered: number | null = null;
  let focused: number | null = null;
  let picked: number | null = null;
  let dismissed = false;

  const apply = () => {
    const active = dismissed ? null : (hovered ?? focused ?? picked);
    stops.forEach((stop, i) => stop.toggleAttribute("data-active", active === i));
    panels.forEach((panel, i) => panel.toggleAttribute("data-open", active === i));
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(picked === i)));
  };
  const indexOf = (target: EventTarget | null) => {
    const button = (target as Element | null)?.closest?.<HTMLButtonElement>(".chain-hit");
    return button ? buttons.indexOf(button) : -1;
  };

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const i = indexOf(event.target);
    if (i < 0 || i === hovered) return;
    hovered = i;
    dismissed = false;
    apply();
  };
  const onPointerLeave = () => {
    hovered = null;
    apply();
  };
  const onFocusIn = (event: FocusEvent) => {
    const i = indexOf(event.target);
    if (i < 0) return;
    focused = i;
    dismissed = false;
    apply();
  };
  const onFocusOut = (event: FocusEvent) => {
    if (indexOf(event.target) < 0) return;
    focused = null;
    apply();
  };
  const onClick = (event: MouseEvent) => {
    const i = indexOf(event.target);
    if (i < 0) return;
    picked = picked === i ? null : i;
    dismissed = false;
    apply();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || dismissed || (hovered ?? focused ?? picked) === null) return;
    // Handled here: the card beside it shouldn't flip back as well.
    event.preventDefault();
    dismissed = true;
    apply();
  };
  // Tap to step: each stop in turn, then the whole chain, said aloud.
  const onStep = () => {
    picked = nextStop(picked, buttons.length);
    dismissed = false;
    apply();
    if (!said) return;
    const button = picked === null ? null : buttons[picked];
    const why = button ? document.getElementById(button.getAttribute("aria-describedby") ?? "")?.textContent : null;
    said.textContent = button ? `${button.getAttribute("aria-label")}. ${why ?? ""}` : (said.dataset.overview ?? "");
  };

  stage.addEventListener("pointerover", onPointerOver);
  stage.addEventListener("pointerleave", onPointerLeave);
  stage.addEventListener("focusin", onFocusIn);
  stage.addEventListener("focusout", onFocusOut);
  stage.addEventListener("click", onClick);
  stage.addEventListener("keydown", onKeyDown);
  step?.addEventListener("click", onStep);
  return () => {
    stage.removeEventListener("pointerover", onPointerOver);
    stage.removeEventListener("pointerleave", onPointerLeave);
    stage.removeEventListener("focusin", onFocusIn);
    stage.removeEventListener("focusout", onFocusOut);
    stage.removeEventListener("click", onClick);
    stage.removeEventListener("keydown", onKeyDown);
    step?.removeEventListener("click", onStep);
  };
}

/**
 * Plays #research's chapters from the scroll (DESIGN.md §7.5). While a chapter is pinned,
 * --play on it follows the scroll exactly, 0 to 1 over the first three quarters of its
 * pin, and a "chapterplay" event carries the same number to the illustrations that need
 * it in script. Unpinned (phones, reduced motion), --play is left unset, so CSS shows
 * every illustration's final frame, and each hears 1 once.
 */
export function attachChapters(): () => void {
  const section = document.getElementById("research");
  const chapters = Array.from(document.querySelectorAll<HTMLElement>("#research .chapter"));
  if (!section || chapters.length === 0) return () => undefined;
  let pinned = false;
  let geometry: { top: number; length: number }[] = [];
  const heard = new Map<HTMLElement, string>();

  const measure = () => {
    geometry = chapters.map((chapter) => {
      const stage = chapter.querySelector<HTMLElement>(".chapter-stage");
      return { top: chapter.getBoundingClientRect().top + window.scrollY, length: Math.max(1, chapter.offsetHeight - (stage?.offsetHeight ?? 0)) };
    });
  };

  const tell = (chapter: HTMLElement, play: number) => {
    const key = play.toFixed(3);
    if (heard.get(chapter) === key) return;
    heard.set(chapter, key);
    chapter.dispatchEvent(new CustomEvent("chapterplay", { detail: play }));
  };

  const update = () => {
    chapters.forEach((chapter, i) => {
      if (!pinned) {
        chapter.style.removeProperty("--play");
        tell(chapter, 1);
        return;
      }
      const { top, length } = geometry[i];
      const play = playAt((window.scrollY - top) / length);
      chapter.style.setProperty("--play", play.toFixed(4));
      tell(chapter, play);
    });
  };

  /** Pinned, does every chapter's card fit its stage? Where one doesn't, they stay a column. */
  const fits = () =>
    chapters.every((chapter) => {
      const frame = chapter.querySelector<HTMLElement>(".chapter-frame");
      const card = chapter.querySelector<HTMLElement>(".paper-card");
      return !frame || !card || card.offsetHeight <= frame.clientHeight + 1;
    });

  const mode = () => {
    const wanted = window.matchMedia(RESEARCH.query).matches && !prefersReducedMotion();
    section.removeAttribute("data-unfit");
    pinned = wanted && fits();
    section.toggleAttribute("data-unfit", wanted && !pinned);
    measure();
    update();
  };

  mode();
  // The titles' serif comes in two screens ahead of the section (styles/components.css).
  const near = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      section.setAttribute("data-fonts", "");
      near.disconnect();
    },
    { rootMargin: "200%" },
  );
  near.observe(section);
  // The page above can change height (fonts, images): the pins' places follow. Whether they
  // pin at all is decided on resize and when the fonts settle, never in here, so this
  // callback changes no layout.
  const resize = new ResizeObserver(() => {
    measure();
    update();
  });
  resize.observe(document.body);
  window.addEventListener("resize", mode);
  let disposed = false;
  void document.fonts?.ready.then(() => {
    if (!disposed) mode();
  });
  const queries = [window.matchMedia(RESEARCH.query), window.matchMedia(REDUCED_MOTION_QUERY)];
  for (const query of queries) query.addEventListener("change", mode);
  const forced = new MutationObserver(mode);
  forced.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  window.addEventListener("scroll", update, { passive: true });
  return () => {
    disposed = true;
    near.disconnect();
    window.removeEventListener("resize", mode);
    resize.disconnect();
    forced.disconnect();
    for (const query of queries) query.removeEventListener("change", mode);
    window.removeEventListener("scroll", update);
    for (const chapter of chapters) chapter.style.removeProperty("--play");
    section.removeAttribute("data-unfit");
  };
}

/**
 * Research's actions (DESIGN.md §7.5), for markup the server rendered: one listener for the
 * page. Cite flips its card to the citations and Done or Escape flips it back, with focus
 * going along. Copy puts the citation shown on the clipboard (its italics too, where the
 * page pastes rich text), and Share opens the system's share sheet or copies the link;
 * the Island confirms each. Safari allows the clipboard only during the gesture, so every
 * write starts inside the click.
 */
export function attachActions(): () => void {
  const timers = new Map<HTMLElement, number>();

  const flip = (card: HTMLElement, open: boolean) => {
    const front = card.querySelector('[data-face="front"]');
    const back = card.querySelector('[data-face="back"]');
    const opener = card.querySelector<HTMLElement>("[data-cite-open]");
    card.toggleAttribute("data-flipped", open);
    front?.toggleAttribute("inert", open);
    back?.toggleAttribute("inert", !open);
    opener?.setAttribute("aria-expanded", String(open));
    if (open) back?.querySelector<HTMLElement>(".paper-back-title")?.focus({ preventScroll: true });
    else opener?.focus({ preventScroll: true });
  };

  // The button says what happened for as long as the Island does.
  const say = (button: HTMLElement, words: string, status: "success" | "error") => {
    const label = wordsOf(button);
    const was = button.dataset.words ?? label.textContent ?? "";
    button.dataset.words = was;
    label.textContent = words;
    button.setAttribute("data-status", status);
    window.clearTimeout(timers.get(button));
    timers.set(
      button,
      window.setTimeout(() => {
        label.textContent = was;
        button.setAttribute("data-status", "idle");
      }, ISLAND_TIMING.activity),
    );
  };

  const copyCitation = (button: HTMLElement) => {
    const citations = button.closest(".citations");
    const style = citations?.querySelector<HTMLInputElement>("input:checked")?.value ?? "apa";
    const shown = citations?.querySelector<HTMLElement>(`.citation-text[data-style="${style}"]`);
    if (!shown) return;
    const text = shown.textContent ?? "";
    const label = shown.dataset.label ?? style;
    const written =
      style !== "bibtex" && typeof ClipboardItem !== "undefined"
        ? navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": new Blob([text], { type: "text/plain" }),
              "text/html": new Blob([shown.innerHTML], { type: "text/html" }),
            }),
          ])
        : navigator.clipboard.writeText(text);
    written
      .then(() => {
        say(button, "Copied", "success");
        island.show({ icon: Check, title: "Citation copied", detail: label, tone: "success" });
      })
      .catch(() => {
        say(button, "Copy", "error");
        island.show({ icon: CircleAlert, title: "Couldn't copy the citation", detail: label, tone: "error" });
      });
  };

  const copyLink = (url: string) =>
    navigator.clipboard
      .writeText(url)
      .then(() => island.show({ icon: Check, title: "Link copied", detail: url, tone: "success" }))
      .catch(() => island.show({ icon: CircleAlert, title: "Couldn't copy the link", detail: url, tone: "error" }));

  const share = (button: HTMLElement) => {
    const url = new URL(button.dataset.share ?? "", window.location.href).toString();
    if (typeof navigator.share === "function") {
      // Cancelling the sheet is a choice, not a failure.
      navigator.share({ title: button.dataset.shareTitle, text: button.dataset.shareText, url }).catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) void copyLink(url);
      });
      return;
    }
    void copyLink(url);
  };

  const onClick = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest?.<HTMLElement>(
      "[data-cite-open], [data-cite-close], [data-copy-citation], [data-share]",
    );
    if (!target) return;
    const card = target.closest<HTMLElement>(".paper-card");
    if (target.hasAttribute("data-cite-open") && card) flip(card, true);
    else if (target.hasAttribute("data-cite-close") && card) flip(card, false);
    else if (target.hasAttribute("data-copy-citation")) copyCitation(target);
    else if (target.hasAttribute("data-share")) share(target);
  };

  // Escape flips a card back from anywhere: Safari doesn't focus a button it clicks, so
  // after Copy, focus may not be in the card. A dialog's Escape, and one already handled
  // (a "Why?" closing), are left alone.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || (event.target as Element | null)?.closest?.("dialog[open]")) return;
    for (const card of document.querySelectorAll<HTMLElement>(".paper-card[data-flipped]")) flip(card, false);
  };

  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeyDown);
  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);
    for (const timer of timers.values()) window.clearTimeout(timer);
  };
}

/** The section's (or a paper page's) behavior: its actions, its illustrations, and on the home page the chapters. */
export function attachResearch(root: HTMLElement): () => void {
  const undo: (() => void)[] = [attachActions()];
  for (const haze of root.querySelectorAll<HTMLElement>(".haze")) {
    const input = haze.querySelector<HTMLInputElement>(".haze-handle");
    undo.push(attachHaze(haze, Number(input?.max) || 1));
  }
  for (const chain of root.querySelectorAll<HTMLElement>(".chain")) undo.push(attachChain(chain));
  // Last: the chapters tell the illustrations where the scroll has them, at once.
  if (root.id === "research") undo.push(attachChapters());
  root.setAttribute("data-research-ready", "");
  return () => {
    root.removeAttribute("data-research-ready");
    for (const step of undo.reverse()) step();
  };
}
