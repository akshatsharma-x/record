import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { skillsSection } from "@/content/derive";

/**
 * Skills (DESIGN.md §7.7, Part 10): the chip, the core six, the specs and the cloud, "Show
 * me where", and /specs. Every skill is reachable by keyboard and screen reader; the
 * evidence links go where derive.ts says; and the 3D chip draws on the site's one canvas.
 */

const section = skillsSection(content);
const WIDE = { width: 1440, height: 900 };

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The section in view, its behavior loaded. */
async function toSkills(page: Page) {
  await page.locator("#skills").evaluate((element) => element.scrollIntoView());
  await expect(page.locator("#skills")).toHaveAttribute("data-skills-ready", "");
}

const label = (page: Page, id: string) => page.locator(`.chip-label[data-layer="${id}"]`);

/**
 * The shared stage's canvases, and any canvas inside the chip. (Asking a canvas for a WebGL
 * context would create one, so the test reads the markup.)
 */
const webgl = (page: Page) => page.evaluate(() => document.querySelectorAll(".stage-canvas canvas").length);
const ownCanvas = (page: Page) => page.locator("#chip canvas");

test.describe("the chip", () => {
  test("explodes into six labeled layers, top to bottom, each with its count", async ({ page }) => {
    await open(page);
    const labels = page.locator(".chip-label");
    await expect(labels).toHaveCount(6);
    for (const [i, layer] of section.layers.entries()) {
      await expect(labels.nth(i).locator(".chip-label-name")).toHaveText(layer.category);
      await expect(labels.nth(i).locator(".chip-label-count")).toHaveText(layer.count);
    }
    await expect(page.locator("#skills-title")).toHaveText(content.copy.skills.headline);
  });

  test("hovering or focusing a layer slides it out and lists its skills beside it", async ({ page, isMobile }) => {
    await page.setViewportSize(isMobile ? { width: 393, height: 852 } : WIDE);
    await open(page);
    await toSkills(page);
    const layer = section.layers[2];
    const list = page.locator(`.chip-list[data-layer="${layer.id}"]`);
    if (isMobile) await label(page, layer.id).tap();
    else await label(page, layer.id).hover();
    await expect(label(page, layer.id)).toHaveAttribute("aria-expanded", "true");
    await expect(list).toBeVisible();
    await expect(list.locator("li")).toHaveText(layer.skills.map((skill) => skill.label));
    await expect(page.locator(`.chip-layer[data-layer="${layer.id}"]`)).toHaveAttribute("data-active", "");
    // Focus does it too, and each label names its list.
    await label(page, section.layers[0].id).focus();
    await expect(label(page, section.layers[0].id)).toHaveAttribute("aria-expanded", "true");
    await expect(label(page, section.layers[0].id)).toHaveAttribute("aria-controls", `chip-${section.layers[0].id}`);
    await expect(page.locator(`#chip-${section.layers[0].id}`)).toBeVisible();
  });

  test("the die's button ripples the cores", async ({ page }) => {
    await open(page);
    await toSkills(page);
    const die = page.locator("[data-chip-die]");
    await expect(die).toHaveAccessibleName(content.copy.skills.chip.cores);
    await die.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.locator("#chip")).toHaveAttribute("data-ripple", "");
  });

  test("on a capable tier it's 3D on the site's one canvas; on others, the poster", async ({ browser, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit has the GPU here; headless Chromium is software-rendered and gets the poster");
    const context = await browser.newContext({ viewport: WIDE });
    await context.addInitScript(() => sessionStorage.setItem("classyfolio:tier-override", "HIGH"));
    const page = await context.newPage();
    await open(page);
    // The stage is asked for three screens ahead, and the poster gives way only off screen.
    await expect(page.locator("#chip")).toHaveAttribute("data-scene", "poster");
    expect(await webgl(page)).toBe(0);
    await page.locator("#work").evaluate((element) => element.scrollIntoView());
    await expect.poll(() => webgl(page)).toBe(1);
    await expect(page.locator("#chip")).toHaveAttribute("data-scene", "3d");
    // The chip draws on the site's one stage, never on a canvas of its own.
    await expect(ownCanvas(page)).toHaveCount(0);
    await toSkills(page);
    // The stage is tall, so the chip can rise, turn and explode; the labels wait for it.
    const stage = await page.locator("#chip").evaluate((element) => element.getBoundingClientRect().height / window.innerHeight);
    expect(stage).toBeGreaterThan(1.5);
    await page.locator("#chip").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
    await expect(page.locator("#chip")).not.toHaveAttribute("data-exploded", "");
    await page.locator("#chip").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + element.getBoundingClientRect().height - window.innerHeight));
    await expect(page.locator("#chip")).toHaveAttribute("data-exploded", "");
    await context.close();

    // With the tier off, no canvas at all: the poster, the same labels and lists.
    const off = await browser.newContext({ viewport: WIDE });
    await off.addInitScript(() => sessionStorage.setItem("classyfolio:tier-override", "OFF"));
    const plain = await off.newPage();
    await open(plain);
    await toSkills(plain);
    await expect(plain.locator("#chip")).toHaveAttribute("data-scene", "poster");
    await expect(plain.locator(".chip-poster")).toBeVisible();
    expect(await webgl(plain)).toBe(0);
    await off.close();
  });

  test("with reduced motion, it's the poster", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await toSkills(page);
    await expect(page.locator("#chip")).toHaveAttribute("data-scene", "poster");
    await expect(page.locator(".chip-poster")).toBeVisible();
  });

  test("without JavaScript, the poster and its lists still work", async ({ browser, isMobile }) => {
    test.skip(isMobile, "Hover");
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".chip-poster")).toBeVisible();
    await page.locator(".chip-label").nth(3).hover();
    // Headless WebKit lays out a :has(:hover) change only when it paints, so ask for the style.
    await expect(page.locator(".chip-list").nth(3)).toHaveCSS("display", "block");
    await context.close();
  });
});

