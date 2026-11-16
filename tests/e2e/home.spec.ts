import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the home page tells the story in order, each section on its surface", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Akshat Sharma");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
  const sections = await page.locator("main > [data-section]").evaluateAll((all) =>
    all.map((section) => `${section.id}:${section.getAttribute("data-surface")}`),
  );
  expect(sections).toEqual([
    "top:dark",
    "statement:dark",
    "about:light",
    "highlights:light-alt",
    "experience:light",
    "research:dark",
    "work:light-alt",
    "skills:dark",
    "credentials:dark",
    "contact:light",
  ]);
  await expect(page.locator("footer[data-section]")).toHaveAttribute("data-surface", "light-alt");
});

test("every footnote mark links to its note, and back", async ({ page }) => {
  await page.goto("/");
  const marks = page.locator("a[role=doc-noteref]");
  expect(await marks.count()).toBeGreaterThan(0);
  for (const href of await marks.evaluateAll((all) => all.map((a) => a.getAttribute("href")))) {
    await expect(page.locator(href!)).toHaveCount(1);
  }
  for (const href of await page.locator("a[role=doc-backlink]").evaluateAll((all) => all.map((a) => a.getAttribute("href")))) {
    await expect(page.locator(href!)).toHaveCount(1);
  }
});

for (const locale of ["en-IN", "de-DE", "ja-JP"]) {
  test.describe(`in ${locale}`, () => {
    test.use({ locale });

    test("hydrates without a mismatch or any other error", async ({ page }) => {
      // The HTML is written one fixed way; a visitor's locale may only change it after hydration.
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.locator("#about").scrollIntoViewIfNeeded();
      await page.locator("#highlights").scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  });
}

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
