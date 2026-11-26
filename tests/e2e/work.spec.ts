import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { caseStudies, work } from "@/content/derive";
import { numbersIn } from "@/content/numbers";

/**
 * Work (DESIGN.md §7.6, Part 9): the bento, its filter, the living previews, and each
 * project's case study, which opens over the page as a sheet and stands as its own page.
 * Filtering, opening and closing work by mouse, keyboard and touch; deep links load cold;
 * the sheet never shows a stale project; and a transition can always be interrupted.
 */

const { filters, tiles } = work(content);
const studies = caseStudies(content);
const WIDE = { width: 1440, height: 900 };

const tile = (page: Page, slug: string) => page.locator(`[data-work-tile="${slug}"]`);
const link = (page: Page, slug: string) => tile(page, slug).locator(".work-link");
const sheet = (page: Page) => page.locator("dialog.case-sheet[open]");
const ghost = (page: Page) => page.locator(".case-ghost");
const shown = (page: Page) =>
  page.locator(".work-tile").evaluateAll((all) => all.filter((element) => getComputedStyle(element).display !== "none").map((element) => (element as HTMLElement).dataset.workTile));

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The bento in view, its filter near the top of the screen. */
async function toWork(page: Page) {
  await page.locator(".work-filter").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 120));
  // The bento's behavior loads as the section approaches.
  await expect(page.locator("#work")).toHaveAttribute("data-work-ready", "");
}

/** Picks a filter the way a visitor would, by its label. */
async function pick(page: Page, label: string, isMobile: boolean) {
  const segment = page.locator(".work-filter label", { hasText: new RegExp(`^${label}$`) });
  if (isMobile) await segment.tap();
  else await segment.click();
}

/** The sheet is open on `slug` and done moving: no ghost, no clip, and its title has focus. */
async function opened(page: Page, slug: string) {
  await expect(sheet(page)).toHaveAttribute("data-case-sheet", slug);
  await expect(page).toHaveURL(new RegExp(`/work/${slug}$`));
  await expect(sheet(page).locator(".case-title")).toBeFocused();
  await expect(ghost(page)).toHaveCount(0);
  await expect.poll(() => sheet(page).locator(".case-panel").evaluate((element) => (element as HTMLElement).style.clipPath)).toBe("");
}

/** The sheet is gone and the page is itself again. */
async function closed(page: Page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(sheet(page)).toHaveCount(0);
  await expect(ghost(page)).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-case-open", "");
}

