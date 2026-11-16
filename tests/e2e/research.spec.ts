import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { research } from "@/content/derive";
import { numbersIn } from "@/content/numbers";
import { plain } from "@/lib/cite";
import { HAZE, hazeDensity, levelAt } from "@/lib/research";

/**
 * Research (DESIGN.md §7.5, Part 8): the lights go down, two chapters of living
 * abstracts, and a page per paper. Honest throughout: no number on the page that content
 * doesn't state, and none at all in the illustrations.
 */

const PINNED = { width: 1440, height: 900 };
const papers = research(content);
const [food, pm25] = papers;
const tab = (browserName: string) => (browserName === "webkit" ? "Alt+Tab" : "Tab");
/** A computed length as a number: Chromium writes "calc(0.6px)" and "0%" where WebKit writes "0.6px" and "0px". */
const number = (value: string) => Number(/-?\d*\.?\d+/.exec(value)?.[0] ?? Number.NaN);

const chapter = (page: Page, i: number) => page.locator("#research .chapter").nth(i);
/** The open "Why?" panel: each stop has its own, and at most one is open. */
const why = (page: Page) => page.locator("#research .chain-why[data-open]");
const scene = (page: Page) => page.locator("#research .haze-scene").first();
const handle = (page: Page) => page.locator("#research .haze-handle").first();

/** Copies and shares are recorded instead of reaching the system. */
async function recordSystem(page: Page, { share }: { share: boolean }) {
  await page.addInitScript((withShare) => {
    const record = window as unknown as { __copied: string[]; __shared: ShareData[] };
    record.__copied = [];
    record.__shared = [];
    const clipboard = {
      writeText: async (text: string) => {
        record.__copied.push(text);
      },
      write: async (items: ClipboardItem[]) => {
        for (const item of items) record.__copied.push(await (await item.getType("text/plain")).text());
      },
    };
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
    Object.defineProperty(navigator, "share", {
      value: withShare
        ? async (data: ShareData) => {
            record.__shared.push(data);
          }
        : undefined,
      configurable: true,
    });
  }, share);
}

const copied = (page: Page) => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);

/** Where each chapter's pin starts and how far it runs. */
function pins(page: Page) {
  return page.locator("#research .chapter").evaluateAll((all) =>
    all.map((element) => {
      const stage = element.querySelector<HTMLElement>(".chapter-stage")!;
      return { top: element.getBoundingClientRect().top + window.scrollY, length: (element as HTMLElement).offsetHeight - stage.offsetHeight };
    }),
  );
}

async function scrubTo(page: Page, i: number, progress: number) {
  const { top, length } = (await pins(page))[i];
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(top + progress * length));
}

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** Research's behavior loads as the section (or a paper's page) comes near: bring it near. */
async function ready(page: Page) {
  const root = page.locator("[data-research-ready], #research, #paper").first();
  await root.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(page.locator("#research[data-research-ready], #paper[data-research-ready]").first()).toBeAttached();
}

