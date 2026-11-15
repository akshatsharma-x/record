import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/** /dev/kitchen, on the dev server (see playwright.config.ts). */

const THEME_KEY = "classyfolio:theme";

async function choose(page: Page, label: string) {
  await page.locator("label", { hasText: new RegExp(`^${label}$`) }).first().click();
}

test("renders with no layout shift", async ({ page, browserName }) => {
  await page.addInitScript(() => {
    const record = window as unknown as { __shift: number };
    record.__shift = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) record.__shift += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // WebKit has no Layout Instability API; the position check below covers it.
    }
  });
  await page.goto("/dev/kitchen", { waitUntil: "commit" });
  await page.locator("main h2").first().waitFor();
  const positions = () =>
    page.$$eval("main h2, main h3", (headings) => headings.map((h) => Math.round(h.getBoundingClientRect().top + window.scrollY)));
  const early = await positions();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  expect(await positions()).toEqual(early);
  if (browserName === "chromium") {
    expect(await page.evaluate(() => (window as unknown as { __shift: number }).__shift)).toBeLessThan(0.001);
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`has no accessibility violations in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [THEME_KEY, theme]);
    await page.goto("/dev/kitchen");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude("nextjs-portal")
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("applies a saved theme before the first paint", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "dark");
    const record = window as unknown as { __firstFrame: Promise<{ theme: string | null; background: string }> };
    record.__firstFrame = new Promise((resolve) => {
      const look = () => {
        if (!document.body) return requestAnimationFrame(look);
        resolve({
          theme: document.documentElement.getAttribute("data-theme"),
          background: getComputedStyle(document.body).backgroundColor,
        });
      };
      requestAnimationFrame(look);
    });
  }, THEME_KEY);
  await page.goto("/dev/kitchen");
  const first = await page.evaluate(() => (window as unknown as { __firstFrame: Promise<{ theme: string; background: string }> }).__firstFrame);
  expect(first.theme).toBe("dark");
  expect(first.background).not.toBe("rgb(255, 255, 255)");
});

test("the theme choice switches and persists", async ({ page }) => {
  await page.goto("/dev/kitchen");
  await choose(page, "Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme-choice", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await choose(page, "Light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("with reduced motion the theme switches instantly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/kitchen");
  await choose(page, "Dark");
  const state = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    transitioning:
      document.documentElement.hasAttribute("data-theme-switching") || document.documentElement.hasAttribute("data-theme-fading"),
  }));
  expect(state).toEqual({ theme: "dark", transitioning: false });
});

test("the finish switches and persists", async ({ page }) => {
  await page.goto("/dev/kitchen");
  // Minifiers rewrite token spellings (#0066cc → #06c), so compare the color the browser resolves.
  const accent = () =>
    page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--accent-on-light)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
  expect(await accent()).toBe("rgb(0, 102, 204)");
  await choose(page, "Saffron");
  await expect(page.locator("html")).toHaveAttribute("data-finish", "saffron");
  expect(await accent()).toBe("rgb(171, 90, 0)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-finish", "saffron");
});

test("the reduced-motion toggle stills the tokens", async ({ page }) => {
  await page.goto("/dev/kitchen");
  const pressScale = () =>
    page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue("--motion-press-scale")));
  expect(await pressScale()).toBe(0.97);
  await choose(page, "Reduce");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  expect(await pressScale()).toBe(1);
});

test("the stage renders the cube on a capable tier and the poster otherwise", async ({ page }) => {
  await page.goto("/dev/kitchen?tier=HIGH");
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  await page.goto("/dev/kitchen?tier=OFF");
  await expect(page.locator("#stage [role=img] svg")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("the lights go down as a dark section arrives, and stay put with reduced motion", async ({ page }) => {
  await page.goto("/dev/kitchen");
  await expect(page.locator("html")).toHaveAttribute("data-surface-controller", "");
  await page.locator("#lights-down").evaluate((section) => section.scrollIntoView({ block: "center" }));
  await expect(page.locator("html")).toHaveAttribute("data-surface-active", "dark");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveAttribute("data-surface-controller", "");
});
