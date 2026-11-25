import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { SECTIONS } from "@/lib/sections";

/**
 * Part A of the walkthrough (tests/a11y/WALKTHROUGH.md, Part 15), by itself: Tab from the
 * top of the home page to the end and round to the Island again. Every stop shows the focus
 * ring, is in view and isn't under the Island, and the sections come in reading order.
 * VoiceOver (Parts B and C) needs a person.
 */

const WIDE = { width: 1440, height: 900 };

interface Stop {
  section: string;
  name: string;
  ring: boolean;
  inView: boolean;
  covered: boolean;
}

/** Where focus is now: its section, its name, and whether it can be seen. */
function stop(page: Page): Promise<Stop | null> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    // (Next's own overlay, under next dev only, isn't the page.)
    if (!element || element === document.body || element.tagName === "NEXTJS-PORTAL") return null;
    const holder = element.closest<HTMLElement>(".island, [data-section], footer");
    const section = element.classList.contains("skip-link") ? "skip" : holder?.classList.contains("island") ? "island" : holder?.tagName === "FOOTER" ? "footer" : (holder?.id ?? "?");
    // A visually hidden radio or checkbox shows its ring on its label (styles/components.css).
    const ringed = (target: Element) => {
      const style = getComputedStyle(target);
      return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    };
    const label = element.closest("label");
    const shown = element.matches(".sr-only, .peer") && label ? label : element;
    const ring = ringed(element) || ringed(shown) || Boolean(element.closest(".island-shell:has(.island-toggle:focus-visible)"));
    const box = shown.getBoundingClientRect();
    const inView = box.width > 0 && box.bottom > 0 && box.top < innerHeight;
    let covered = false;
    const shell = document.querySelector(".island-shell");
    if (shell && !element.closest(".island")) {
      const pill = shell.getBoundingClientRect();
      covered = box.top < pill.bottom - 2 && box.bottom > pill.top && box.left < pill.right && box.right > pill.left;
    }
    const name = (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim();
    return { section, name, ring, inView, covered };
  });
}

test.describe("the keyboard walkthrough", () => {
  test.skip(({ isMobile }) => isMobile, "A keyboard");

  test("Tab reaches everything in reading order, every stop ringed, in view and clear of the Island", async ({ page, browserName }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(WIDE);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator(".island-shell[data-measured]").waitFor();
    // Safari moves between links and buttons with Option-Tab.
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    const stops: Stop[] = [];
    for (let i = 0; i < 600; i++) {
      await page.keyboard.press(tab);
      // Let a section's travel, a reel's scroll or the edit's playhead settle on the stop.
      await page.waitForTimeout(40);
      let at = await stop(page);
      if (!at) continue;
      // Some stops settle a moment after focus lands (a reel's scroll, a section's travel):
      // look again before calling one hidden.
      if (!at.ring || !at.inView || at.covered) {
        await page.waitForTimeout(600);
        at = (await stop(page)) ?? at;
      }
      // Round again to the top: the skip link and the Island, once the page has been through.
      if ((at.section === "skip" || at.section === "island") && stops.some((entry) => entry.section !== "skip" && entry.section !== "island")) break;
      stops.push(at);
    }

    const sections = stops.map((entry) => entry.section).filter((section, i, all) => section !== all[i - 1]);
    // First, the way past the Island's stops (WCAG 2.4.1, Part 17).
    expect(sections).toEqual(["skip", "island", "top", "about", "highlights", "experience", "research", "work", "skills", "credentials", "contact", "footer"]);

    const unseen = stops.filter((entry) => !entry.ring || !entry.inView || entry.covered);
    expect(unseen.map((entry) => `${entry.section}: ${entry.name}${entry.ring ? "" : " (no ring)"}${entry.inView ? "" : " (out of view)"}${entry.covered ? " (under the Island)" : ""}`)).toEqual([]);

    // The Island: the toggle, Search, the theme, Say hello and the seven sections.
    const island = stops.filter((entry) => entry.section === "island");
    expect(island).toHaveLength(4 + SECTIONS.filter((section) => section.nav).length);
    // The hero: its two ways on, its three facts, read with their labels, then the finishes,
    // one stop for the group. Nothing on it loops, so there's no pause (Part 18).
    const first = stops.filter((entry) => entry.section === "top").map((entry) => entry.name);
    expect(first.slice(0, 5)).toEqual([
      "See my work",
      "Say hello›",
      "Now: AI & ML Intern, United Airlines",
      "Studying: B.Tech CSE \u201927, Manipal University Jaipur",
      "Presented: SCI-2026, Springer LNNS",
    ]);
    expect(first).toHaveLength(6);
    // The highlights: the card in view, its footnote and its +, then the pause.
    const reel = stops.filter((entry) => entry.section === "highlights").map((entry) => entry.name);
    expect(reel).toHaveLength(3);
    expect(reel[1]).toMatch(/^More about/);
    expect(reel[2]).toMatch(/^Pause the highlights$/);
    // Experience, pinned: the clips in time order, then the panel on show.
    const clips = stops.filter((entry) => entry.section === "experience").map((entry) => entry.name);
    const order = clips.slice(0, content.experience.length).map((name) => content.experience.findIndex((role) => name.includes(role.org.split(" (")[0])));
    expect(order).not.toContain(-1);
    const starts = order.map((i) => content.experience[i].start);
    expect(starts).toEqual([...starts].sort());
  });

  test("the Island opens to focus, Escape closes it and keeps the focus on its toggle", async ({ page, browserName }) => {
    await page.setViewportSize(WIDE);
    await page.goto("/");
    await page.locator(".island-shell[data-measured]").waitFor();
    const toggle = page.locator(".island-toggle");
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    // The skip link first, then the Island (Part 17).
    await page.keyboard.press(tab);
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press(tab);
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });
});