test.describe("pinned, on a wide, tall screen", () => {
  test.use({ viewport: PINNED });
  test.skip(({ isMobile }) => isMobile, "Phones get the column");

  test("the lights go down, then Research. in the serif italic over where the papers were presented", async ({ page }) => {
    await open(page);
    await page.locator("#research .research-head").evaluate((element) => element.scrollIntoView({ block: "center" }));
    await expect(page.locator("html")).toHaveAttribute("data-surface-active", "dark");
    const title = page.locator("#research-title");
    await expect(title).toHaveText(content.copy.research.headline);
    await expect(title).toHaveCSS("font-style", "italic");
    expect(await title.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/serif/);
    await expect(page.locator("#research .research-head")).toContainText(content.copy.research.sub!);
    await expect(page.locator("#research .research-venue")).toHaveText(
      "Presented at SCI-2026 · Swinburne Vietnam, Hanoi · 28–29 April 2026 · Springer LNNS",
    );
  });

  test("gives each paper a chapter pinned for at most 200vh, with its status, TL;DR, keywords and actions", async ({ page }) => {
    await open(page);
    await expect(page.locator("#research .chapter")).toHaveCount(papers.length);
    for (const { length } of await pins(page)) {
      expect(length).toBeGreaterThan(0);
      expect(length).toBeLessThanOrEqual(2 * PINNED.height);
    }
    for (const [i, paper] of papers.entries()) {
      const element = chapter(page, i);
      await expect(element.locator(".chapter-title")).toHaveText(paper.title);
      await expect(element.locator(".chapter-title a")).toHaveAttribute("href", paper.href);
      await expect(element.locator(".status-pill")).toHaveText("Accepted · Presented April 2026");
      await expect(element.locator(".chapter-tldr")).toHaveText(paper.tldr);
      await expect(element.locator(".chapter-keywords li")).toHaveText(paper.keywords);
      // No DOI yet, so no Read.
      await expect(element.getByRole("link", { name: "Read" })).toHaveCount(0);
      await expect(element.getByRole("button", { name: "Cite" })).toBeVisible();
      await expect(element.getByRole("button", { name: "Share" })).toBeVisible();
      await expect(element.locator("figcaption")).toContainText(content.copy.research.caption);
    }
  });

  test("the cold chain's route draws itself as the visitor scrolls, each stop coming up as it's reached", async ({ page }) => {
    await open(page);
    const route = page.locator("#research .chain-route");
    const stops = page.locator("#research .chain-stop");
    const offset = async () => number(await route.evaluate((element) => getComputedStyle(element).strokeDashoffset));
    const shown = () => stops.evaluateAll((all) => all.map((element) => Number(getComputedStyle(element).opacity)));
    await scrubTo(page, 0, 0);
    await expect.poll(offset).toBeGreaterThan(0.95);
    expect((await shown()).slice(1).every((opacity) => opacity === 0)).toBe(true);
    await scrubTo(page, 0, 0.35);
    await expect.poll(offset).toBeLessThan(0.6);
    expect(await offset()).toBeGreaterThan(0.4);
    await scrubTo(page, 0, 0.9);
    await expect.poll(offset).toBe(0);
    expect((await shown()).every((opacity) => opacity === 1)).toBe(true);
  });

  test("hovering or focusing a stop opens Why?, and Escape closes it", async ({ page, browserName }) => {
    await open(page);
    await scrubTo(page, 0, 0.9);
    const [, , transport] = (food.illustration as { stops: string[] }).stops;
    const stop = page.locator("#research .chain-hit").nth(2);
    await stop.hover();
    await expect(why(page)).toHaveCount(1);
    await expect(why(page)).toContainText(`Why? ${transport}`);
    const factors = (food.illustration as { factors: string[] }).factors;
    await expect(why(page).locator(".chain-bar-row")).toHaveText(factors);
    // The pointer can move onto the panel without losing it (WCAG 1.4.13).
    await why(page).hover();
    await expect(why(page)).toHaveCount(1);
    await page.mouse.move(5, 5);
    await expect(why(page)).toHaveCount(0);
    // Its words are each stop's description, for screen readers.
    const description = await stop.evaluate((element) => document.getElementById(element.getAttribute("aria-describedby")!)!.textContent);
    expect(description).toMatch(/^Illustrative factors: Temperature excursions weigh most/);
    // The keyboard opens it too, and Escape closes it.
    await page.locator("#research .chain-hit").first().focus();
    await page.keyboard.press(tab(browserName));
    await expect(page.locator("#research .chain-hit").nth(1)).toBeFocused();
    await expect(why(page)).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(why(page)).toHaveCount(0);
  });

  test("the scroll carries the haze's forecast past now, and the handle thickens or clears it", async ({ page }) => {
    await open(page);
    const value = () => handle(page).evaluate((element) => Number((element as HTMLInputElement).value));
    const density = () => scene(page).evaluate((element) => Number((element as HTMLElement).style.getPropertyValue("--density")));
    const band = () => page.locator("#research .haze-band").evaluate((element) => (element as SVGGraphicsElement).getBBox().width).catch(() => 0);
    await scrubTo(page, 1, 0);
    await expect.poll(value).toBe(0);
    expect(await band()).toBe(0);
    await scrubTo(page, 1, 0.5);
    await expect.poll(value).toBeGreaterThan(200);
    const half = await band();
    expect(half).toBeGreaterThan(0);
    // Now the visitor takes the handle: Home is now, clear air; the episode ahead is thick.
    await handle(page).focus();
    await page.keyboard.press("Home");
    await expect(handle(page)).toHaveAttribute("aria-valuetext", "Now");
    await expect.poll(density).toBeLessThan(0.1);
    await page.keyboard.press("End");
    await expect(handle(page)).toHaveAttribute("aria-valuetext", "As far ahead as the forecast reaches");
    expect(await band()).toBeGreaterThan(half);
    const peak = Math.round(((0.82 - HAZE.now) / (HAZE.horizon - HAZE.now)) * 1000);
    await handle(page).evaluate((element, to) => {
      const input = element as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(to));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, peak);
    await expect.poll(density).toBeGreaterThan(0.9);
    expect(hazeDensity(levelAt(0.82))).toBeGreaterThan(0.9);
    // It stays the visitor's while they're in the chapter.
    await scrubTo(page, 1, 0.6);
    await page.waitForTimeout(200);
    expect(await value()).toBe(peak);
  });

  test("Cite flips the card to APA, IEEE and BibTeX, and copying says so in the Island", async ({ page }) => {
    await recordSystem(page, { share: true });
    await open(page);
    await scrubTo(page, 0, 0.9);
    const card = chapter(page, 0).locator(".paper-card");
    await card.getByRole("button", { name: "Cite" }).click();
    await expect(card).toHaveAttribute("data-flipped");
    await expect(card.locator('[data-face="back"]')).toHaveCSS("opacity", "1");
    await expect(card.getByRole("heading", { name: "Cite" })).toBeFocused();
    await expect(card.locator('[data-face="front"]')).toHaveAttribute("inert", "");
    const text = card.locator(".citation-text:visible");
    await expect(text).toHaveText(plain(food.citations.apa));
    await card.getByText("IEEE", { exact: true }).click();
    await expect(text).toHaveText(plain(food.citations.ieee));
    await card.getByText("BibTeX", { exact: true }).click();
    await expect(text).toHaveText(food.citations.bibtex);
    await card.getByRole("button", { name: "Copy" }).click();
    await expect.poll(() => copied(page)).toEqual([food.citations.bibtex]);
    await expect(page.locator('[role="status"]', { hasText: "Citation copied" })).toHaveCount(1);
    await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();
    // Escape flips it back, and focus returns to Cite.
    await page.keyboard.press("Escape");
    await expect(card).not.toHaveAttribute("data-flipped");
    await expect(card.getByRole("button", { name: "Cite" })).toBeFocused();
  });

  test("Share opens the share sheet where there is one", async ({ page }) => {
    await recordSystem(page, { share: true });
    await open(page);
    await scrubTo(page, 1, 0.9);
    await chapter(page, 1).getByRole("button", { name: "Share" }).click();
    const shared = await page.evaluate(() => (window as unknown as { __shared: ShareData[] }).__shared);
    expect(shared).toEqual([{ title: pm25.title, text: pm25.tldr, url: expect.stringMatching(new RegExp(`${pm25.href}$`)) }]);
  });

  test("Share copies the link where there's no share sheet", async ({ page }) => {
    await recordSystem(page, { share: false });
    await open(page);
    await scrubTo(page, 1, 0.9);
    await chapter(page, 1).getByRole("button", { name: "Share" }).click();
    await expect.poll(() => copied(page)).toEqual([expect.stringMatching(new RegExp(`${pm25.href}$`))]);
    await expect(page.locator('[role="status"]', { hasText: "Link copied" })).toHaveCount(1);
  });

  test("states no number content doesn't, and none at all in the illustrations", async ({ page }) => {
    await open(page);
    const stated = new Set(numbersIn([JSON.stringify(papers), ...content.footnotes.map((note) => note.note)].join(" ")));
    const text = await page.locator("#research").evaluate((element) => {
      const copy = element.cloneNode(true) as HTMLElement;
      // "Paper 1 of 2" counts the papers; it isn't a claim.
      for (const eyebrow of copy.querySelectorAll(".chapter-eyebrow")) eyebrow.remove();
      return copy.textContent ?? "";
    });
    for (const number of numbersIn(text)) expect(stated, number).toContain(number);
    for (const figure of await page.locator("#research .illustration").all()) {
      expect(await figure.evaluate((element) => [...element.querySelectorAll("svg, .chain-why")].map((part) => part.textContent).join(" "))).not.toMatch(/\d/);
    }
  });

  test("has no accessibility violations while pinned", async ({ page }) => {
    await open(page);
    await scrubTo(page, 0, 0.9);
    const { violations } = await new AxeBuilder({ page }).include("#research").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations).toEqual([]);
  });
});

