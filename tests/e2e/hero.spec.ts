import { expect, type Page, test } from "@playwright/test";
import { visibility } from "./visibility";

/**
 * The hero (DESIGN.md §7), typographic edition: the production build has no photo yet, so
 * "/" ships this one. The portrait edition's tests are in portrait.spec.ts.
 */

const hero = (page: Page) => page.locator("#top");
const cursor = (page: Page) => page.locator("[data-cursor-root]");

/** Scrolls by script: mobile WebKit has no wheel. */
const scrollBy = (page: Page, y: number) => page.evaluate((dy) => window.scrollBy(0, dy), y);

/**
 * At the first frame: when every hero animation that ends will end (ms), and the name's
 * opacity. The arrival must be over in 1.2s, and the name must never be transparent.
 */
async function watchArrival(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () =>
      requestAnimationFrame(() => {
        const ends = document
          .getAnimations()
          .filter((animation) => {
            const target = (animation.effect as KeyframeEffect | null)?.target;
            return target instanceof Element && target.closest("#top") && animation.effect!.getComputedTiming().iterations !== Infinity;
          })
          .map((animation) => Number(animation.effect!.getComputedTiming().endTime));
        const opacities = [...document.querySelectorAll(".hero-line")].map((line) => getComputedStyle(line).opacity);
        (window as unknown as { __arrival: unknown }).__arrival = { ends, opacities };
      }),
    );
  });
}

