import { create } from "zustand";

/** Whether Search (DESIGN.md §6.3) is open. ⌘K, Ctrl K, "/" and the Island all open it. */
export const useSearch = create<{ open: boolean }>(() => ({ open: false }));

export function openSearch() {
  useSearch.setState({ open: true });
}

export function closeSearch() {
  useSearch.setState({ open: false });
}

export function toggleSearch() {
  useSearch.setState((state) => ({ open: !state.open }));
}
