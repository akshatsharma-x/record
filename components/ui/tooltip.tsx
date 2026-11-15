"use client";

import {
  cloneElement,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { durations } from "@/lib/motion";

interface TooltipProps {
  content: ReactNode;
  /** One focusable element: a button or a link. Its accessible name must not depend on the tooltip. */
  children: ReactElement<{ "aria-describedby"?: string }>;
}

/**
 * A tooltip that opens on hover (after a short intent delay) and on keyboard focus,
 * never on touch alone. It meets WCAG 1.4.13: Esc dismisses it, the pointer can move into
 * it, and it stays until the pointer or focus leaves. It lives in the top layer
 * (popover="manual") so no container clips it. Hover never reveals anything the trigger's
 * own name doesn't already say (§2 rule 5).
 */
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef(0);
  const [open, setOpen] = useState(false);

  const position = useCallback(() => {
    const trigger = anchor.current?.firstElementChild;
    const bubble = tip.current;
    if (!trigger || !bubble) return;
    const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--grid-gutter")) || 0;
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacing")) * 2 || 0;
    const rect = trigger.getBoundingClientRect();
    const size = bubble.getBoundingClientRect();
    const above = rect.top - size.height - gap;
    const top = above >= gutter ? above : rect.bottom + gap;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - size.width / 2, gutter),
      window.innerWidth - size.width - gutter,
    );
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
  }, []);

  const show = useCallback(
    (delay: number) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOpen(true), delay);
    },
    [],
  );
  const hide = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), delay);
  }, []);

  useEffect(() => {
    const bubble = tip.current;
    if (!bubble) return;
    const popover = typeof bubble.showPopover === "function";
    if (open) {
      if (popover && !bubble.matches(":popover-open")) bubble.showPopover();
      position();
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", onKey);
      window.addEventListener("scroll", position, { passive: true });
      return () => {
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", position);
      };
    }
    if (popover && bubble.matches(":popover-open")) bubble.hidePopover();
  }, [open, position]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      ref={anchor}
      className="inline-flex"
      onPointerEnter={(event: PointerEvent) => {
        if (event.pointerType !== "touch") show(durations.micro);
      }}
      onPointerLeave={() => hide(durations.micro)}
      onFocus={(event: FocusEvent<HTMLElement>) => {
        if (event.target.matches(":focus-visible")) show(0);
      }}
      onBlur={() => hide(0)}
    >
      {cloneElement(children, { "aria-describedby": id })}
      <span ref={tip} id={id} role="tooltip" popover="manual" className="tooltip" data-open={open || undefined}>
        {content}
      </span>
    </span>
  );
}
