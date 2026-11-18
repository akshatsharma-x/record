import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { research, work } from "@/content/derive";

/**
 * Every edition, complete (DESIGN.md §2, §5.7, §10; Part 15), on the production build:
 * phones, reduced motion, reduced transparency, increased contrast, forced colors, no
 * JavaScript and the tiers' governor. Each part's own spec tests its own editions; these
 * are what the audit found across them.
 */

const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.locator(".island-shell[data-measured]").waitFor();
}

const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe("phones", () => {
  test.skip(({ isMobile }) => !isMobile, "Phones");

  test("the reel's dots are 44pt targets, and the pause wraps under them rather than over them", async ({ page }) => {
    await open(page);
    await page.locator(".reel-controls").scrollIntoViewIfNeeded();
    const dots = page.locator(".reel-dot");
    await expect(dots).toHaveCount(content.highlights.length);
    for (const dot of await dots.all()) {
      const { width, height } = (await dot.boundingBox())!;
      expect(Math.round(width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(height)).toBeGreaterThanOrEqual(44);
    }
    const [pill, pause] = await Promise.all([box(page, ".reel-dots"), box(page, ".reel-pause")]);
    expect(overlaps(pill, pause)).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("the Island's sheet keeps its actions along its foot, nearest the thumb, every one 44pt", async ({ page }) => {
    await open(page);
    await page.locator(".island-toggle").tap();
    await expect(page.locator(".island-toggle")).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(600);
    const links = await page.locator(".island-link").evaluateAll((all) => all.map((link) => link.getBoundingClientRect().bottom));
    const lowest = Math.max(...links);
    for (const selector of [".island-search", ".island-theme button", ".island-hello"]) {
      const { y, width, height } = await box(page, selector);
      expect(y, selector).toBeGreaterThanOrEqual(lowest);
      expect(Math.round(width), selector).toBeGreaterThanOrEqual(44);
      expect(Math.round(height), selector).toBeGreaterThanOrEqual(44);
    }
  });

  test("tapping the Island's bar again closes its sheet", async ({ page }) => {
    await open(page);
    const toggle = page.locator(".island-toggle");
    const at = async () => {
      const { x, y, width, height } = (await toggle.boundingBox())!;
      return [x + width / 2, y + height / 2] as const;
    };
    await page.touchscreen.tap(...(await at()));
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(500);
    await page.touchscreen.tap(...(await at()));
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("the dock names each tile under it, as the Home Screen does: nothing waits behind a hover", async ({ page }) => {
    await open(page);
    await page.locator(".dock").scrollIntoViewIfNeeded();
    for (const app of ["email", "linkedin", "github"]) {
      const label = page.locator(`.dock-item[data-app="${app}"] .dock-label`);
      await expect(label).toHaveCSS("opacity", "1");
      const [tile, name] = await Promise.all([box(page, `.dock-item[data-app="${app}"] .dock-tile`), label.boundingBox()]);
      expect(name!.y).toBeGreaterThan(tile.y + tile.height);
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no pins, no loops, no blur and no 3D anywhere on the page, and every scene at its end", async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize(WIDE);
    await open(page);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => ({
      sticky: [...document.querySelectorAll("main *")].filter((el) => getComputedStyle(el).position === "sticky").map((el) => el.className.toString()),
      loops: document
        .getAnimations()
        .filter((animation) => animation.playState === "running" && animation.effect?.getTiming().iterations === Infinity)
        .map((animation) => (animation as CSSAnimation).animationName ?? "?"),
      blur: [...document.querySelectorAll("[data-resolve]")].filter((el) => getComputedStyle(el).transitionProperty.includes("filter")).length,
      scenes: [...document.querySelectorAll("[data-scene]")].map((el) => el.getAttribute("data-scene")),
      webgl: document.querySelectorAll(".stage-canvas canvas").length,
    }));
    expect(state.sticky).toEqual([]);
    expect(state.loops).toEqual([]);
    expect(state.blur).toBe(0);
    expect(state.scenes.every((scene) => scene === "poster")).toBe(true);
    expect(state.webgl).toBe(0);
    // The statement reads fully filled, and the edit is the stack.
    await expect(page.locator("#edit")).not.toHaveAttribute("data-editing", "");
  });
});

test.describe("materials", () => {
  test.skip(({ isMobile }) => isMobile, "One width is enough");

  /** The dock's glass and Search's panel: solid, unblurred. */
  async function expectSolid(page: Page) {
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator(".dock").scrollIntoViewIfNeeded();
    const dock = await page.locator(".dock-glass").evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, filter: getComputedStyle(el).backdropFilter || getComputedStyle(el).getPropertyValue("-webkit-backdrop-filter") }));
    expect(dock.filter).toMatch(/^(none|)$/);
    expect(dock.bg).not.toMatch(/rgba\(.*, 0\.\d+\)/);
    await page.keyboard.press("Meta+k");
    const panel = page.locator(".search-panel");
    await expect(panel).toBeVisible();
    const search = await panel.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, filter: getComputedStyle(el).backdropFilter || getComputedStyle(el).getPropertyValue("-webkit-backdrop-filter") }));
    expect(search.filter).toMatch(/^(none|)$/);
    expect(search.bg).not.toMatch(/rgba\(.*, 0\.\d+\)/);
  }

  test("reduced transparency turns every material solid", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Emulated through Chromium's DevTools protocol");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    await expectSolid(page);
  });

  test("increased contrast turns every material solid and the hairlines stronger", async ({ page }) => {
    await page.emulateMedia({ contrast: "more" });
    await expectSolid(page);
    // A hairline at 36% ink rather than 8% (styles/tokens.css).
    const alpha = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--neutral-light-hairline)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return Number(/[\d.]+(?=\)$)/.exec(value)?.[0] ?? 1);
    });
    expect(alpha).toBeGreaterThan(0.3);
  });

  test("forced colors: solid materials, the system's cursor, and every choice in the system's highlight", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Forced colors are emulated in Chromium");
    await page.emulateMedia({ forcedColors: "active" });
    await expectSolid(page);
    await page.keyboard.press("Escape");
    await page.mouse.move(400, 400);
    await page.mouse.move(420, 420, { steps: 3 });
    await expect(page.locator("html")).not.toHaveClass(/cursor-custom/);
    const highlight = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "Highlight";
      document.body.append(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    });
    const chosen = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect.poll(() => chosen(".work-filter > label:has(> input:checked)")).toBe(highlight);
    await page.locator(".footer-settings-block").scrollIntoViewIfNeeded();
    await expect.poll(() => chosen(".footer-settings-block .segmented > label:has(> input:checked)")).toBe(highlight);
    // A switch is drawn: its track outlined, its thumb filled.
    const track = await page.locator(".switch-track").first().evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(track).not.toBe("0px");
  });
});

