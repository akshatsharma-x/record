import { create } from "zustand";

/**
 * Single-key shortcuts: "/" for Search, G for the grid and F for focus mode (DESIGN.md
 * §6.3). WCAG 2.1.4 requires a way to turn character-key shortcuts off, so Search has a
 * "Single-key shortcuts" action, persisted here. They never fire while typing in a field,
 * with a modifier held or behind a modal dialog. ⌘K and Ctrl K always work.
 */
export const SHORTCUTS_KEY = "classyfolio:single-key-shortcuts";

export const useShortcuts = create<{ singleKey: boolean; sync(): void; setSingleKey(on: boolean): void }>((set) => ({
  singleKey: true,
  sync: () => {
    try {
      set({ singleKey: localStorage.getItem(SHORTCUTS_KEY) !== "off" });
    } catch {
      // Storage off: the default holds.
    }
  },
  setSingleKey: (on) => {
    try {
      if (on) localStorage.removeItem(SHORTCUTS_KEY);
      else localStorage.setItem(SHORTCUTS_KEY, "off");
    } catch {
      // The choice lasts for this page only.
    }
    set({ singleKey: on });
  },
}));

/** Typing somewhere a key means a character. */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input:not([type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='range'], [type='color']), textarea, select, [contenteditable]:not([contenteditable='false'])",
    ),
  );
}

/** Apple platforms say ⌘K; everyone else, Ctrl K. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform);
}
