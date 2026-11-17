import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { FIXTURE_CERTIFICATES } from "@/content/fixtures";

/**
 * The full wallet (DESIGN.md §7.8), with the fixture certificates (content/fixtures.ts) on
 * /dev/kitchen: certificates added to content are passes with no code change, and the
 * stack, its spring, its keys and its expiry work with several.
 */

const words = content.copy.credentials;
const ids = ["manipal-university-jaipur", ...FIXTURE_CERTIFICATES.map((certificate) => certificate.id)];
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

/** The kitchen's wallet in view, its behavior loaded. (A dev server under load may never go network-idle.) */
async function toWallet(page: Page) {
  await page.goto("/dev/kitchen");
  await page.locator("#kitchen-credentials").evaluate((element) => element.scrollIntoView());
  await expect(page.locator("#kitchen-credentials")).toHaveAttribute("data-credentials-ready", "", { timeout: 15_000 });
}

const pass = (page: Page, id: string) => page.locator(`#kitchen-credentials #pass-${id}`);
const top = (page: Page, id: string) => pass(page, id).evaluate((element) => element.getBoundingClientRect().top);

test("certificates in content are passes, in content's order, with no code change", async ({ page }) => {
  await toWallet(page);
  await expect(page.locator("#kitchen-credentials-title")).toHaveText(words.headline);
  const passes = page.locator("#kitchen-credentials .pass");
  await expect(passes).toHaveCount(ids.length);
  expect(await passes.evaluateAll((items) => items.map((item) => item.getAttribute("data-pass")))).toEqual(ids);
  for (const certificate of FIXTURE_CERTIFICATES) {
    await expect(pass(page, certificate.id).locator(".pass-title")).toHaveText(certificate.title);
    await expect(pass(page, certificate.id).locator(".pass-qr")).toHaveCount(certificate.verifyUrl ? 1 : 0);
  }
});

test("the stack: the pass in front shows whole, and clicking another brings it forward as the rest slide down", async ({ page }) => {
  await toWallet(page);
  await expect(page.locator("#kitchen-credentials .wallet")).toHaveAttribute("data-stacked", "");
  await expect(pass(page, ids[0])).toHaveAttribute("data-front", "");
  // Its top shows beneath the pass in front: click it there.
  await pass(page, ids[2]).locator(".pass-select").click({ position: { x: 48, y: 24 } });
  await expect(pass(page, ids[2])).toHaveAttribute("data-front", "");
  await expect(pass(page, ids[2]).locator(".pass-select")).toHaveAttribute("aria-pressed", "true");
  await expect(pass(page, ids[0]).locator(".pass-select")).toHaveAttribute("aria-pressed", "false");
  // On the spring: once it settles, it's on top and the others are beneath it, in order.
  await expect.poll(async () => (await top(page, ids[2])) < (await top(page, ids[0]))).toBe(true);
  await expect.poll(async () => (await top(page, ids[0])) < (await top(page, ids[1]))).toBe(true);
  await expect.poll(async () => (await top(page, ids[1])) < (await top(page, ids[3]))).toBe(true);
});

test("hovering lifts a pass in the stack", async ({ page }) => {
  await toWallet(page);
  await pass(page, ids[1]).hover({ position: { x: 48, y: 24 } });
  await expect(pass(page, ids[1])).not.toHaveCSS("translate", "none");
});

test("the arrows move through the stack, Enter brings a pass forward, F turns it over and Escape back", async ({ page }) => {
  await toWallet(page);
  await pass(page, ids[0]).locator(".pass-select").focus();
  await page.keyboard.press("ArrowDown");
  await expect(pass(page, ids[1]).locator(".pass-select")).toBeFocused();
  await page.keyboard.press("End");
  await expect(pass(page, ids[3]).locator(".pass-select")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(pass(page, ids[2]).locator(".pass-select")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(pass(page, ids[2])).toHaveAttribute("data-front", "");
  await page.keyboard.press("f");
  await expect(pass(page, ids[2]).locator('.pass-face[data-face="back"]')).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-focus-mode", "");
  await page.keyboard.press("Escape");
  await expect(pass(page, ids[2]).locator('.pass-face[data-face="front"]')).toBeVisible();
  // F on a pass in the stack brings it forward, turned over.
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const third = await page.evaluate(() => document.activeElement?.closest(".pass")?.getAttribute("data-pass"));
  expect(third).toBe(ids[1]);
  await page.keyboard.press("F");
  await expect(pass(page, ids[1])).toHaveAttribute("data-front", "");
  await expect(pass(page, ids[1]).locator('.pass-face[data-face="back"]')).toBeVisible();
  // The pass that left the front turned back to its face.
  await expect(pass(page, ids[2]).locator(".pass-flip input")).not.toBeChecked();
});

test("an expired pass says so, front and back; one that never expires says that", async ({ page }) => {
  await toWallet(page);
  await expect(pass(page, "fixture-expired").locator(".pass-badge")).toBeVisible();
  await expect(pass(page, "fixture-expired").locator(".pass-badge")).toHaveText(words.wallet.expired);
  await expect(pass(page, "fixture-cloud").locator(".pass-badge")).toBeHidden();
  const expiry = (id: string) => pass(page, id).locator("[data-expiry-label]");
  await expect(pass(page, "fixture-expired").locator(".pass-row").last()).toHaveText(`${words.wallet.expired}Jan 2025`);
  await expect(expiry("fixture-cloud")).toHaveText(words.wallet.expires);
  await expect(pass(page, "fixture-ml").locator(".pass-row").last()).toHaveText(`${words.wallet.expires}${words.wallet.never}`);
});

test("with reduced motion, every pass shows whole in a plain grid", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toWallet(page);
  await expect(page.locator("#kitchen-credentials .wallet")).not.toHaveAttribute("data-stacked", "");
  const tops = await Promise.all(ids.map((id) => top(page, id)));
  const height = await pass(page, ids[0]).evaluate((element) => element.getBoundingClientRect().height);
  for (let i = 1; i < tops.length; i++) expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(height);
  // The arrows still move between the passes, through their ⓘ.
  await pass(page, ids[0]).locator(".pass-flip input").focus();
  await page.keyboard.press("ArrowDown");
  await expect(pass(page, ids[1]).locator(".pass-flip input")).toBeFocused();
});

test("the full wallet has no axe violations", async ({ page }) => {
  await toWallet(page);
  const { violations } = await new AxeBuilder({ page }).include("#kitchen-credentials").withTags(TAGS).analyze();
  expect(violations).toEqual([]);
});