test.describe("the core six", () => {
  test("show where each was used, linking to the role, the case study or the paper", async ({ page }) => {
    await open(page);
    const tiles = page.locator(".core-tile");
    await expect(tiles).toHaveCount(6);
    for (const [i, skill] of section.core.entries()) {
      await expect(tiles.nth(i).locator(".core-name")).toHaveText(skill.name);
      const links = tiles.nth(i).locator(".core-link");
      await expect(links).toHaveText(skill.evidence.map((hit) => hit.title));
      for (const [j, hit] of skill.evidence.entries()) await expect(links.nth(j)).toHaveAttribute("href", hit.href);
    }
    // No bars, percentages or years.
    await expect(page.locator(".core-six")).not.toContainText("%");
    await expect(page.locator(".core-six progress, .core-six meter")).toHaveCount(0);
  });
});

test.describe("every skill, two ways", () => {
  test("the specs list every skill by category, each a button the keyboard reaches", async ({ page, isMobile, browserName }) => {
    await open(page);
    const buttons = page.locator(".specs-skill");
    await expect(buttons).toHaveCount(section.items.length);
    const terms = await page.locator(".skills .specs-term").allTextContents();
    expect(terms).toEqual(section.categories.map((category) => category.name));
    for (const skill of section.items) await expect(page.locator(`.specs-skill[data-skill="${skill.id}"]`)).toHaveAccessibleName(skill.label);
    test.skip(isMobile, "A keyboard");
    await buttons.first().focus();
    // Safari moves between buttons with Option-Tab.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(buttons.nth(1)).toBeFocused();
  });

  test("the switch shows the cloud: a honeycomb of every skill, keyboard-navigable", async ({ page, isMobile }) => {
    await open(page);
    await toSkills(page);
    const cloud = page.locator(".skills-switch label", { hasText: content.copy.skills.views.cloud });
    if (isMobile) await cloud.tap();
    else await cloud.click();
    await expect(page.locator(".skills-view[data-view='cloud']")).toBeVisible();
    await expect(page.locator(".skills-view[data-view='specs']")).toBeHidden();
    const cells = page.locator(".cloud-cell");
    await expect(cells).toHaveCount(section.items.length);
    // The core six are in the middle.
    await expect(cells.first()).toHaveAttribute("data-skill", section.core[0].id);
    test.skip(isMobile, "A keyboard");
    await cells.first().focus();
    await page.keyboard.press("ArrowRight");
    const focused = page.locator(".cloud-cell:focus");
    await expect(focused).toHaveCount(1);
    await expect(focused).not.toHaveAttribute("data-skill", section.core[0].id);
    await expect(page.locator("[data-cloud-name]")).not.toBeEmpty();
    await expect(page.locator(".cloud")).toHaveAttribute("data-fisheye", "");
  });

  test("Show me where lights up what uses a skill, and the Island jumps to the first", async ({ page, isMobile }) => {
    await page.setViewportSize(isMobile ? { width: 393, height: 852 } : WIDE);
    await open(page);
    await toSkills(page);
    const next = page.locator('.specs-skill[data-skill="next-js"]');
    if (isMobile) await next.tap();
    else await next.click();
    await expect(next).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-show-me", "next-js");
    await expect(page.locator('[data-evidence-id="role:ey"]')).toHaveAttribute("data-match", "");
    await expect(page.locator('[data-evidence-id="project:cognivault-ai"]')).toHaveAttribute("data-match", "");
    await expect(page.locator('[data-evidence-id="project:quizmuj"]')).not.toHaveAttribute("data-match", "");
    const jump = page.locator(".island-activity-action");
    await expect(jump).toHaveText(/^Jump to Ernst & Young \(EY\)/);
    await expect(jump).toHaveAttribute("href", "#ey-title");
    // The same jump right after the skill, for the keyboard.
    await expect(page.locator(".show-me-inline .show-me-jump")).toHaveAttribute("href", "#ey-title");
    await expect(page.locator("[data-show-me-status]")).toHaveText("Next.js (App Router): Ernst & Young (EY), Cognivault AI.");
    if (isMobile) await jump.tap();
    else await jump.click();
    // It lands on Ernst & Young: on desktop the edit's playhead springs to its clip.
    await expect(page.locator("#ey-title")).toBeInViewport();
    if (!isMobile) await expect(page.locator('.edit-panel[data-panel="ey"]')).toHaveAttribute("data-active", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveAttribute("data-show-me", "");
    await expect(page.locator("[data-match]")).toHaveCount(0);
    await expect(page.locator(".island-activity-action")).toHaveCount(0);
  });

  test("a skill nothing names says so", async ({ page, isMobile }) => {
    await open(page);
    await toSkills(page);
    const sql = page.locator('.specs-skill[data-skill="sql"]');
    if (isMobile) await sql.tap();
    else await sql.click();
    await expect(page.locator(".show-me-inline")).toContainText(content.copy.skills.showMe.none);
    await expect(page.locator(".island-activity-action")).toHaveCount(0);
  });

  test("passes axe", async ({ page }) => {
    await open(page);
    await toSkills(page);
    const { violations } = await new AxeBuilder({ page }).include("#skills").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations).toEqual([]);
  });
});

