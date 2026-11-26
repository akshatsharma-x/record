import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { medals, wallet } from "@/content/derive";

/**
 * Credentials (DESIGN.md §7.8, Part 11): the wallet and the medals. The heading derives from
 * content; the first pass is Education; every pass and medal is reachable and readable by
 * keyboard and screen reader; the medals are 3D on the site's one canvas where the tier
 * allows, and stills everywhere else. The fixture wallet's stack is tested on the kitchen
 * (credentials-kitchen.spec.ts).
 */

const WIDE = { width: 1440, height: 900 };
const words = content.copy.credentials;
const [education] = wallet(content).passes;
const honors = medals(content);
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function open(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/** The section in view, its behavior loaded. */
async function toCredentials(page: Page) {
  await page.locator("#credentials").evaluate((element) => element.scrollIntoView());
  await expect(page.locator("#credentials")).toHaveAttribute("data-credentials-ready", "");
}

const pass = (page: Page, id: string) => page.locator(`#pass-${id}`);
const face = (page: Page, id: string, side: "front" | "back") => pass(page, id).locator(`.pass-face[data-face="${side}"]`);
const webgl = (page: Page) => page.evaluate(() => document.querySelectorAll(".stage-canvas canvas").length);

test.describe("the wallet", () => {
  test('is headed "Credentials." now content has certificates, a pass for each after Education, and never counts them (Part 20)', async ({ page }) => {
    await open(page);
    await expect(page.locator("#credentials-title")).toHaveText(words.headline);
    await expect(page.locator("#credentials")).not.toContainText(/\d+ certificates?/i);
    await expect(page.locator("#credentials .pass")).toHaveCount(1 + content.certificates.length);
  });

  test("opens with Education: the university, the degree, the class and the grade", async ({ page }) => {
    await open(page);
    const front = face(page, education.id, "front");
    await expect(front.locator(".pass-kind")).toHaveText(words.wallet.education);
    await expect(front.locator(".pass-title")).toHaveText("Manipal University Jaipur");
    await expect(front.locator(".pass-subtitle")).toHaveText(education.subtitle);
    await expect(front.locator(".pass-field")).toHaveText([`${words.wallet.classOf}2027`, `${words.wallet.grade}CGPA 8.79/10`]);
  });

  test("the ⓘ turns it over to the coursework, Class XII and Class X, and back", async ({ page, isMobile }) => {
    await open(page);
    await toCredentials(page);
    const flip = pass(page, education.id).locator(".pass-flip");
    await expect(flip.locator("input")).toHaveAccessibleName(`${words.wallet.flip}: ${education.title}`);
    if (isMobile) await flip.tap();
    else await flip.click();
    const back = face(page, education.id, "back");
    await expect(back).toBeVisible();
    await expect(back.locator(".pass-row dt")).toHaveText([words.wallet.coursework, "Class XII", "Class X"]);
    await expect(back.locator(".pass-row dd")).toHaveText([/Design & Analysis of Algorithms/, "95.4%, 2022", "93.8%, 2020"]);
    // The face turned away leaves the accessibility tree with it.
    await expect(face(page, education.id, "front")).toBeHidden();
    if (isMobile) await flip.tap();
    else await flip.click();
    await expect(face(page, education.id, "front")).toBeVisible();
    await expect(back).toBeHidden();
  });

  test("the keyboard reaches the pass, F turns it over (not focus mode) and Escape turns it back", async ({ page, isMobile }) => {
    test.skip(isMobile, "A keyboard");
    await open(page);
    await toCredentials(page);
    const select = pass(page, education.id).locator(".pass-select");
    await expect(page.locator("#credentials .wallet")).toHaveAttribute("data-stacked", "");
    await expect(select).toHaveAccessibleName(education.title);
    await expect(select).toHaveAttribute("aria-pressed", "true");
    await select.focus();
    await page.keyboard.press("f");
    await expect(face(page, education.id, "back")).toBeVisible();
    await expect(pass(page, education.id).locator(".pass-flip input")).toBeFocused();
    await expect(page.locator("html")).not.toHaveAttribute("data-focus-mode", "");
    await page.keyboard.press("Escape");
    await expect(face(page, education.id, "front")).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-focus-mode", "");
  });

  test("with reduced motion it's a plain grid, and the turn is a crossfade", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await toCredentials(page);
    await expect(page.locator("#credentials .wallet")).not.toHaveAttribute("data-stacked", "");
    await expect(pass(page, education.id).locator(".pass-select")).toBeHidden();
    await expect(face(page, education.id, "back")).toHaveCSS("rotate", "none");
    await expect(face(page, education.id, "back")).toHaveCSS("transition-property", /opacity/);
  });

  test("without JavaScript, the ⓘ still turns a pass over", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE });
    const page = await context.newPage();
    await page.goto("/");
    await pass(page, education.id).locator(".pass-flip").click();
    await expect(face(page, education.id, "back")).toBeVisible();
    // The medals are stills, with everything their faces say in words beside them.
    await expect(page.locator(".medal-still")).toHaveCount(honors.length);
    await expect(page.locator(".medal-turn").first()).toBeHidden();
    await context.close();
  });
});

