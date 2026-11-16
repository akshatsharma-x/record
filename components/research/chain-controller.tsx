"use client";

import { useEffect } from "react";
import { nextStop } from "@/lib/research";

/**
 * Which of the cold chain's "Why?" panels is open (components/research/cold-chain.tsx):
 * the stop under the mouse, else the focused one, else the one tapped or stepped to.
 * Escape closes it until the next hover, focus or tap (WCAG 1.4.13). The markup is all
 * the server's; this only sets attributes.
 */
export function ChainController({ id }: { id: string }) {
  useEffect(() => {
    const root = document.getElementById(id);
    const stage = root?.querySelector<HTMLElement>(".chain-stage");
    if (!root || !stage) return;
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
  }, [id]);

  return null;
}
