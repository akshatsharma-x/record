// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { content } from "@/content";
import { searchIndex } from "@/content/derive";
import { askDocuments, entrySource } from "@/lib/ask/documents";

/** Every one of Ask's source chips goes somewhere on the home page (DESIGN.md §6.3, Part 14). */

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })));
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("sends every chip, the model's and the site's own, somewhere on the home page", () => {
  const { container } = render(<Home />);
  const chips = [
    ...askDocuments(content),
    ...searchIndex(content).flatMap((entry) => {
      const source = entrySource(content, entry.id);
      return source ? [source] : [];
    }),
  ].filter((chip) => chip.href.startsWith("/#"));
  expect(chips.length).toBeGreaterThan(10);
  for (const chip of chips) expect(container.querySelector(`[id="${chip.target}"]`), `${chip.label} → #${chip.target}`).not.toBeNull();
});