test.describe("the medals", () => {
  test("are one per honor, in the order they were won, each its own shape, every word in the DOM", async ({ page }) => {
    await open(page);
    const list = page.locator(".medal");
    await expect(list).toHaveCount(3);
    await expect(list.locator(".medal-name")).toHaveText(honors.map((medal) => medal.title));
    await expect(list.locator(".medal-line")).toHaveText(["2024", "2024 · 2025 · top 50 of 300+", "2026"]);
    const shapes = await list.evaluateAll((items) => items.map((item) => item.getAttribute("data-shape")));
    expect(new Set(shapes).size).toBe(3);
    await expect(page.locator(".medals-title")).toHaveText(words.honors);
  });

  test("on a capable tier they're 3D on the site's one canvas, and turn, spin and come to rest", async ({ browser, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit has the GPU here; headless Chromium is software-rendered and gets the stills");
    const context = await browser.newContext({ viewport: WIDE });
    await context.addInitScript(() => sessionStorage.setItem("classyfolio:tier-override", "HIGH"));
    const page = await context.newPage();
    await open(page);
    // Approached from above, the 3D takes over while they're off screen and the page is still.
    await page.locator(".skills-specs-link").evaluate((element) => element.scrollIntoView({ block: "end" }));
    for (const medal of honors) await expect(page.locator(`#medal-${medal.id}`)).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
    await expect.poll(() => webgl(page)).toBe(1);
    await expect(page.locator(".medal canvas")).toHaveCount(0);
    await toCredentials(page);
    const medal = page.locator(`#medal-${honors[1].id}`);
    const turn = medal.locator(".medal-turn");
    await medal.scrollIntoViewIfNeeded();
    await expect(turn).toHaveAttribute("data-cursor", "drag");
    // A click turns it over; it settles on its back, and stays there, still.
    await turn.click();
    await expect(turn).toHaveAttribute("aria-pressed", "true");
    await expect(medal).not.toHaveAttribute("data-spinning", "");
    await expect(medal).toHaveAttribute("data-flipped", "");
    // A drag spins it with inertia, and it comes to rest on a face.
    const box = (await turn.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(box.x + box.width * (0.2 + i * 0.1), box.y + box.height / 2);
    await page.mouse.up();
    await expect(medal).not.toHaveAttribute("data-spinning", "", { timeout: 8_000 });
    await expect(turn).toHaveAttribute("aria-pressed", /true|false/);
    await context.close();
  });

  test("with reduced motion they're stills, and a click turns one over", async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await toCredentials(page);
    const medal = page.locator(`#medal-${honors[0].id}`);
    await expect(medal).toHaveAttribute("data-scene", "poster");
    await expect(medal.locator(".medal-still")).toBeVisible();
    const turn = medal.locator(".medal-turn");
    await expect(turn).toHaveAccessibleName(`${words.medals.flip}: ${honors[0].title} ${words.medals.medal}`);
    if (isMobile) await turn.tap();
    else await turn.click();
    await expect(turn).toHaveAttribute("aria-pressed", "true");
    await expect(medal).toHaveAttribute("data-flipped", "");
    await expect(medal.locator('.medal-face[data-face="back"]')).toHaveCSS("opacity", "1");
  });

  test("Enter and Space turn a medal over from the keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "A keyboard");
    await open(page);
    await toCredentials(page);
    const turn = page.locator(`#medal-${honors[2].id} .medal-turn`);
    await turn.focus();
    await page.keyboard.press("Enter");
    await expect(turn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(`#medal-${honors[2].id}`)).not.toHaveAttribute("data-spinning", "");
    await page.keyboard.press("Space");
    await expect(turn).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("the keyboard path", () => {
  test("Tab reaches the pass, its ⓘ, then each medal, in order", async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, "A keyboard");
    await open(page);
    await toCredentials(page);
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    const select = pass(page, education.id).locator(".pass-select");
    await select.focus();
    await page.keyboard.press(tab);
    await expect(pass(page, education.id).locator(".pass-flip input")).toBeFocused();
    // Then each medal's button, with a caption's footnote link between them where it has one.
    const reached: string[] = [];
    for (let i = 0; i < 8 && reached.length < honors.length; i++) {
      await page.keyboard.press(tab);
      const at = await page.evaluate(() => {
        const element = document.activeElement;
        return element?.classList.contains("medal-turn") ? (element.closest(".medal")?.getAttribute("data-medal") ?? "") : element?.closest(".medal") ? "in a caption" : "elsewhere";
      });
      expect(at).not.toBe("elsewhere");
      if (at !== "in a caption") reached.push(at);
    }
    expect(reached).toEqual(honors.map((medal) => medal.id));
  });
});

test.describe("accessibility", () => {
  test("the section has no axe violations, face up and turned over", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page);
    await toCredentials(page);
    let { violations } = await new AxeBuilder({ page }).include("#credentials").withTags(TAGS).analyze();
    expect(violations).toEqual([]);
    await pass(page, education.id).locator(".pass-flip").click();
    await expect(face(page, education.id, "back")).toBeVisible();
    ({ violations } = await new AxeBuilder({ page }).include("#credentials").withTags(TAGS).analyze());
    expect(violations).toEqual([]);
  });
});
