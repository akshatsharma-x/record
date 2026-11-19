import { create } from "zustand";

/**
 * Whether Search (DESIGN.md §6.3) is open. ⌘K, Ctrl K, "/" and the Island all open it.
 * `ready` is whether its field is there: the dialog's code loads on the first open, and
 * until it has, what's typed waits in `typed` rather than reaching the page, where G and F
 * are shortcuts (Part 17).
 */
export const useSearch = create<{ open: boolean; ready: boolean; typed: string }>(() => ({ open: false, ready: false, typed: "" }));

export function openSearch() {
  useSearch.setState({ open: true });
}

export function closeSearch() {
  useSearch.setState({ open: false, typed: "" });
}

export function toggleSearch() {
  useSearch.setState((state) => ({ open: !state.open, typed: "" }));
}

/** The field is there to type in, or gone with the dialog. */
export function searchReady(ready: boolean) {
  useSearch.setState({ ready });
}

/** A key typed while Search is opening, kept for its field: a character, or Backspace. */
export function typeAhead(key: string) {
  useSearch.setState((state) => ({ typed: key === "Backspace" ? state.typed.slice(0, -1) : state.typed + key }));
}

/** What was typed before the field was there, for the field to take. */
export function takeTyped(): string {
  const { typed } = useSearch.getState();
  if (typed) useSearch.setState({ typed: "" });
  return typed;
}
