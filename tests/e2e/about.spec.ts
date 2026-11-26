import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { currently, glance, statementWords } from "@/content/derive";
import { STATEMENT } from "@/lib/statement";

/**
 * The statement, About and At a glance (DESIGN.md §7, Part 6).
 */

const statement = (page: Page) => page.locator("#statement");
const words = statementWords(content);

/** The statement's geometry: where its pin starts and how long it lasts, in px. */
function pinOf(page: Page) {
  return statement(page).evaluate((element) => {
    const section = element as HTMLElement;
    const stage = section.querySelector<HTMLElement>(".statement-stage")!;
    return { top: section.getBoundingClientRect().top + window.scrollY, pin: section.offsetHeight - stage.offsetHeight };
  });
}

/**
 * After one frame: --fill, and how many words have filled all the way, judged by the
 * color each word renders (normalized through a canvas), against fg's.
 */
function fillState(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ fill: number; filled: number; scrollY: number }>((resolve) =>
        requestAnimationFrame(() => {
          const section = document.getElementById("statement")!;
          const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
          const rgba = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return Array.from(context.getImageData(0, 0, 1, 1).data);
          };
          const probe = document.createElement("span");
          probe.style.color = "var(--color-fg)";
          section.append(probe);
          const fg = rgba(getComputedStyle(probe).color);
          probe.remove();
          // The gradient phrase fills to clear ink over its gradient: filled when the ink is gone.
          const filled = [...section.querySelectorAll<HTMLElement>(".statement-word")].filter((word) => {
            const color = rgba(getComputedStyle(word).color);
            if (word.closest(".statement-emphasis")) return color[3] === 0;
            return color.every((channel, i) => Math.abs(channel - fg[i]) <= 2);
          }).length;
          resolve({ fill: Number(section.style.getPropertyValue("--fill")), filled, scrollY: window.scrollY });
        }),
      ),
  );
}

test.describe("the statement", () => {
  test("fills word by word in reading order, exactly where the scroll is, both ways", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const { top, pin } = await pinOf(page);
    expect(pin).toBeGreaterThan(0);
    let previous = -1;
    for (const share of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(top + pin * STATEMENT.fillShare * share));
      const state = await fillState(page);
      expect(state.fill).toBeCloseTo(Math.min(1, (state.scrollY - top) / (pin * STATEMENT.fillShare)), 2);
      expect(state.filled).toBeGreaterThanOrEqual(previous);
      previous = state.filled;
    }
    expect(previous).toBe(words.length);
    // Back up and it empties again.
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(top));
    expect((await fillState(page)).filled).toBe(0);
  });

  test("tracks every frame of a scroll through the pin without dropping frames", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const { top, pin } = await pinOf(page);
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(top));
    const run = await page.evaluate(
      ({ top, pin, share }) =>
        new Promise<{ worstLag: number; frames: number[] }>((resolve) => {
          const section = document.getElementById("statement")!;
          const frames: number[] = [];
          let last = performance.now();
          let worstLag = 0;
          let step = 0;
          const tick = (now: number) => {
            frames.push(now - last);
            last = now;
            // What the fill should be for where the page is right now, against what it is.
            const expected = Math.min(1, Math.max(0, (window.scrollY - top) / (pin * share)));
            worstLag = Math.max(worstLag, Math.abs(Number(section.style.getPropertyValue("--fill")) - expected));
            if (step++ < 90) {
              window.scrollBy(0, (pin * 1.1) / 90);
              requestAnimationFrame(tick);
            } else resolve({ worstLag, frames: frames.slice(1) });
          };
          requestAnimationFrame(tick);
        }),
      { top, pin, share: STATEMENT.fillShare },
    );
    // Exact: the fill matches the scroll position in every frame.
    expect(run.worstLag).toBeLessThanOrEqual(0.0001);
    // Smooth: nineteen frames in twenty arrive on time.
    const sorted = [...run.frames].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length * 0.95)]).toBeLessThan(34);
  });

  test("names its one gradient phrase, and the Island calls it About", async ({ page }) => {
    await page.goto("/");
    await expect(statement(page).locator(".statement-emphasis")).toHaveText(content.copy.statement.emphasis);
    await expect(statement(page)).toHaveText(content.copy.statement.headline);
    const { top, pin } = await pinOf(page);
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(top + pin / 2));
    await expect(page.locator(".island-name")).toContainText("About");
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("reads fully filled, with no pin", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const { pin } = await pinOf(page);
      expect(pin).toBe(0);
      await statement(page).scrollIntoViewIfNeeded();
      expect((await fillState(page)).filled).toBe(words.length);
    });
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("is real text, fully filled, with no pin", async ({ page }) => {
      await page.goto("/");
      await expect(statement(page)).toHaveText(content.copy.statement.headline);
      const { pin } = await pinOf(page);
      expect(pin).toBe(0);
    });
  });
});