test("the titles' serif comes in as the section approaches, not with the first paint", async ({ page }) => {
  await open(page);
  const research = page.locator("#research");
  const family = () => page.locator("#research .chapter-title").first().evaluate((element) => getComputedStyle(element).fontFamily);
  await expect(research).not.toHaveAttribute("data-fonts");
  expect(await family()).not.toMatch(/Newsreader/);
  await research.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 1.5));
  await expect(research).toHaveAttribute("data-fonts", "");
  expect(await family()).toMatch(/Newsreader/);
});

/** The column: no pins, every illustration on its final frame, with "Step through". */
async function expectColumn(page: Page) {
  for (const { length } of await pins(page)) expect(length).toBe(0);
  expect(number(await page.locator("#research .chain-route").evaluate((element) => getComputedStyle(element).strokeDashoffset))).toBe(0);
  await expect(handle(page)).toHaveValue("1000");
  await expect(page.locator("#research .illustration-steps button")).toHaveCount(2);
  await expect(page.locator("#research .illustration-steps button").first()).toBeVisible();
}

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "Phones only");

  test("is a column, and the illustrations step on a tap from their final frame", async ({ page }) => {
    await open(page);
    await expectColumn(page);
    const chain = page.locator("#research .illustration").first();
    await chain.scrollIntoViewIfNeeded();
    const step = chain.getByRole("button", { name: "Step through" });
    const stops = (food.illustration as { stops: string[] }).stops;
    for (const stop of stops) {
      await step.tap();
      await expect(why(page)).toContainText(`Why? ${stop}`);
    }
    await step.tap();
    await expect(why(page)).toHaveCount(0);
    // Tapping a stop opens it too, under the drawing.
    await page.locator("#research .chain-hit").nth(1).tap();
    await expect(why(page)).toContainText(`Why? ${stops[1]}`);
    const haze = page.locator("#research .illustration").nth(1);
    await haze.scrollIntoViewIfNeeded();
    await haze.getByRole("button", { name: "Step through" }).tap();
    await expect(handle(page)).toHaveAttribute("aria-valuetext", "Now");
    await haze.getByRole("button", { name: "Step through" }).tap();
    await expect(handle(page)).toHaveAttribute("aria-valuetext", "A little ahead");
  });
});