test.describe("the bento", () => {
  test("starts with the brief's spans and packs every filter with no holes", async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones stack the tiles");
    await page.setViewportSize(WIDE);
    await open(page);
    await toWork(page);
    for (const filter of filters) {
      await pick(page, filter.label, false);
      const expected = tiles.filter((entry) => entry.filters.includes(filter.id)).map((entry) => entry.slug);
      await expect.poll(() => shown(page)).toEqual(expected);
      await expect(page.locator("html")).not.toHaveAttribute("data-work-filtering", "");
      // The tiles fill the grid's rectangle exactly: no holes, no overlaps.
      const fill = await page.locator(".work-grid").evaluate((grid) => {
        const box = grid.getBoundingClientRect();
        const gap = Number.parseFloat(getComputedStyle(grid).columnGap);
        const visible = Array.from(grid.children).filter((element) => getComputedStyle(element).display !== "none");
        const area = visible.reduce((sum, element) => {
          const r = element.getBoundingClientRect();
          return sum + (r.width + gap) * (r.height + gap);
        }, 0);
        return area / ((box.width + gap) * (box.height + gap));
      });
      expect(fill, filter.id).toBeCloseTo(1, 2);
    }
    await pick(page, "All", false);
    await expect.poll(() => shown(page)).toHaveLength(tiles.length);
    await expect(page.locator("html")).not.toHaveAttribute("data-work-filtering", "");
    const box = async (slug: string) => (await tile(page, slug).boundingBox())!;
    // NEXUS leads (Part 20), ResearchX beside it.
    const [flagship, second, small] = [await box("nexus"), await box("researchx"), await box("wcag-analyzer")];
    // 8×2, 4×2 and 4×1 on twelve columns: the flagship twice a small tile's width and height.
    expect(flagship.width / small.width).toBeCloseTo(2, 0);
    expect(flagship.height / small.height).toBeCloseTo(2, 0);
    expect(second.width).toBeCloseTo(small.width, 0);
    expect(second.height).toBeCloseTo(flagship.height, 0);
  });

  test("filters by mouse, touch and keyboard, announces the count, and glides in a View Transition", async ({ page, isMobile }) => {
    await open(page);
    await toWork(page);
    await pick(page, "AI", isMobile);
    await expect.poll(() => shown(page)).toEqual(["nexus", "researchx", "resume-screening", "bbc-news-retrieval", "cognivault-ai"]);
    await expect(page.locator("[data-work-status]")).toHaveText("AI: 5 projects");
    // A second pick mid-flight lands where it was asked to.
    await pick(page, "ML", isMobile);
    await pick(page, "Accessibility", isMobile);
    await expect.poll(() => shown(page)).toEqual(["wcag-analyzer"]);
    await expect(page.locator("[data-work-status]")).toHaveText("Accessibility: 1 project");
    await expect(page.locator(".work-filter input:checked")).toHaveValue("accessibility");

    if (!isMobile) {
      await page.locator(".work-filter input:checked").focus();
      await page.keyboard.press("ArrowLeft");
      await expect(page.locator(".work-filter input:checked")).toHaveValue("ml");
      await expect.poll(() => shown(page)).toEqual(["resume-screening", "bbc-news-retrieval", "churn-prediction"]);
    }

    // The reflow is a View Transition with a name per tile, gone when it's done.
    const names = await page.evaluate(async () => {
      const seen: string[] = [];
      const observer = new MutationObserver(() => {
        if (document.documentElement.hasAttribute("data-work-filtering"))
          for (const element of document.querySelectorAll<HTMLElement>(".work-tile")) if (element.style.viewTransitionName) seen.push(element.style.viewTransitionName);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-work-filtering"] });
      document.querySelector<HTMLInputElement>('.work-filter input[value="all"]')!.click();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      observer.disconnect();
      return { seen: [...new Set(seen)], left: Array.from(document.querySelectorAll<HTMLElement>(".work-tile"), (element) => element.style.viewTransitionName).join("") };
    });
    if (await page.evaluate(() => typeof document.startViewTransition === "function")) expect(names.seen).toContain("work-cognivault-ai");
    expect(names.left).toBe("");
    await expect.poll(() => shown(page)).toHaveLength(tiles.length);
  });

  test("works without JavaScript: the radios filter with CSS, and a tile opens its page", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator(".work-filter label", { hasText: /^Full-stack$/ }).click();
    await expect.poll(() => shown(page)).toEqual(["quizmuj", "vistara", "cabinmuj", "myhub"]);
    await link(page, "quizmuj").click();
    await expect(page).toHaveURL(/\/work\/quizmuj$/);
    await expect(page.locator("h1.case-title")).toHaveText("QuizMUJ");
    await context.close();
  });

  test("each tile carries its category, name, tagline, top metric and preview, in content's words", async ({ page }) => {
    await open(page);
    for (const entry of tiles) {
      const card = tile(page, entry.slug);
      await expect(card.locator(".work-eyebrow")).toHaveText(entry.category);
      await expect(card.locator(".work-title")).toHaveText(entry.name);
      await expect(card.locator(".work-tagline")).toContainText(entry.tagline.text);
      // The first screenshot is the cover where content has one; the living preview, until then.
      await expect(card.locator(entry.screenshot ? "[data-work-cover] img" : "[data-work-cover] svg")).toHaveCount(1);
      await expect(card.locator(".work-metric")).toHaveCount(entry.metric ? 1 : 0);
      await expect(card.locator(".work-link")).toHaveAttribute("data-cursor", "open");
    }
    await expect(tile(page, "churn-prediction").locator(".work-metric-value")).toHaveText("97%");
    // Every figure in the section is one content states.
    const stated = new Set(
      [...content.projects.flatMap((project) => [project.tagline.text, project.summary.text, project.outcome?.text ?? ""]), ...content.footnotes.map((note) => note.note)].flatMap((text) =>
        numbersIn(text),
      ),
    );
    const text = await page.locator("#work").evaluate((element) => (element as HTMLElement).innerText + " " + Array.from(element.querySelectorAll("svg text"), (node) => node.textContent).join(" "));
    const notes = new Set(tiles.flatMap((entry) => [...entry.tagline.footnotes, ...(entry.metric?.footnotes ?? [])]).map(String));
    for (const figure of numbersIn(text)) expect(stated.has(figure) || notes.has(figure), figure).toBe(true);
  });

  test("a preview plays on hover, then rests on its final frame", async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones play each preview once, as it comes into view");
    await page.setViewportSize(WIDE);
    await open(page);
    await toWork(page);
    await tile(page, "churn-prediction").hover();
    await expect(tile(page, "churn-prediction")).toHaveAttribute("data-playing", "");
    await expect(tile(page, "churn-prediction")).not.toHaveAttribute("data-playing", "", { timeout: 8000 });
  });

  test("on a touch screen, each preview plays once as it comes into view", async ({ page, isMobile }) => {
    test.skip(!isMobile, "A touch screen");
    await open(page);
    await toWork(page);
    await tile(page, "cognivault-ai").scrollIntoViewIfNeeded();
    await expect(tile(page, "cognivault-ai")).toHaveAttribute("data-playing", "");
  });

  test("with reduced motion, previews rest and never play", async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await toWork(page);
    if (!isMobile) await tile(page, "quizmuj").hover();
    else await tile(page, "quizmuj").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(page.locator(".work-tile[data-playing]")).toHaveCount(0);
  });
});

