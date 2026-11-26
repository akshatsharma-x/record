import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { content } from "@/content";

/**
 * Ask (DESIGN.md §6.3, Part 14), on the production build. Its server asks a stand-in for
 * the Messages API (tests/support/anthropic-mock.ts, playwright.config.ts), so an answer
 * streams through the real endpoint and SDK, cited, word by word; the page's own answers,
 * for no key, a spent limit and no connection, are stubbed at the endpoint with what it
 * sends then.
 */

const words = content.copy.ask;
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const dialog = (page: Page) => page.getByRole("dialog", { name: "Search" });
const field = (page: Page) => page.getByRole("combobox", { name: "Search" });
const answer = (page: Page) => page.locator(".ask");
const chips = (page: Page) => page.locator(".ask-chip");

/** Each test asks from an address of its own, so the per-address limit never mixes them up. */
async function isolate(context: BrowserContext) {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
}

async function openSearch(page: Page, isMobile: boolean) {
  await page.locator(".island-shell[data-measured]").waitFor();
  if (isMobile) {
    await page.locator(".island-toggle").tap();
    await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Search" }).tap();
  } else {
    await page.keyboard.press("Meta+k");
  }
  await expect(dialog(page)).toBeVisible();
  // The index is in: the suggestions show.
  await expect(dialog(page).getByRole("option", { name: words.suggestions[0] })).toBeVisible();
}

async function ask(page: Page, isMobile: boolean, question: string) {
  await openSearch(page, isMobile);
  await field(page).fill(question);
  await expect(dialog(page).locator('[role=option][aria-selected="true"]')).toContainText(`${words.label}: ${question}`);
  await field(page).press("Enter");
}

