import { expect, test } from "@playwright/test";

/**
 * Visual baselines for every edition (Part 15): 390, 820 and 1440 wide, light and dark, with
 * motion and with reduced motion, six sections each. Chromium only: it renders in software
 * here, so the 3D is always its posters and the pictures are the same every run. The clock
 * is fixed, so the hero's date, the live tiles and the contact clock hold still.
 *
 *   npx playwright test tests/e2e/visual.spec.ts --project chromium --update-snapshots
 */

const WIDTHS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 820, height: 1180, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
] as const;
const THEMES = ["light", "dark"] as const;
const MOTION = [
  { name: "motion", reducedMotion: "no-preference" },
  { name: "reduced", reducedMotion: "reduce" },
] as const;
const SECTIONS = ["top", "about", "experience", "work", "credentials", "contact"] as const;

/** 9:41 in Jaipur, on a fixed Wednesday. */
const NOW = new Date("2026-11-18T09:41:00+05:30");

for (const size of WIDTHS) {
  for (const theme of THEMES) {
    for (const motion of MOTION) {
      test.describe(`${size.name}, ${theme}, ${motion.name}`, () => {
        test.use({
          viewport: { width: size.width, height: size.height },
          deviceScaleFactor: 1,
          isMobile: size.mobile,
          hasTouch: size.mobile,
          colorScheme: theme,
          reducedMotion: motion.reducedMotion,
        });

        test("the home page's sections", async ({ page, browserName }) => {
          test.skip(browserName !== "chromium", "Baselines are Chromium's");
          test.setTimeout(90_000);
          await page.clock.setFixedTime(NOW);
          await page.goto("/");
          await page.waitForLoadState("networkidle");
          await page.locator(".island-shell[data-measured]").waitFor();
          await page.evaluate(() => document.fonts.ready);
          for (const id of SECTIONS) {
            await page.locator(`#${id}`).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
            // Reveals, counters and the Island's name settle.
            await page.waitForTimeout(1500);
            await expect(page).toHaveScreenshot(`${size.name}-${theme}-${motion.name}-${id}.png`, {
              animations: "disabled",
              caret: "hide",
              scale: "css",
              maxDiffPixelRatio: 0.01,
            });
          }
        });
      });
    }
  }
}
