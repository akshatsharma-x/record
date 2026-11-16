import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { reel } from "@/content/derive";

/**
 * The highlights reel (DESIGN.md §7, Part 6).
 */

const items = reel(content);
const cards = (page: Page) => page.locator("[data-reel-card]");
const track = (page: Page) => page.locator(".reel-track");

async function showReel(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator(".reel").scrollIntoViewIfNeeded();
}

/** The film animations running in each card, by index. */
function runningFilms(page: Page) {
  return cards(page).evaluateAll((all) =>
    all.map((card) => [...card.querySelectorAll(".film, .film *")].reduce((sum, element) => sum + element.getAnimations().length, 0)),
  );
}

test("has a card for every highlight, its film labeled exactly as its footnotes state", async ({ page }) => {
  await showReel(page);
  await expect(page.getByRole("heading", { level: 2, name: content.copy.highlights.eyebrow })).toBeVisible();
  await expect(cards(page)).toHaveCount(items.length);
  for (const [i, item] of items.entries()) {
    const card = cards(page).nth(i);
    await expect(card).toContainText(item.text);
    await expect(card).toHaveAttribute("aria-label", `${i + 1} of ${items.length}`);
    const film = card.locator(".film");
    const { film: data } = item;
    // Counters are drawn by CSS from the stated figures; every other label is real text.
    if (data.kind === "cost") {
      const counter = film.locator(".film-cost-counter");
      await expect(counter).toHaveCSS("--lo-final", String(data.cents[0]));
      await expect(counter).toHaveCSS("--hi-final", String(data.cents[1]));
      await expect(film).toContainText(data.compressionLabel);
    } else if (data.kind === "ring") {
      await expect(film.locator(".film-ring-label")).toHaveCSS("--to", String(data.percent));
      await expect(film.locator(".film-ring-label")).toHaveCSS("--suffix", JSON.stringify(data.label.replace(/^[\d.,]+/, "")));
    } else {
      const labels = Object.entries(data)
        .filter(([key]) => key.endsWith("Label") || key === "label" || key === "venue")
        .map(([, value]) => String(value));
      for (const label of labels) await expect(film).toContainText(label);
    }
  }
});

test("plays only the card in view, and moves on as the reel scrolls", async ({ page }) => {
  await showReel(page);
  await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(1);
  await expect(cards(page).first()).toHaveAttribute("data-playing");
  const running = await runningFilms(page);
  expect(running[0]).toBeGreaterThan(0);
  expect(running.slice(1).every((count) => count === 0)).toBe(true);
  // A swipe or trackpad scroll is a native scroll of the track.
  await track(page).evaluate((element) => {
    element.querySelectorAll<HTMLElement>("[data-reel-card]")[1].scrollIntoView({ inline: "start", block: "nearest", behavior: "instant" });
  });
  await expect(cards(page).nth(1)).toHaveAttribute("data-playing");
  await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(1);
});

test("pauses as a whole with one control, for the session, and the current dot stops filling", async ({ page }) => {
  await showReel(page);
  const current = page.locator('.reel-dot[aria-current="true"] .reel-dot-mark');
  const filling = () => current.evaluate((mark) => mark.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"));
  await expect.poll(filling).toBe(true);
  await page.getByRole("button", { name: "Pause the highlights" }).click();
  await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(0);
  await expect.poll(filling).toBe(false);
  await page.reload();
  await page.locator(".reel").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Play the highlights" })).toBeVisible();
  await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(0);
  await page.getByRole("button", { name: "Play the highlights" }).click();
  await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(1);
});

test("stops playing off-screen", async ({ page }) => {
  await showReel(page);
  await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(1);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(0);
});

test("works from the keyboard: one tab stop, arrows between cards, Enter opens the sheet, Esc returns", async ({ page }) => {
  await showReel(page);
  const more = (i: number) => cards(page).nth(i).locator(".reel-more");
  // Only the current card's + is in the tab order.
  await expect(page.locator(".reel-more[tabindex='0']")).toHaveCount(1);
  await more(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(more(1)).toBeFocused();
  await expect(cards(page).nth(1)).toHaveAttribute("data-active");
  await page.keyboard.press("End");
  await expect(more(items.length - 1)).toBeFocused();
  await page.keyboard.press("Home");
  await expect(more(0)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: items[1].text });
  await expect(sheet).toBeVisible();
  for (const line of items[1].fact) await expect(sheet).toContainText(line);
  await expect(sheet).toContainText(`Footnote ${items[1].footnotes.join(", ")}`);
  for (const source of items[1].sources) await expect(sheet).toContainText(source);
  await expect(sheet.getByRole("link", { name: `See it in ${items[1].sectionName}` })).toHaveAttribute("href", `#${items[1].section}`);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(more(1)).toBeFocused();
});

test("the sheet's link closes it and travels to the card's section", async ({ page }) => {
  await showReel(page);
  await cards(page).first().locator(".reel-more").click();
  const sheet = page.getByRole("dialog", { name: items[0].text });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("link", { name: `See it in ${items[0].sectionName}` }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`#${items[0].section}$`));
  await expect(page.locator(`#${items[0].section}`)).toBeInViewport();
});

test("drags with the mouse, with the cursor in its drag state", async ({ page, isMobile }) => {
  test.skip(isMobile, "touch scrolls the reel natively");
  await showReel(page);
  const box = (await track(page).boundingBox())!;
  const y = Math.round(box.y + box.height / 2);
  const x = Math.round(box.x + box.width * 0.4);
  await page.mouse.move(x, y, { steps: 4 });
  await expect(page.locator("[data-cursor-root]")).toHaveAttribute("data-state", "drag");
  await page.mouse.down();
  await page.mouse.move(x - 500, y, { steps: 12 });
  await page.mouse.up();
  await expect(cards(page).nth(1)).toHaveAttribute("data-active");
  // A drag that ends over a + doesn't open its sheet.
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("names itself for assistive technology: a carousel of slides with labeled controls", async ({ page }) => {
  await showReel(page);
  const region = page.getByRole("region", { name: "Highlights", exact: true });
  await expect(region).toHaveAttribute("aria-roledescription", "carousel");
  await expect(region.locator('[aria-roledescription="slide"]')).toHaveCount(items.length);
  for (const [i, item] of items.entries()) {
    await expect(region.getByRole("button", { name: `More about “${item.text}”` })).toHaveCount(1);
    await expect(region.getByRole("button", { name: `Show highlight ${i + 1} of ${items.length}: ${item.text}` })).toHaveCount(1);
  }
  await expect(region.locator(".film").first()).toHaveAttribute("aria-hidden", "true");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows every card's final frame, still, with nothing to pause", async ({ page }) => {
    await showReel(page);
    await expect(page.locator("[data-reel-card][data-playing]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /the highlights$/ })).toHaveCount(0);
    expect((await runningFilms(page)).every((count) => count === 0)).toBe(true);
    // Final frames: the counter rests on the stated cost and the ring on the stated share.
    const cost = items.find((item) => item.film.kind === "cost")!;
    const counter = page.locator(".film-cost-counter");
    if (cost.film.kind === "cost") {
      await expect.poll(() => counter.evaluate((element) => getComputedStyle(element).getPropertyValue("--film-lo").trim())).toBe(String(cost.film.cents[0]));
    }
    const ring = items.find((item) => item.film.kind === "ring")!;
    if (ring.film.kind === "ring") {
      expect(await page.locator(".film-ring-arc").evaluate((arc) => getComputedStyle(arc).strokeDasharray.replace(/px/g, ""))).toMatch(new RegExp(`^${ring.film.percent},? 100$`));
    }
  });
});
