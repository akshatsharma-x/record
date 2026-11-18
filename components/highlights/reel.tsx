"use client";

import { Pause, Play, Plus } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Body, Caption } from "@/components/ui/type";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { nearestCard, REEL } from "@/lib/reel";
import { travelTo } from "@/lib/travel";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export interface ReelCard {
  id: string;
  /** The card's words as plain text, for labels and the sheet's title. */
  label: string;
  /** The card's words with their footnote marks, numbered in page order. */
  text: ReactNode;
  film: ReactNode;
  sheet: { fact: string[]; footnotes: number[]; sources: string[]; section: string; sectionName: string };
}

// The pause choice, for this session.
let pausedValue: boolean | null = null;
const pausedListeners = new Set<() => void>();
function readPaused(): boolean {
  if (pausedValue === null) {
    try {
      pausedValue = sessionStorage.getItem(REEL.pausedKey) === "1";
    } catch {
      pausedValue = false;
    }
  }
  return pausedValue;
}
function writePaused(next: boolean) {
  pausedValue = next;
  try {
    if (next) sessionStorage.setItem(REEL.pausedKey, "1");
    else sessionStorage.removeItem(REEL.pausedKey);
  } catch {
    // Storage off: the choice lasts for this page.
  }
  for (const listener of pausedListeners) listener();
}
function subscribePaused(listener: () => void) {
  pausedListeners.add(listener);
  return () => pausedListeners.delete(listener);
}

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/**
 * The highlights reel (DESIGN.md §7, Part 6): a horizontal scroll-snap gallery of cards,
 * each with a micro-film. Only the card in view plays. One control pauses the whole reel
 * (WCAG 2.2.2), and the dots stretch into a progress bar for the playing card. Swipe,
 * drag, trackpad and the arrow keys all move it; each card's + opens a sheet with the full
 * fact, its footnote and a link to its section.
 */
