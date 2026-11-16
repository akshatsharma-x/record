"use client";

import { Check, CircleAlert } from "lucide-react";
import { useEffect } from "react";
import { ISLAND_TIMING, island } from "@/lib/island/store";

/** The words a Button shows (its last span: an icon may come first). */
const wordsOf = (button: HTMLElement) => button.querySelector<HTMLElement>(":scope > span:last-of-type") ?? button;

/**
 * Research's actions (DESIGN.md §7.5), for markup the server rendered: one listener for the
 * page. Cite flips its card to the citations and Done or Escape flips it back, with focus
 * going along. Copy puts the citation shown on the clipboard (its italics too, where the
 * page pastes rich text), and Share opens the system's share sheet or copies the link;
 * the Island confirms each. Safari allows the clipboard only during the gesture, so every
 * write starts inside the click.
 */
export function ResearchActions() {
  useEffect(() => {
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
  }, []);

  return null;
}