test.describe("the case-study sheet", () => {
  test("opens by click into /work/[slug], and closes with × back to where the page was, focus on the tile", async ({ page, isMobile }) => {
    await open(page);
    await toWork(page);
    await link(page, "quizmuj").scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    if (isMobile) await link(page, "quizmuj").tap();
    else await link(page, "quizmuj").click();
    await opened(page, "quizmuj");
    await expect(sheet(page).locator(".case-title")).toHaveText("QuizMUJ");
    // The page behind stays where it was (to the pixel: WebKit can round a fractional
    // scroll), inert, scaled and dimmed.
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(1);
    await expect(page.locator(".content-layer")).toHaveCSS("transform", /matrix\(0\.94/);
    if (isMobile) await sheet(page).locator(".case-close").tap();
    else await sheet(page).locator(".case-close").click();
    await closed(page);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(1);
    await expect(link(page, "quizmuj")).toBeFocused();
    await expect(page.locator(".content-layer")).toHaveCSS("transform", "none");
  });

  test("opens from the keyboard and closes with Escape; the back button closes it too", async ({ page, isMobile }) => {
    test.skip(isMobile, "A keyboard");
    await open(page);
    await toWork(page);
    await link(page, "resume-screening").focus();
    await page.keyboard.press("Enter");
    await opened(page, "resume-screening");
    await page.keyboard.press("Escape");
    await closed(page);
    await expect(link(page, "resume-screening")).toBeFocused();

    await link(page, "wcag-analyzer").click();
    await opened(page, "wcag-analyzer");
    await page.goBack();
    await closed(page);
    // And forward opens it again.
    await page.goForward();
    await expect(sheet(page)).toHaveAttribute("data-case-sheet", "wcag-analyzer");
  });

  test("never shows a stale project", async ({ page, isMobile }) => {
    await open(page);
    await toWork(page);
    for (const slug of ["churn-prediction", "cognivault-ai", "churn-prediction"]) {
      if (isMobile) await link(page, slug).tap();
      else await link(page, slug).click();
      await expect(sheet(page)).toHaveAttribute("data-case-sheet", slug);
      await expect(sheet(page).locator(".case-title")).toHaveText(studies.find((study) => study.slug === slug)!.name);
      await page.goBack();
      await expect(page).toHaveURL(/\/$/);
      // The sheet flies home before the next click: Playwright scrolls a tile into view
      // before it clicks, and the page's scroll comes back as the fold ends, so a click made
      // mid-fold can land beside its tile. A visitor can't scroll then (the page is held).
      await expect(ghost(page)).toHaveCount(0);
    }
    await closed(page);
  });

  test("closing mid-expansion turns around, and the page is usable straight after", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escape");
    await open(page);
    await toWork(page);
    await link(page, "cognivault-ai").click();
    await expect(sheet(page)).toBeVisible();
    // Still growing out of its tile.
    await expect.poll(() => sheet(page).locator(".case-panel").evaluate((element) => (element as HTMLElement).style.clipPath)).toContain("inset(");
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/$/);
    await expect(ghost(page)).toHaveCount(1);
    await expect(sheet(page)).toHaveCount(0);
    await closed(page);
    await link(page, "quizmuj").click();
    await opened(page, "quizmuj");
  });

  test("the next project grows into its own case study, one step from the page", async ({ page, isMobile }) => {
    await open(page);
    await toWork(page);
    if (isMobile) await link(page, "wcag-analyzer").tap();
    else await link(page, "wcag-analyzer").click();
    await opened(page, "wcag-analyzer");
    const next = sheet(page).locator(".case-next");
    await expect(next).toContainText(studies.find((study) => study.slug === "wcag-analyzer")!.next.name);
    if (isMobile) await next.tap();
    else await next.click();
    await opened(page, studies.find((study) => study.slug === "wcag-analyzer")!.next.slug);
    await page.goBack();
    await closed(page);
  });

  test("its footnotes move within the sheet, so closing is still one step", async ({ page, isMobile }) => {
    await open(page);
    await toWork(page);
    if (isMobile) await link(page, "churn-prediction").tap();
    else await link(page, "churn-prediction").click();
    await opened(page, "churn-prediction");
    const mark = sheet(page).locator(".case-tagline a[role='doc-noteref']");
    if (isMobile) await mark.tap();
    else await mark.click();
    await expect(sheet(page).locator(".case-notes li").first()).toBeFocused();
    await expect(page).toHaveURL(/\/work\/churn-prediction$/);
    if (isMobile) await sheet(page).locator(".case-close").tap();
    else await sheet(page).locator(".case-close").click();
    await closed(page);
  });

  test("keeps the cursor above the sheet", async ({ page, isMobile }) => {
    test.skip(isMobile, "The custom cursor is for fine pointers");
    await page.setViewportSize(WIDE);
    await open(page);
    await toWork(page);
    await link(page, "quizmuj").click();
    await opened(page, "quizmuj");
    await page.mouse.move(600, 400);
    await page.mouse.move(640, 420);
    const layers = await page.evaluate(() => Array.from(document.querySelectorAll(":modal, :popover-open"), (element) => element.className.split(" ")[0]));
    expect(layers.at(-1)).toBe("cursor");
    expect(layers).toContain("case-sheet");
  });

  test("passes axe, open", async ({ page, isMobile }) => {
    await open(page);
    await toWork(page);
    if (isMobile) await link(page, "churn-prediction").tap();
    else await link(page, "churn-prediction").click();
    await opened(page, "churn-prediction");
    const { violations } = await new AxeBuilder({ page }).include("dialog.case-sheet[open]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations).toEqual([]);
  });
});

