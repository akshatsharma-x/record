import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the home page shows only a plain page title for now", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Akshat Sharma");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
  expect((await page.locator("body").innerText()).trim()).toBe("Akshat Sharma");
});

test("no gap or placeholder ever renders", async ({ page }) => {
  await page.goto("/");
  expect(await page.content()).not.toMatch(/\bTODO\b/);
  expect(await page.locator("body").innerText()).not.toMatch(/\b(null|undefined|NaN)\b/);
});

test("the home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations).toEqual([]);
});

test("dev-only routes return 404 in production", async ({ request }) => {
  for (const route of ["/dev/content", "/dev/kitchen"]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
  }
});

test("the custom cursor takes over at the first pointer move, but never for touch", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.waitForLoadState("networkidle");
    await page.touchscreen.tap(120, 200);
    await page.waitForTimeout(300);
    await expect(page.locator("html")).not.toHaveClass(/cursor-custom/);
    await expect(page.locator("[data-cursor-root]:not([data-hidden])")).toHaveCount(0);
    return;
  }
  await page.locator("[data-cursor-root]").waitFor({ state: "attached" });
  await expect(page.locator("html")).not.toHaveClass(/cursor-custom/);
  await page.mouse.move(320, 240);
  await expect(page.locator("html")).toHaveClass(/cursor-custom/);
  const dot = (await page.locator(".cursor-dot").boundingBox())!;
  expect(dot.x + dot.width / 2).toBeCloseTo(320, 0);
  expect(dot.y + dot.height / 2).toBeCloseTo(240, 0);
});
