import { expect, type Page, test } from "@playwright/test";
import { visibility } from "./visibility";

/**
 * The hero's portrait edition (DESIGN.md §7), on /dev/hero with the stand-in portrait
 * (scripts/portrait-fixture.mjs). Dev only, so it runs with the kitchen's projects.
 */

const PAGE = "/dev/hero";
const hero = (page: Page) => page.locator("#top");

async function open(page: Page) {
  await page.goto(PAGE);
  await page.locator(".hero-subject-sharp").evaluate((image: HTMLImageElement) => image.decode());
}

/** The share of near-white pixels in a part of the page: how much of the white name shows. */
async function whiteShare(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const png = await page.screenshot({ clip, scale: "css" });
  return page.evaluate(async (data) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const { data: pixels } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let white = 0;
    for (let i = 0; i < pixels.length; i += 4) if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 200) white += 1;
    return white / (pixels.length / 4);
  }, png.toString("base64"));
}

/** A layer's computed translate, as [x, y] in px. */
function translateOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const value = getComputedStyle(element).translate;
    if (value === "none") return [0, 0];
    const [x, y = "0px"] = value.split(" ");
    return [parseFloat(x), parseFloat(y)];
  });
}

test("the subject is the LCP image: preloaded from the head at high priority", async ({ page, browserName }) => {
  await page.addInitScript(() => {
    const entries: string[] = [];
    (window as unknown as { __lcp: string[] }).__lcp = entries;
    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { element: Element | null })[]) {
          entries.push(entry.element?.className ?? "");
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }
  });
  await open(page);
  const preload = page.locator('head link[rel="preload"][as="image"][fetchpriority="high"]');
  await expect(preload).toHaveCount(1);
  expect(await preload.getAttribute("imagesrcset")).toContain("subject");
  await expect(hero(page).locator(".hero-subject-sharp")).toHaveAttribute("fetchpriority", "high");
  // Every layer above the fold loads at once.
  for (const image of await hero(page).locator("img").all()) await expect(image).not.toHaveAttribute("loading", "lazy");
  if (browserName === "chromium") {
    await page.waitForTimeout(1500);
    const lcp = await page.evaluate(() => (window as unknown as { __lcp: string[] }).__lcp);
    expect(lcp.at(-1)).toContain("hero-subject-sharp");
  }
});

test("layers stack back to front: the plate, the name, the subject, then the UI", async ({ page }) => {
  await open(page);
  const order = await page.evaluate(() =>
    [".hero-plate", ".hero-name-layer", ".hero-subject", ".hero-bottom"].map((selector) =>
      Number(getComputedStyle(document.querySelector(selector)!).zIndex),
    ),
  );
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  expect(new Set(order).size).toBe(order.length);
  // The name sits behind the head: hiding the subject reveals more of the letters, but
  // most of the name reads with it there.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1300);
  const box = (await hero(page).locator("#top-title").boundingBox())!;
  const behind = await whiteShare(page, box);
  await page.addStyleTag({ content: ".hero-subject { visibility: hidden; }" });
  const bare = await whiteShare(page, box);
  expect(behind).toBeLessThan(bare * 0.97);
  expect(behind).toBeGreaterThan(bare * 0.6);
});

test("the arrival is a focus pull, over within 1.2s", async ({ page }) => {
  await page.goto(PAGE);
  const timings = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && target.closest("#top") && animation.effect!.getComputedTiming().iterations !== Infinity;
      })
      .map((animation) => ({
        name: (animation as CSSAnimation).animationName,
        target: ((animation.effect as KeyframeEffect).target as Element).className,
        end: Number(animation.effect!.getComputedTiming().endTime),
      })),
  );
  // The 24px plate and the 12px subject fade off their sharper copies: a focus pull.
  expect(timings.filter((timing) => timing.name === "hero-sharpen").map((timing) => timing.target).sort()).toEqual([
    "hero-plate-far",
    "hero-subject-soft",
  ]);
  expect(Math.max(...timings.map((timing) => timing.end))).toBeLessThanOrEqual(1200);
  expect(await hero(page).locator(".hero-plate-far").evaluate((image) => getComputedStyle(image).filter)).toBe("blur(24px)");
  expect(await hero(page).locator(".hero-plate-near").evaluate((image) => getComputedStyle(image).filter)).toBe("blur(8px)");
  expect(await hero(page).locator(".hero-subject-soft").evaluate((image) => getComputedStyle(image).filter)).toBe("blur(12px)");
});

test("the pointer moves the layers in depth: background ±8px, name ±4px, subject ±12px", async ({ page }) => {
  await open(page);
  const box = (await hero(page).boundingBox())!;
  // The far right edge, halfway down: half the range on x, none on y.
  await page.mouse.move(Math.round(box.x + box.width - 1), Math.round(box.y + box.height / 2), { steps: 6 });
  await page.waitForTimeout(1500);
  const [plate, name, subject] = await Promise.all(
    [".hero-plate", ".hero-name-layer", ".hero-subject"].map((selector) => translateOf(page, selector)),
  );
  expect(plate[0]).toBeCloseTo(-4, 0);
  expect(name[0]).toBeCloseTo(-2, 0);
  expect(subject[0]).toBeCloseTo(-6, 0);
});

