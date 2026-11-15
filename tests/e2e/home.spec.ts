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
