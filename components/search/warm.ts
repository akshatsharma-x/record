import { loadSearchIndex } from "@/lib/search/load";

let warmed = false;

/**
 * Loads Search's code and index ahead of time, the moment a visitor shows intent: the
 * pointer reaches the Island, or ⌘ or Ctrl goes down. Opening is then instant.
 */
export function warmSearch() {
  if (warmed) return;
  warmed = true;
  void import("./search-dialog").catch(() => {
    warmed = false;
  });
  void loadSearchIndex().catch(() => undefined);
}