export function Reel({ cards, label }: { cards: ReelCard[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const [sheet, setSheet] = useState<number | null>(null);
  const paused = useSyncExternalStore(subscribePaused, readPaused, () => false);
  const tabVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const reduced = useReducedMotion();
  const playing = onScreen && tabVisible && !paused && !reduced;
  const drag = useRef<{ x: number; left: number; id: number; moved: boolean } | null>(null);

  // Which card is in view: the one showing most, once it shows enough.
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const slides = Array.from(element.querySelectorAll<HTMLElement>("[data-reel-card]"));
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
        let best = -1;
        let ratio: number = REEL.inView;
        slides.forEach((slide, i) => {
          const value = ratios.get(slide) ?? 0;
          if (value >= ratio) {
            best = i;
            ratio = value;
          }
        });
        if (best >= 0) setActive(best);
      },
      { root: element, threshold: [0, REEL.inView, 0.8, 1] },
    );
    for (const slide of slides) observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  // Whether the reel is on screen at all.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)), { threshold: REEL.onScreen });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Tab reaches the card in view and no other, its footnote marks as well as its +: the
  // arrow keys move between cards (Part 15).
  useEffect(() => {
    track.current?.querySelectorAll<HTMLElement>("[data-reel-card]").forEach((slide, i) => {
      for (const link of slide.querySelectorAll<HTMLElement>(".reel-text a[href]")) link.tabIndex = i === active ? 0 : -1;
    });
  }, [active]);

  const slideAt = (index: number) => track.current?.querySelectorAll<HTMLElement>("[data-reel-card]")[index] ?? null;

  /** Brings a card into view; with `focus`, its + takes the focus too. */
  const goTo = (index: number, focus = false) => {
    const slide = slideAt(Math.max(0, Math.min(cards.length - 1, index)));
    if (!slide) return;
    slide.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest", inline: "start" });
    if (focus) slide.querySelector<HTMLElement>(".reel-more")?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Step from the card that has focus: the scroll may still be settling from the last key.
    const slides = Array.from(track.current?.querySelectorAll("[data-reel-card]") ?? []);
    const focused = slides.indexOf((event.target as Element).closest("[data-reel-card]") as Element);
    const from = focused >= 0 ? focused : active;
    const moves: Record<string, number> = { ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: cards.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    goTo(moves[event.key], true);
  };

  // Dragging with a mouse scrolls the reel; touch and trackpads scroll it natively.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !track.current) return;
    drag.current = { x: event.clientX, left: track.current.scrollLeft, id: event.pointerId, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const element = track.current;
    if (!state || !element) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < REEL.dragSlop) return;
    if (!state.moved) {
      state.moved = true;
      element.setPointerCapture(state.id);
      element.setAttribute("data-dragging", "");
    }
    element.scrollLeft = state.left - dx;
  };
  const endDrag = () => {
    const state = drag.current;
    const element = track.current;
    drag.current = null;
    if (!state?.moved || !element) return;
    element.removeAttribute("data-dragging");
    // Where each card would sit at the snap edge, in the track's scroll coordinates.
    const edge = element.getBoundingClientRect().left + (parseFloat(getComputedStyle(element).paddingLeft) || 0);
    const starts = Array.from(
      element.querySelectorAll<HTMLElement>("[data-reel-card]"),
      (slide) => element.scrollLeft + slide.getBoundingClientRect().left - edge,
    );
    goTo(nearestCard(starts, element.scrollLeft));
  };
  // A drag that ends over a + isn't a click on it.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (track.current?.hasAttribute("data-dragged")) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const open = sheet === null ? null : cards[sheet];

  return (
    <div
      ref={root}
      className="reel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-reel-playing={playing || undefined}
      data-paused={paused || undefined}
    >
      <div
        ref={track}
        className="reel-track"
        data-cursor="drag"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          if (drag.current?.moved) {
            track.current?.setAttribute("data-dragged", "");
            window.setTimeout(() => track.current?.removeAttribute("data-dragged"));
          }
          endDrag();
        }}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="reel-card"
            data-reel-card=""
            data-tone="dark"
            data-active={i === active || undefined}
            data-playing={(playing && i === active) || undefined}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${cards.length}`}
          >
            <p className="reel-text">{card.text}</p>
            <div className="reel-film">{card.film}</div>
            <button
              type="button"
              className="reel-more"
              aria-label={`More about “${card.label}”`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setSheet(i)}
            >
              <Plus aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="reel-controls">
        <div className="reel-dots">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              className="reel-dot"
              tabIndex={-1}
              aria-label={`Show highlight ${i + 1} of ${cards.length}: ${card.label}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => goTo(i, true)}
            >
              <span className="reel-dot-mark" />
            </button>
          ))}
        </div>
        {reduced ? null : (
          <button
            type="button"
            className="reel-pause"
            aria-label={paused ? "Play the highlights" : "Pause the highlights"}
            onClick={() => writePaused(!paused)}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        )}
      </div>

      <Sheet
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setSheet(null);
        }}
        title={open?.label ?? ""}
      >
        {open ? (
          <div className="reel-sheet">
            {open.sheet.fact.map((line) => (
              <Body key={line}>{line}</Body>
            ))}
            {open.sheet.footnotes.length > 0 || open.sheet.sources.length > 0 ? (
              <Caption>
                {[
                  open.sheet.footnotes.length > 0 ? `Footnote ${open.sheet.footnotes.join(", ")}` : null,
                  ...open.sheet.sources,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Caption>
            ) : null}
            <Button
              variant="link"
              href={`#${open.sheet.section}`}
              onClick={(event) => {
                // Close at once, so the dialog's focus return can't scroll back to the reel.
                event.preventDefault();
                event.currentTarget.closest("dialog")?.close();
                setSheet(null);
                travelTo(open.sheet.section);
              }}
            >
              {`See it in ${open.sheet.sectionName}`}
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