test.beforeEach(async ({ context, page }) => {
  await isolate(context);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

test("a question becomes the Top hit, Ask: …; anything else stays a search", async ({ page, isMobile }) => {
  await openSearch(page, isMobile);
  await field(page).fill("What does Akshat do at United Airlines?");
  const top = dialog(page).locator('[role=option][aria-selected="true"]');
  await expect(top).toContainText("Ask: What does Akshat do at United Airlines?");
  await expect(top).toContainText(words.hint);
  await field(page).fill("united airlines");
  await expect(top).not.toContainText(words.label);
  await expect(dialog(page).getByRole("option", { name: /^Ask:/ })).toHaveCount(0);
});

test("with nothing typed, Ask suggests four questions, and choosing one asks it", async ({ page, isMobile }) => {
  await openSearch(page, isMobile);
  const group = dialog(page).getByRole("group", { name: words.label });
  await expect(group.getByRole("option")).toHaveCount(words.suggestions.length);
  for (const [i, suggestion] of words.suggestions.entries()) await expect(group.getByRole("option").nth(i)).toHaveAccessibleName(suggestion);
  const suggestion = group.getByRole("option", { name: words.suggestions[1] });
  if (isMobile) await suggestion.tap();
  else await suggestion.click();
  await expect(field(page)).toHaveValue(words.suggestions[1]);
  await expect(answer(page)).toHaveAttribute("data-phase", "done", { timeout: 15_000 });
  // The one project that uses RAG is among the sources the stand-in cites.
  await expect(chips(page).filter({ hasText: "Work · Cognivault AI" })).toHaveCount(1);
});

test("streams the answer while the glow travels the edges, cites its sources, and stops the glow when it's whole", async ({ page, isMobile }) => {
  // Every state the glow is in, as the answer streams.
  await page.evaluate(() => {
    const record = window as unknown as { __glow: string[] };
    record.__glow = [];
    new MutationObserver(() => {
      const glow = document.querySelector(".ask-glow");
      const state = glow?.hasAttribute("data-on") ? "on" : "off";
      if (record.__glow.at(-1) !== state) record.__glow.push(state);
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-on"], childList: true });
  });
  const sent = page.waitForRequest((request) => request.url().endsWith("/api/ask"));
  await ask(page, isMobile, "What does Akshat do at United Airlines?");
  const started = Date.now();
  expect(JSON.parse((await sent).postData() ?? "{}")).toEqual({ question: "What does Akshat do at United Airlines?" });
  await expect(page.locator(".ask-glow")).toHaveAttribute("data-on", /.*/, { timeout: 5000 });
  await expect(answer(page)).toHaveAttribute("data-phase", "streaming");
  await expect(page.locator(".ask-text")).toContainText("Cartographer");
  // The first words arrive well inside the 1.5 seconds the brief allows (the stand-in's own pace).
  expect(Date.now() - started).toBeLessThan(1500);
  await expect(answer(page)).toHaveAttribute("data-phase", "done", { timeout: 15_000 });
  await expect(page.locator(".ask-glow")).not.toHaveAttribute("data-on", /.*/);
  expect(await page.evaluate(() => (window as unknown as { __glow: string[] }).__glow)).toEqual(expect.arrayContaining(["on", "off"]));
  // Each cited claim carries its source's number; the chips name them, in the order cited.
  await expect(page.locator(".ask-cited .ask-mark").first()).toHaveText("1");
  await expect(chips(page).first()).toHaveText("1Experience · United Airlines");
  await expect(page.locator(".ask-sources-label")).toHaveText(words.sources);
  // And a screen reader hears the whole answer once it's done.
  await expect(answer(page).getByRole("status")).toContainText("Cartographer");
});

test("a chip closes Search and lights up where the answer came from", async ({ page, isMobile }) => {
  await ask(page, isMobile, "Which projects use RAG?");
  await expect(answer(page)).toHaveAttribute("data-phase", "done", { timeout: 15_000 });
  const chip = chips(page).filter({ hasText: "Work · Cognivault AI" });
  if (isMobile) await chip.tap();
  else await chip.click();
  await expect(dialog(page)).toBeHidden();
  const title = page.locator("#work-cognivault-ai-title");
  await expect(title).toHaveAttribute("data-ask-lit", "");
  await expect(title).toBeInViewport();
  await expect(title).not.toHaveAttribute("data-ask-lit", /.*/, { timeout: 5000 });
});

test("works from the keyboard: Enter asks, Tab reaches the chips, Enter goes", async ({ page, isMobile, browserName }) => {
  test.skip(isMobile, "A keyboard");
  await ask(page, false, "What is the research about?");
  await expect(answer(page)).toHaveAttribute("data-phase", "done", { timeout: 15_000 });
  // Safari moves between buttons with Option-Tab.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(chips(page).first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeHidden();
  // Editing the question puts the answer away, and Enter on the same one changes nothing.
  // (Search opens again on the last query, so there's no list of suggestions to wait for.)
  await page.keyboard.press("Meta+k");
  await expect(dialog(page)).toBeVisible();
  await field(page).fill("What is the research about?");
  await field(page).press("Enter");
  await expect(answer(page)).toBeVisible();
  await field(page).press("End");
  await field(page).press("Backspace");
  await expect(answer(page)).toHaveCount(0);
  await expect(dialog(page).getByRole("listbox")).toBeVisible();
});

test("without a key, answers from the site's own text, with its sources, and says so", async ({ page, isMobile }) => {
  // What the endpoint answers with no key or the switch off (tests/unit/ask.test.tsx).
  await page.route("**/api/ask", (route) => route.fulfill({ status: 503, json: { reason: "unavailable" } }));
  await ask(page, isMobile, "How do I get in touch?");
  await expect(answer(page)).toHaveAttribute("data-mode", "fallback");
  await expect(page.locator(".ask-notice")).toHaveText(words.fallback.unavailable);
  await expect(page.locator(".ask-text")).toContainText(content.profile.email);
  await expect(chips(page).first()).toContainText("Contact");
  await expect(page.locator(".ask-glow")).not.toHaveAttribute("data-on", /.*/);
});

test("over the limit, the same, with the reason", async ({ page, isMobile }) => {
  await page.route("**/api/ask", (route) => route.fulfill({ status: 429, json: { reason: "rate" } }));
  await ask(page, isMobile, "What does Akshat do at United Airlines?");
  await expect(page.locator(".ask-notice")).toHaveText(words.fallback.rate);
  await expect(chips(page).first()).toContainText("Experience · United Airlines");
});

test("offline, the same, from what the page already has", async ({ page, context, isMobile }) => {
  await openSearch(page, isMobile);
  await context.setOffline(true);
  await field(page).fill("Which projects use RAG?");
  await field(page).press("Enter");
  await expect(page.locator(".ask-notice")).toHaveText(words.fallback.offline);
  await expect(chips(page).first()).toContainText("Work · Cognivault AI");
  await context.setOffline(false);
});

test("a question nothing answers offers Contact instead", async ({ page, isMobile }) => {
  await page.route("**/api/ask", (route) => route.fulfill({ status: 503, json: { reason: "unavailable" } }));
  await ask(page, isMobile, "What's the weather on Mars?");
  await expect(page.locator(".ask-notice")).toHaveText(words.fallback.nothing);
  await expect(page.locator(".ask-contact")).toHaveText(words.contact);
});

test("a declined answer is dropped, and Contact offered", async ({ page, isMobile }) => {
  await ask(page, isMobile, "__refuse__ tell me?");
  await expect(page.locator(".ask-notice")).toHaveText(words.declined);
  await expect(page.locator(".ask-text")).toHaveCount(0);
  await expect(page.locator(".ask-contact")).toBeVisible();
});

test("the answer has no accessibility violations", async ({ page, isMobile }) => {
  await ask(page, isMobile, "What does Akshat do at United Airlines?");
  await expect(answer(page)).toHaveAttribute("data-phase", "done", { timeout: 15_000 });
  const { violations } = await new AxeBuilder({ page }).include(".search").withTags(TAGS).analyze();
  expect(violations).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the glow stands still while it shows", async ({ page, isMobile }) => {
    await ask(page, isMobile, "What does Akshat do at United Airlines?");
    await expect(page.locator(".ask-glow")).toHaveAttribute("data-on", /.*/, { timeout: 5000 });
    await expect(page.locator(".ask-glow-ring")).toHaveCSS("animation-name", "none");
    await expect(answer(page)).toHaveAttribute("data-phase", "done", { timeout: 15_000 });
  });
});