test.describe("About", () => {
  const facts = glance(content);

  test("says hi, tells the story and ends on a quiet Currently line without empty items", async ({ page }) => {
    await page.goto("/");
    const about = page.locator("#about");
    await expect(about.getByRole("heading", { level: 2, name: content.copy.about.headline })).toBeVisible();
    const line = about.locator(".about-currently");
    await expect(line).toContainText(content.copy.about.currently);
    for (const item of currently(content)) await expect(line).toContainText(item.text);
    await expect(line).not.toContainText("Reading");
    await expect(line.getByRole("link", { name: content.currentFocus.building.name })).toHaveAttribute("href", "#experience");
  });

  test("lays out six tiles, every count from content", async ({ page }) => {
    await page.goto("/");
    const tiles = page.getByRole("list", { name: content.copy.about.glance }).getByRole("listitem");
    await expect(tiles).toHaveCount(6);
    await page.locator(".glance").scrollIntoViewIfNeeded();
    const tile = (name: string) => page.locator(`[data-tile="${name}"]`);
    await expect(tile("now")).toContainText(facts.now.org);
    await expect(tile("now")).toContainText(facts.now.role);
    await expect(tile("now")).toContainText(`since ${facts.now.sinceLabel}`);
    // A counter holds its final value as real text; the digits it animates are decoration.
    const count = (name: string) => tile(name).locator(".counter-final");
    await expect(count("research")).toHaveText(String(facts.research.papers));
    await expect(tile("research")).toContainText("papers");
    await expect(tile("research")).toContainText(`${facts.research.venues[0].name} · ${facts.research.venues[0].proceedings}`);
    await expect(count("experience")).toHaveText(String(facts.experience.internships));
    await expect(tile("experience")).toContainText("internships");
    await expect(count("work")).toHaveText(String(facts.work.projects));
    await expect(tile("work")).toContainText("projects");
    await expect(tile("studying")).toContainText(`${facts.studying!.degree} ${facts.studying!.field}`);
    await expect(tile("studying")).toContainText(facts.studying!.institution);
    await expect(tile("time")).toContainText(facts.time.zoneLabel);
  });

  test.describe("on a fixed clock, for a visitor in London", () => {
    test.use({ timezoneId: "Europe/London", locale: "en-US" });

    test("counts the role's months, rings the degree's progress and flips to the days left", async ({ page }) => {
      // 09:11 UTC is 2:41 PM in India, on 16 November 2026.
      await page.clock.setFixedTime(new Date("2026-11-16T09:11:00Z"));
      await page.goto("/");
      await page.locator(".glance").scrollIntoViewIfNeeded();
      // Merck from December (Part 20): a role that hasn't begun has no length yet.
      await expect(page.locator('[data-tile="now"]')).toContainText("since December 2026");
      await expect(page.locator('[data-tile="now"]')).not.toContainText("months");
      const studying = page.locator('[data-tile="studying"] button');
      await expect(studying).toContainText("84%");
      await studying.click();
      await expect(studying.locator('[data-face="back"]')).toContainText("227 days to graduation");
      await expect(studying.locator('[data-face="front"]')).toHaveAttribute("aria-hidden", "true");
      await studying.click();
      await expect(studying.locator('[data-face="front"]')).not.toHaveAttribute("aria-hidden");
    });

    test("shows Akshat's clock, then 24-hour time and the overlap with the visitor's 9 to 5", async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-11-16T09:11:00Z"));
      await page.goto("/");
      const time = page.locator('[data-tile="time"] button');
      await time.scrollIntoViewIfNeeded();
      await expect(time).toContainText("2:41 PM IST");
      await expect(time).toContainText("Working hours 10:00 AM–6:00 PM IST");
      await time.click();
      await expect(time).toContainText("14:41 IST");
      await expect(time).toContainText("Overlaps your 09:00–17:00 for 3 h 30 min: 09:00–12:30 your time");
    });
  });

  test("animates each tile once, on its first reveal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const ring = page.locator('[data-tile="studying"]');
    await expect(ring).toHaveAttribute("data-armed", "");
    await expect(ring).not.toHaveAttribute("data-revealed");
    await ring.scrollIntoViewIfNeeded();
    await expect(ring).toHaveAttribute("data-revealed", "");
    // Coming back later, it rests: still revealed, its arc already drawn.
    await page.evaluate(() => window.scrollTo(0, 0));
    await ring.scrollIntoViewIfNeeded();
    await expect(ring).toHaveAttribute("data-revealed", "");
    await expect(ring.locator(".glance-ring-arc")).toHaveCSS("stroke-dasharray", /^(?!0[, ])/);
  });
});
