// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { content } from "@/content";
import { research } from "@/content/derive";

/**
 * The home page as a reader view, a copy or a crawler takes it, without its styles (DESIGN.md
 * §10; Part 15). Pieces the styles set apart are apart in the text too, so no two words run
 * together, and each paper says it's the page's own content.
 */

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

const INLINE = new Set(["SPAN", "A", "STRONG", "EM", "B", "I", "ABBR", "TIME", "CODE", "KBD", "DATA", "SMALL", "LABEL", "BUTTON", "MARK", "Q", "CITE"]);

/** Inline neighbors whose words would meet, with nothing between them. */
function runOns(root: HTMLElement): string[] {
  const found: string[] = [];
  const unseen = (node: Node) => node instanceof Element && Boolean(node.closest("[hidden], [aria-hidden='true'], svg, script, style, template"));
  const text = (node: Node): string =>
    node.nodeType === Node.TEXT_NODE ? (node.textContent ?? "") : unseen(node) ? "" : [...node.childNodes].map(text).join("");
  for (const element of root.querySelectorAll("*")) {
    if (unseen(element)) continue;
    const kids = [...element.childNodes].filter((node) => (node.nodeType === Node.TEXT_NODE ? (node.textContent ?? "").length > 0 : !unseen(node)));
    for (let i = 0; i + 1 < kids.length; i++) {
      const [a, b] = [kids[i], kids[i + 1]];
      const inline = (node: Node) => node.nodeType === Node.TEXT_NODE || (node instanceof Element && INLINE.has(node.tagName));
      if (!inline(a) || !inline(b) || (b instanceof Element && b.tagName === "SUP")) continue;
      if (/[\p{L}\p{N})%+.,:›]$/u.test(text(a)) && /^[\p{L}\p{N}(]/u.test(text(b))) found.push(`«${text(a).slice(-20)}»«${text(b).slice(0, 20)}»`);
    }
  }
  return found;
}

it("keeps every word apart from the next, styles or none", () => {
  const { container } = render(<Home />);
  expect(runOns(container)).toEqual([]);
});

it("marks each paper as an h-entry, with its name, summary and link", () => {
  const { container } = render(<Home />);
  const entries = container.querySelectorAll(".h-entry");
  const papers = research(content);
  expect(entries).toHaveLength(papers.length);
  for (const [i, paper] of papers.entries()) {
    expect(entries[i].querySelector(".p-name")?.textContent).toBe(paper.title);
    expect(entries[i].querySelector(".p-summary")?.textContent).toBe(paper.tldr);
    expect(entries[i].querySelector(".u-url")?.getAttribute("href")).toBe(paper.href);
    expect(entries[i].querySelector(".e-content")).not.toBeNull();
  }
});