/** Collects layout shifts from the first byte, as CLS counts them. */
async function watchShifts(page: Page) {
  await page.addInitScript(() => {
    const shifts: number[] = [];
    (window as unknown as { __shifts: number[] }).__shifts = shifts;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) shifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

test("the hero reads as a Lock Screen: the date, the name, the role, the line, the facts and two ways on", async ({ page }) => {
  await page.goto("/");
  const top = hero(page);
  await expect(top.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
  await expect(top.getByText("AI & ML Engineer")).toBeVisible();
  await expect(top.getByText("I build intelligent systems — and make them clear.")).toBeVisible();
  const chips = top.getByRole("list", { name: "Key facts" }).getByRole("link");
  await expect(chips).toHaveText(["AI & ML Intern at United Airlines", "B.Tech CSE ’27 · Manipal University Jaipur", "SCI-2026 · Springer LNNS"]);
  // The current role's chip goes to that role, not to the timeline's start (Part 17).
  expect(await chips.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "#united-airlines-title",
    "#credentials",
    "#research",
  ]);
  await expect(top.getByRole("link", { name: "See my work" })).toHaveAttribute("href", "#work");
  await expect(top.getByRole("link", { name: "Say hello" })).toHaveAttribute("href", "#contact");
  // Every finish, named like a product color.
  await expect(top.getByRole("radio")).toHaveCount(4);
  for (const name of ["Contrail", "Pink City", "Saffron", "Monsoon"]) await expect(top.getByText(name, { exact: true })).toBeVisible();
});

test.describe("on a fixed clock in India", () => {
  test.use({ timezoneId: "Asia/Kolkata", locale: "en-US" });

  test("the date line shows today's date and Akshat's live time, and the light warms at dusk", async ({ page }) => {
    // 13:30 UTC is 7:00 PM in India: dusk.
    await page.clock.setFixedTime(new Date("2026-11-16T13:30:00Z"));
    await page.goto("/");
    const line = hero(page).locator(".hero-date[data-live]");
    await expect(line).toHaveText("Monday, November 16 · 7:00 PM IST");
    await expect(hero(page)).toHaveAttribute("data-warm", "");
    expect(await hero(page).evaluate((element) => element.style.getPropertyValue("--warmth-to"))).toBe("var(--light-dusk)");
  });
});

test("the arrival takes at most 1.2s, and the name is painted from the first frame", async ({ page }) => {
  await watchArrival(page);
  await page.goto("/");
  await page.waitForFunction(() => "__arrival" in window);
  const { ends, opacities } = await page.evaluate(() => (window as unknown as { __arrival: { ends: number[]; opacities: string[] } }).__arrival);
  expect(opacities).toEqual(["1", "1"]);
  expect(ends.length).toBeGreaterThan(0);
  expect(Math.max(...ends)).toBeLessThanOrEqual(1200);
});

test("loading the hero shifts nothing", async ({ page }) => {
  await watchShifts(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const shifts = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts);
  expect(shifts.reduce((sum, value) => sum + value, 0)).toBeLessThan(0.01);
});

test("the CTAs lead to the work and to contact", async ({ page }) => {
  await page.goto("/");
  await hero(page).getByRole("link", { name: "See my work" }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work")).toBeInViewport();
  await page.goto("/");
  await hero(page).getByRole("link", { name: "Say hello" }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator("#contact")).toBeInViewport();
});

test("choosing a finish recolors the site from the swatch and says so in the Island", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await hero(page).getByText("Pink City", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-finish", "pink-city");
  await expect(hero(page).getByRole("radio", { name: "Pink City" })).toBeChecked();
  await expect(page.getByRole("status").filter({ hasText: "Finish: Pink City" })).toHaveCount(1);
  // The wipe tidies up after itself, and the choice survives a reload.
  await expect(page.locator("html")).not.toHaveAttribute("data-finish-wiping");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-finish", "pink-city");
});

test("the scroll cue is still: nothing loops at the screen's foot (§2 rule 4, Part 17)", async ({ page }) => {
  await page.goto("/");
  const cue = hero(page).locator(".hero-cue");
  await expect(cue).toBeVisible();
  // It fades in with the rest of the hero's UI, once, and nothing repeats after that.
  await expect.poll(() => cue.evaluate((element) => element.getAnimations().filter((animation) => animation.effect?.getTiming().iterations === Infinity).length)).toBe(0);
  await scrollBy(page, 300);
  await expect(page.locator("html")).toHaveAttribute("data-scrolled", "");
});

test("the light field can be paused, and rests off-screen", async ({ page }) => {
  await page.goto("/");
  const blob = hero(page).locator(".hero-light-blob").first();
  const state = () => blob.evaluate((element) => getComputedStyle(element).animationPlayState);
  await expect.poll(state).toBe("running");
  const pause = page.getByRole("button", { name: "Pause the background motion" });
  await pause.click();
  await expect(page.getByRole("button", { name: "Play the background motion" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(state).toBe("paused");
  // The choice lasts for the session.
  await page.reload();
  await expect(page.getByRole("button", { name: "Play the background motion" })).toBeVisible();
  await expect.poll(state).toBe("paused");
  await page.getByRole("button", { name: "Play the background motion" }).click();
  await expect.poll(state).toBe("running");
  // Off-screen, it rests.
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(hero(page)).toHaveAttribute("data-offscreen", "");
  await expect.poll(state).toBe("paused");
});

test("scrolling away lifts and fades the name", async ({ page }) => {
  await page.goto("/");
  const stack = hero(page).locator(".hero-stack");
  await scrollBy(page, 400);
  await expect.poll(() => stack.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(1);
});

test("the loupe magnifies the name under the cursor, and the dot stays visible at its center", async ({ page, isMobile }) => {
  test.skip(isMobile, "the loupe needs a pointer; touch users miss nothing");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(40, 400);
  const box = (await page.locator("#top-title").boundingBox())!;
  // On a letter's stroke, and in the gap between two words.
  const spots = [
    [0.05, 0.62],
    [0.5, 0.5],
  ];
  for (const [fx, fy] of spots) {
    const [x, y] = [Math.round(box.x + box.width * fx), Math.round(box.y + box.height * fy)];
    await page.mouse.move(x, y, { steps: 4 });
    await expect(cursor(page)).toHaveAttribute("data-state", "loupe");
    await page.waitForTimeout(800);
    const shape = page.locator(".cursor-shape");
    await expect(shape).toHaveAttribute("data-variant", "lens");
    const size = (await shape.boundingBox())!;
    expect(Math.abs(size.width - 120)).toBeLessThanOrEqual(4);
    expect(await page.locator(".cursor-lens-copy").evaluate((copy) => copy.style.transform)).toContain("scale(1.35)");
    expect(await visibility(page, x, y), `the dot over the lens at ${fx}, ${fy}`).toBeGreaterThanOrEqual(0.2);
  }
  // The copy is decoration: hidden from assistive tech, and never a second heading.
  await expect(page.locator(".cursor-lens-copy")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  // Leaving the name puts the lens away.
  await page.mouse.move(Math.round(box.x + box.width / 2), Math.round(box.y + box.height + 160), { steps: 4 });
  await expect(cursor(page)).not.toHaveAttribute("data-state", "loupe");
  await expect(page.locator(".cursor-lens-copy")).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the hero reads in full: nothing waits on a script to appear", async ({ page }) => {
    await page.goto("/");
    const top = hero(page);
    await expect(top.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
    await expect(top.locator(".hero-date")).toHaveText("India · IST");
    for (const text of ["AI & ML Engineer", "I build intelligent systems — and make them clear.", "AI & ML Intern at United Airlines"]) {
      await expect(top.getByText(text)).toBeVisible();
    }
    await expect(top.getByRole("link", { name: "See my work" })).toBeVisible();
    await expect(top.getByRole("link", { name: "Say hello" })).toBeVisible();
    // The light holds still (nothing could pause it), and the swatches wait for a script.
    expect(await top.locator(".hero-light-blob").first().evaluate((element) => getComputedStyle(element).animationName)).not.toContain(
      "drift",
    );
    await expect(top.locator(".hero-ui")).toBeHidden();
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the hero is complete and still: no drift, no breath, no scroll-out, no pause button", async ({ page }) => {
    await page.goto("/");
    const top = hero(page);
    await expect(top.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
    await expect(top.getByRole("link", { name: "See my work" })).toBeVisible();
    for (const selector of [".hero-light-blob", ".hero-cue"]) {
      expect(await top.locator(selector).first().evaluate((element) => getComputedStyle(element).animationName), selector).toBe("none");
    }
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /background motion/ })).toHaveCount(0);
    await scrollBy(page, 400);
    await page.waitForTimeout(300);
    expect(await top.evaluate((element) => element.style.getPropertyValue("--hero-out"))).toBe("0.0000");
  });
});