test.describe("the cloud on a touch screen", () => {
  test("drags to pan and taps to choose", async ({ browser, browserName }) => {
    test.skip(browserName !== "chromium", "Touch is driven through Chromium's DevTools protocol");
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await open(page);
    await toSkills(page);
    await page.locator(".skills-switch label", { hasText: content.copy.skills.views.cloud }).tap();
    const cloud = page.locator(".cloud");
    await cloud.scrollIntoViewIfNeeded();
    const box = (await cloud.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const at = (x: number, y: number) => [{ x: box.x + x, y: box.y + y }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(200, 200) });
    for (let x = 200; x >= 80; x -= 20) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(x, 200) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.locator(".cloud-lattice").evaluate((element) => (element as HTMLElement).style.transform)).toMatch(/translate\(-\d/);
    await page.locator(`.cloud-cell[data-skill="${section.core[0].id}"]`).tap();
    await expect(page.locator(`.cloud-cell[data-skill="${section.core[0].id}"]`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-cloud-caption]")).toContainText(section.core[0].label);
    await context.close();
  });
});

test.describe("/specs", () => {
  test("is the whole sheet: every skill by category, education and coursework", async ({ page }) => {
    await open(page, "/specs");
    await expect(page).toHaveTitle(`Tech specs · ${content.profile.name}`);
    const terms = await page.locator(".specs-term").allTextContents();
    expect(terms).toEqual([...section.categories.map((category) => category.name), content.copy.specs.education, content.copy.specs.coursework]);
    for (const skill of section.items) await expect(page.locator(".specs").getByText(skill.label, { exact: true })).toHaveCount(1);
    const degree = content.education.find((entry) => entry.kind === "degree")!;
    if (degree.kind === "degree") for (const course of degree.coursework) await expect(page.locator(".specs")).toContainText(course);
  });

  test("is linked from the section, and prints as itself", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("link", { name: content.copy.skills.specsLink })).toHaveAttribute("href", "/specs");
    await open(page, "/specs");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".specs-page")).toBeVisible();
    await expect(page.locator(".resume-edition")).toBeHidden();
  });

  test("passes axe", async ({ page }) => {
    await open(page, "/specs");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations).toEqual([]);
  });
});
