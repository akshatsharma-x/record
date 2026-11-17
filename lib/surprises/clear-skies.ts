import { Sun } from "lucide-react";
import { island } from "../island/store";
import { define } from "./define.ts";

/**
 * The PM2.5 forecast's handle dragged all the way right clears the sky completely
 * (lib/research-behavior.ts), and the Island says "Clear skies ahead." once a session.
 */
export const clearSkies = define({ id: "clear-skies", section: "research", on: true });

const SAID = "classyfolio:clear-skies";

/** The Island's line, the first time this session only. */
export function announceClearSkies(words: string): void {
  try {
    if (sessionStorage.getItem(SAID)) return;
    sessionStorage.setItem(SAID, "1");
  } catch {
    // Storage off: say it, this once.
  }
  island.show({ icon: Sun, title: words, tone: "success" });
}