test.describe("a downward drag", () => {
  test("pulls the sheet away on a touch screen, or springs back if it's short", async ({ browser, browserName }) => {
    test.skip(browserName !== "chromium", "Touch is driven through Chromium's DevTools protocol");
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    const page = await context.newPage();
    await open(page);
    await toWork(page);
    await link(page, "quizmuj").tap();
    await opened(page, "quizmuj");
    const cdp = await context.newCDPSession(page);
    const drag = async (to: number) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 200 }] });
      for (let y = 210; y <= to; y += 15) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 200, y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    await drag(260);
    await expect.poll(() => sheet(page).locator(".case-panel").evaluate((element) => (element as HTMLElement).style.transform)).toBe("");
    await expect(page).toHaveURL(/\/work\/quizmuj$/);
    await drag(520);
    await closed(page);
    await context.close();
  });
});

test.describe("a case study's own page", () => {
  test("loads cold, with the hero, the chapters, the stack and the next project", async ({ page }) => {
    for (const study of studies) {
      await open(page, `/work/${study.slug}`);
      await expect(page.locator("h1.case-title")).toHaveText(study.name);
      await expect(page.locator("dialog.case-sheet")).toHaveCount(0);
      await expect(page).toHaveTitle(`${study.name} · ${content.profile.name}`);
      const chapters = await page.locator(".case-chapter-title").allTextContents();
      const words = content.copy.work.caseStudy.chapters;
      expect(chapters).toEqual([
        ...(study.problem ? [words.problem] : []),
        words.approach,
        ...(study.metrics.length > 0 || study.outcome ? [words.outcome] : []),
        ...(study.stack.length > 0 ? [words.built] : []),
      ]);
      // Gaps stay hidden: no year or role until content has them.
      const terms = await page.locator(".case-fact dt").allTextContents();
      expect(terms.includes(content.copy.work.caseStudy.facts.year)).toBe(study.year !== null);
      expect(terms.includes(content.copy.work.caseStudy.facts.role)).toBe(study.role !== null);
      await expect(page.locator(".case-next")).toHaveAttribute("href", study.next.href);
      await expect(page.locator(".case-diagram .case-node")).toHaveCount(study.diagram.down.nodes.length);
    }
  });

  test("shows its metrics as stated, with their footnote, and the diagram draws as it scrolls in", async ({ page }) => {
    await open(page, "/work/churn-prediction");
    const values = page.locator(".case-metric-value");
    await values.first().scrollIntoViewIfNeeded();
    await expect(values.locator(".counter-final")).toHaveText(["97%", "0.98"]);
    await expect(page.locator(".case-metric-group a[role='doc-noteref']")).toHaveText("5");
    const draw = () => page.locator(".case-diagram").evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--draw")));
    await page.evaluate(() => window.scrollTo(0, 0));
    if (await page.evaluate(() => CSS.supports("animation-timeline: view()"))) {
      await expect.poll(draw).toBeLessThan(0.5);
      await page.locator(".case-diagram").evaluate((element) => element.scrollIntoView({ block: "center" }));
      await expect.poll(draw).toBeGreaterThan(0.99);
    } else {
      expect(await draw()).toBe(1);
    }
  });

  test("an unknown project is a real 404", async ({ page }) => {
    const response = await page.goto("/work/not-a-project");
    expect(response?.status()).toBe(404);
  });

  test("passes axe", async ({ page }) => {
    await open(page, "/work/cognivault-ai");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations).toEqual([]);
  });
});