test.describe("with reduced motion", () => {
  test.use({ viewport: PINNED, reducedMotion: "reduce" });

  test("doesn't pin, and the haze is drawn as stills", async ({ page }) => {
    await open(page);
    await ready(page);
    await expectColumn(page);
    await expect(page.locator("#research .haze-canvas").first()).toHaveAttribute("data-still", "");
  });
});

test.describe("without JavaScript", () => {
  test.use({ viewport: PINNED, javaScriptEnabled: false });

  test("reads in full, and Cite goes to the paper's citations", async ({ page }) => {
    await page.goto("/");
    for (const paper of papers) await expect(page.locator("#research")).toContainText(paper.tldr);
    await expect(chapter(page, 0).getByRole("button", { name: "Share" })).toBeHidden();
    await expect(chapter(page, 0).getByRole("link", { name: "Cite" })).toHaveAttribute("href", `${food.href}#cite`);
    await page.goto(`${food.href}#cite`);
    const cite = page.locator("#cite");
    await expect(cite.locator(".citation-text:visible")).toHaveText(plain(food.citations.apa));
    await cite.getByText("BibTeX", { exact: true }).click();
    await expect(cite.locator(".citation-text:visible")).toHaveText(food.citations.bibtex);
  });
});

test.describe("a paper's page", () => {
  for (const paper of papers) {
    test(`${paper.slug}: everything about the paper, Akshat marked, with its citations and related work`, async ({ page }) => {
      await open(page, paper.href);
      await expect(page).toHaveTitle(`${paper.title} · ${content.profile.name}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(paper.title);
      await expect(page.locator('.paper-author[data-self]')).toHaveText(content.profile.name);
      await expect(page.locator("#paper .research-venue")).toHaveText(paper.venue);
      await expect(page.locator("#paper .status-pill")).toHaveText(paper.statusLabel);
      await expect(page.locator(".paper-tldr")).toHaveText(paper.tldr);
      await expect(page.getByRole("heading", { name: "Abstract" })).toHaveCount(0);
      await expect(page.locator("#paper .chapter-keywords li")).toHaveText(paper.keywords);
      await expect(page.locator("#paper figcaption")).toContainText(content.copy.research.caption);
      await expect(page.locator("#cite .citation-text:visible")).toHaveText(plain(paper.citations.apa));
      const related = page.locator(".related-card");
      await expect(related).toHaveCount(paper.related.length);
      for (const [i, project] of paper.related.entries()) {
        await expect(related.nth(i)).toContainText(project.name);
        await expect(related.nth(i)).toContainText(`In common: ${project.shares.join(", ")}`);
      }
      // Every number the page states has its footnote.
      for (const href of await page.locator("a[role=doc-noteref]").evaluateAll((all) => all.map((a) => a.getAttribute("href")))) {
        await expect(page.locator(href!)).toHaveCount(1);
      }
    });

    test(`${paper.slug}: Google Scholar's tags and ScholarlyArticle JSON-LD`, async ({ page }) => {
      await open(page, paper.href);
      const meta = (name: string) => page.locator(`meta[name="${name}"]`);
      await expect(meta("citation_title")).toHaveAttribute("content", paper.title);
      await expect(meta("citation_author")).toHaveAttribute("content", "Sharma, Akshat");
      await expect(meta("citation_conference_title")).toHaveAttribute("content", "SCI-2026");
      await expect(meta("citation_publication_date")).toHaveAttribute("content", "2026/04/28");
      await expect(meta("citation_doi")).toHaveCount(0);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", paper.tldr);
      const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
      expect(ld).toMatchObject({ "@context": "https://schema.org", "@type": "ScholarlyArticle", name: paper.title, author: [{ "@type": "Person", name: content.profile.name }] });
    });
  }

  test("has no accessibility violations", async ({ page }) => {
    await open(page, food.href);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations).toEqual([]);
  });

  test("an unknown paper is a 404", async ({ request }) => {
    expect((await request.get("/research/not-a-paper")).status()).toBe(404);
  });
});