test.describe("without JavaScript", () => {
  test("every section link lands below the Island, and the 3D is its posters", async ({ browser, isMobile }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: isMobile ? PHONE : WIDE, isMobile, hasTouch: isMobile });
    const page = await context.newPage();
    // The open Island never sits over the hero's name.
    await page.goto("/");
    const [name, island] = await Promise.all([page.locator("#top h1").boundingBox(), page.locator(".island-shell").boundingBox()]);
    expect(overlaps(name!, island!)).toBe(false);
    for (const id of ["experience", "research", "work", "skills", "credentials", "contact"]) {
      await page.goto("/");
      await page.locator(`.island-link[href="/#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      const top = await page.evaluate((section) => document.getElementById(section)!.getBoundingClientRect().top, id);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThan(120);
    }
    await expect(page.locator("#chip")).toHaveAttribute("data-scene", "poster");
    await expect(page.locator("#chip svg").first()).toBeVisible();
    expect(await page.locator(".stage-canvas canvas").count()).toBe(0);
    await context.close();
  });
});

test.describe("the tiers", () => {
  test.skip(({ isMobile, browserName }) => isMobile || browserName !== "webkit", "Where the stage runs: WebKit has the GPU here");

  /** Near the chip but off screen, where its scene takes over from the poster. */
  async function nearChip(page: Page) {
    await open(page);
    await page.locator("#chip").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 2 * window.innerHeight));
    const scene = await page
      .waitForFunction(() => document.getElementById("chip")?.getAttribute("data-scene") === "3d", null, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!scene, "This machine's WebKit has no GPU tier, so the stage never runs");
  }

  test("the governor drops to posters for the session once frames stay slower than 24ms for two seconds", async ({ page, context }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(WIDE);
    // Once armed, every animation frame costs 40ms, as on a device that can't keep up.
    await context.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        raf((time) => {
          if ((window as unknown as { __slow?: boolean }).__slow) {
            const end = performance.now() + 40;
            while (performance.now() < end);
          }
          callback(time);
        });
    });
    await nearChip(page);
    await page.evaluate(() => ((window as unknown as { __slow: boolean }).__slow = true));
    // Scrolling into the stage keeps the chip moving, so the stage keeps drawing.
    await expect(async () => {
      await page.mouse.wheel(0, 160);
      await expect(page.locator("#chip")).toHaveAttribute("data-scene", "poster", { timeout: 250 });
    }).toPass({ timeout: 30_000, intervals: [100] });
    expect(await page.evaluate(() => sessionStorage.getItem("classyfolio:tier"))).toBe("LOW");
  });

  test("the scene's taller stage never moves what's in view: the Island's travel lands, and stays", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(WIDE);
    await open(page);
    await page.locator(".island-toggle").focus();
    await page.locator('.island-link[href="/#credentials"]').click();
    // The travel passes the chip; its scene takes over once it's off screen and the page is still.
    const scene = await page
      .waitForFunction(() => document.getElementById("chip")?.getAttribute("data-scene") === "3d", null, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!scene, "This machine's WebKit has no GPU tier, so the stage never runs");
    await page.waitForTimeout(500);
    const heading = page.locator("#credentials-title");
    await expect(heading).toBeInViewport();
    const top = (await heading.boundingBox())!.y;
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(400);
  });
});

/** Until nothing is mid-reveal: no transition or one-off animation still running. */
async function settle(page: Page) {
  await page.waitForTimeout(300);
  await page
    .waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity), null, { timeout: 5_000 })
    .catch(() => undefined);
}

test.describe("axe, everywhere", () => {
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  const ROUTES = [
    "/",
    "/specs",
    "/colophon",
    "/compare",
    ...work(content).tiles.map((tile) => tile.href),
    ...research(content).map((paper) => paper.href),
    "/a-page-that-isnt-here",
  ];

  for (const theme of ["light", "dark"] as const) {
    test(`reports nothing on any route, in the ${theme} theme`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: theme });
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        // Reveals done: text mid-fade isn't its own contrast.
        await settle(page);
        const passes = route === "/" ? ["top", "scrolled"] : ["top"];
        for (const pass of passes) {
          if (pass === "scrolled") {
            // Every lazy part loaded and revealed, then back at the top.
            await page.evaluate(async () => {
              for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
                window.scrollTo(0, y);
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            });
            await settle(page);
          }
          const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
          expect(violations.map((violation) => `${route} (${pass}): ${violation.id} ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
        }
      }
    });
  }
});

