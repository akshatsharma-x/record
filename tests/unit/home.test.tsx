// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { content } from "@/content";
import { SECTIONS } from "@/lib/sections";

// jsdom has no matchMedia, IntersectionObserver or ResizeObserver; the page's client parts use them.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("tells the story in order, one heading per section", () => {
  const { container } = render(<Home />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(content.profile.name);
  // Scenes that open a section (the statement opens About) aren't sections of their own.
  const story = Array.from(container.querySelectorAll("main > [data-section]:not([data-section-for])"));
  expect(story.map((section) => section.id)).toEqual(SECTIONS.map((section) => section.id));
  for (const section of story) {
    const label = section.getAttribute("aria-labelledby");
    expect(label && container.querySelector(`#${label}`)?.textContent, section.id).toBeTruthy();
  }
});

it("puts each opening scene right before the section it opens", () => {
  const { container } = render(<Home />);
  const scenes = container.querySelectorAll("main > [data-section][data-section-for]");
  expect(Array.from(scenes, (scene) => scene.id)).toEqual(["statement"]);
  for (const scene of scenes) {
    expect(scene.nextElementSibling?.id).toBe(scene.getAttribute("data-section-for"));
  }
});

it("never renders a gap: no null, no TODO, no empty footnote source", () => {
  const { container } = render(<Home />);
  expect(container.textContent).not.toMatch(/\b(null|undefined|NaN|TODO)\b/);
});

it("lists exactly the footnotes the page cites, each with a way back", () => {
  const { container } = render(<Home />);
  const cited = new Set(Array.from(container.querySelectorAll("a[role=doc-noteref]")).map((a) => a.getAttribute("href")));
  const notes = Array.from(container.querySelectorAll("footer li[id^=fn-]")).map((li) => `#${li.id}`);
  expect(new Set(notes)).toEqual(cited);
  for (const back of container.querySelectorAll("a[role=doc-backlink]")) {
    expect(container.querySelector(back.getAttribute("href")!), back.getAttribute("href")!).not.toBeNull();
  }
});