test("scrolling away: the subject scales toward .92 and rises slower than the name, which fades", async ({ page }) => {
  await open(page);
  const height = (await hero(page).boundingBox())!.height;
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(height / 2));
  // The controller reads the scroll as soon as it hydrates, which a busy dev server can delay.
  await expect.poll(() => hero(page).evaluate((element) => Number(element.style.getPropertyValue("--hero-out")))).toBeGreaterThan(0.3);
  const subject = await hero(page).locator(".hero-subject").evaluate((element) => Number(getComputedStyle(element).scale));
  expect(subject).toBeLessThan(1);
  expect(subject).toBeGreaterThanOrEqual(0.92);
  const [, nameY] = await translateOf(page, ".hero-name-layer");
  const [, subjectY] = await translateOf(page, ".hero-subject");
  expect(nameY).toBeLessThan(0);
  expect(subjectY).toBeGreaterThan(0);
  expect(await hero(page).locator(".hero-name-layer").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(1);
});

test("the aperture dial sets the background blur live, by pointer or keyboard, for the session", async ({ page }) => {
  await open(page);
  const blur = () => hero(page).locator(".hero-plate-near").evaluate((image) => getComputedStyle(image).filter);
  expect(await blur()).toBe("blur(8px)");
  const button = hero(page).getByRole("button", { name: "Aperture" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const dial = hero(page).getByRole("slider", { name: "Aperture" });
  await expect(dial).toBeVisible();
  await expect(dial).toHaveAttribute("aria-valuetext", "ƒ4");
  await dial.fill("0");
  await expect(dial).toHaveAttribute("aria-valuetext", "ƒ1.4");
  await expect.poll(blur).toBe("blur(24px)");
  await dial.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dial).toHaveAttribute("aria-valuetext", "ƒ2");
  await expect.poll(blur).toBe("blur(16px)");
  await page.keyboard.press("End");
  await expect(dial).toHaveAttribute("aria-valuetext", "ƒ16");
  await expect.poll(blur).toBe("blur(2px)");
  // It lasts for the session, from the first paint.
  await page.reload();
  expect(await blur()).toBe("blur(2px)");
  await button.click();
  await expect(dial).toHaveAttribute("aria-valuetext", "ƒ16");
});

test("the dot stays visible over the aperture dial", async ({ page, browserName }) => {
  await open(page);
  await page.mouse.move(200, 300);
  await hero(page).getByRole("button", { name: "Aperture" }).click();
  const panel = hero(page).locator(".aperture-dial");
  await expect(panel).toBeVisible();
  await page.waitForTimeout(1300);
  const box = (await panel.boundingBox())!;
  for (const [fx, fy] of [
    [0.15, 0.2],
    [0.5, 0.92],
  ]) {
    const [x, y] = [Math.round(box.x + box.width * fx), Math.round(box.y + box.height * fy)];
    await page.mouse.move(x, y, { steps: 3 });
    await page.waitForTimeout(400);
    // Over the dial's face the cursor is the full dot, never a button's highlight.
    await expect(page.locator("[data-cursor-root]")).toHaveAttribute("data-state", "default");
    await expect(page.locator("[data-cursor-root]")).toHaveAttribute("data-ink", "light");
    // Headless WebKit doesn't paint backdrop-filter into screenshots, so the dial's glass
    // shows sharp text there that Safari blurs; the pixels are measured in Chromium.
    if (browserName === "chromium") {
      expect(await visibility(page, x, y), `over the dial at ${fx}, ${fy}`).toBeGreaterThanOrEqual(0.2);
    }
  }
});

test("loading the portrait shifts nothing", async ({ page }) => {
  await page.addInitScript(() => {
    const shifts: number[] = [];
    (window as unknown as { __shifts: number[] }).__shifts = shifts;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) shifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await open(page);
  await page.waitForTimeout(1500);
  const shifts = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts);
  expect(shifts.reduce((sum, value) => sum + value, 0)).toBeLessThan(0.01);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the portrait arrives sharp and stays put: no pull, no parallax", async ({ page }) => {
    await open(page);
    for (const selector of [".hero-plate-far", ".hero-subject-soft"]) {
      expect(await hero(page).locator(selector).evaluate((image) => getComputedStyle(image).opacity), selector).toBe("0");
    }
    const box = (await hero(page).boundingBox())!;
    await page.mouse.move(Math.round(box.x + box.width - 1), Math.round(box.y + box.height / 2), { steps: 6 });
    await page.waitForTimeout(800);
    expect(await translateOf(page, ".hero-subject")).toEqual([0, 0]);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the portrait reads in full", async ({ page }) => {
    await page.goto(PAGE);
    const top = hero(page);
    await expect(top.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
    await expect(top.getByRole("img", { name: /stand-in studio portrait/ })).toBeVisible();
    for (const text of ["AI & ML Engineer", "AI & ML Intern at United Airlines"]) await expect(top.getByText(text)).toBeVisible();
    await expect(top.getByRole("link", { name: "See my work" })).toBeVisible();
  });
});
