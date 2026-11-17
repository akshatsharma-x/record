import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { content } from "@/content";

/**
 * The close and the footer (DESIGN.md §7.9, Part 12), against a production build whose
 * composer delivers through the console transport (playwright.config.ts): the live lines,
 * the dock by mouse and by keyboard, the composer end to end and when it can't send, the
 * rate limit, the footnotes' round trips, the settings and the small print.
 */

const WIDE = { width: 1440, height: 900 };
const words = content.copy.contact;
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
// 21:41 in India: 16:11 UTC on 17 November 2026.
const NOW = new Date("2026-11-17T16:11:00Z");

/** Each test its own made-up address, so the in-memory limit never mixes tests up. */
const ipFor = (seed: string) => `198.18.${(seed.length * 37) % 250}.${Math.floor(Math.random() * 250)}`;

async function isolate(context: BrowserContext, seed: string) {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": ipFor(seed) });
}

async function open(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/** The section in view, its behavior loaded. */
async function toContact(page: Page) {
  await page.locator("#contact").evaluate((element) => element.scrollIntoView());
  await expect(page.locator("#contact")).toHaveAttribute("data-contact-ready", "");
}

const unique = () => `ada.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

async function compose(page: Page, message: string, email = unique()) {
  await page.locator("#composer-name").fill("Ada Lovelace");
  await page.locator("#composer-email").fill(email);
  await page.locator("#composer-message").fill(message);
}

test.describe("the close", () => {
  test("resolves its headline and says what time it is for Akshat, and when a message will be read", async ({ browser }) => {
    const context = await browser.newContext({ viewport: WIDE, timezoneId: "America/New_York", locale: "en-US" });
    const page = await context.newPage();
    await page.clock.setFixedTime(NOW);
    await open(page);
    await expect(page.locator("#contact-title")).toHaveText(words.headline);
    // Content has no availability yet, so there's no line for it.
    await expect(page.locator(".contact-availability")).toHaveCount(0);
    const lines = page.locator(".contact-clock-line");
    await expect(lines.first()).toHaveText(/^It's 9:41\sPM IST$/);
    // New York's day doesn't meet India's working hours.
    await expect(lines.nth(1)).toHaveText(words.noOverlap);
    await context.close();
  });

  test("names the overlap on the visitor's own clock when there is one", async ({ browser }) => {
    const context = await browser.newContext({ viewport: WIDE, timezoneId: "Europe/Berlin", locale: "en-US" });
    const page = await context.newPage();
    await page.clock.setFixedTime(NOW);
    await open(page);
    // The range wraps as one: no-break spaces inside each end, word joiners at the dash.
    await expect(page.locator(".contact-clock-line").nth(1)).toHaveText(/^Our working hours overlap 9:00\u202fAM\u2060–\u20601:30\u202fPM your time$/);
    await context.close();
  });
});

test.describe("the dock", () => {
  test("holds Email, LinkedIn and GitHub, and no résumé until a phone-free PDF exists", async ({ page }) => {
    await open(page);
    const items = page.locator(".dock-item");
    await expect(items).toHaveCount(3);
    await expect(items.locator(".dock-label")).toHaveText([words.dock.email, words.dock.linkedin, words.dock.github]);
    await expect(items.nth(0)).toHaveAttribute("href", `mailto:${content.profile.email}`);
    await expect(items.nth(1)).toHaveAttribute("href", content.profile.links.linkedin);
    await expect(items.nth(2)).toHaveAttribute("href", content.profile.links.github);
    for (const i of [0, 1, 2]) await expect(items.nth(i)).toHaveAccessibleName([words.dock.email, words.dock.linkedin, words.dock.github][i]);
  });

  test("magnifies under the mouse, on a cosine falloff, and rests when it leaves", async ({ page, isMobile }) => {
    test.skip(isMobile, "A mouse");
    await page.setViewportSize(WIDE);
    await open(page);
    await toContact(page);
    const middle = page.locator(".dock-item").nth(1);
    const box = (await middle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    const scaleOf = (i: number) =>
      page
        .locator(".dock-item")
        .nth(i)
        .evaluate((element) => {
          const transform = getComputedStyle(element).transform;
          return transform === "none" ? 1 : new DOMMatrix(transform).a;
        });
    await expect.poll(() => scaleOf(1)).toBeGreaterThan(1.5);
    const sides = [await scaleOf(0), await scaleOf(2)];
    for (const side of sides) {
      expect(side).toBeGreaterThan(1);
      expect(side).toBeLessThan(await scaleOf(1));
    }
    await page.mouse.move(5, 5);
    await expect.poll(() => scaleOf(1)).toBe(1);
  });

  test("with reduced motion, never magnifies", async ({ page, isMobile }) => {
    test.skip(isMobile, "A mouse");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(WIDE);
    await open(page);
    await toContact(page);
    const middle = page.locator(".dock-item").nth(1);
    const box = (await middle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    await page.waitForTimeout(400);
    await expect(middle).toHaveCSS("transform", "none");
  });

  test("works fully by keyboard: each app's name shows as it's focused, Escape hides it, and Email copies the address", async ({ page, browserName, context, isMobile }) => {
    test.skip(isMobile, "A keyboard");
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page);
    await toContact(page);
    // Safari moves between buttons and links with Option-Tab.
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    // From the last thing before the close, Tab reaches the dock's first app.
    await page.locator(".medal-turn").last().focus();
    await page.keyboard.press(tab);
    const email = page.locator('.dock-item[data-app="email"]');
    await expect(email).toBeFocused();
    await expect(email.locator(".dock-label")).toHaveCSS("opacity", "1");
    await page.keyboard.press("Escape");
    await expect(email.locator(".dock-label")).toHaveCSS("opacity", "0");
    await page.keyboard.press(tab);
    await expect(page.locator('.dock-item[data-app="linkedin"]')).toBeFocused();
    await expect(page.locator('.dock-item[data-app="linkedin"] .dock-label')).toHaveCSS("opacity", "1");
    await page.keyboard.press(browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab");
    await expect(email).toBeFocused();
    await page.keyboard.press("Enter");
    // The Island says so (or that it couldn't, where a browser keeps the clipboard), and offers the mail app.
    const action = page.locator(".island-activity-action");
    await expect(action).toHaveText(new RegExp(`^${words.dock.openMail}`));
    await expect(action).toHaveAttribute("href", `mailto:${content.profile.email}`);
    await expect(page.locator(".island")).toContainText(browserName === "chromium" ? words.dock.copied : /email/i);
    if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(content.profile.email);
    // The launch: the dot under what it opened.
    await expect(email).toHaveAttribute("data-open", "");
  });
});

test.describe("the composer", () => {
  test("checks each field as the visitor leaves it, in friendly words, and all of them on send", async ({ page, context }) => {
    await isolate(context, "checks");
    await open(page);
    await toContact(page);
    await page.locator(".composer-send").click();
    await expect(page.locator("#composer-name-error")).toHaveText(words.thread.errors.nameRequired);
    await expect(page.locator("#composer-email-error")).toHaveText(words.thread.errors.emailRequired);
    await expect(page.locator("#composer-message-error")).toHaveText(words.thread.errors.messageRequired);
    await expect(page.locator("#composer-name")).toBeFocused();
    await expect(page.locator("#composer-name")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#composer-email").fill("ada@example");
    await page.locator("#composer-email").blur();
    await expect(page.locator("#composer-email-error")).toHaveText(words.thread.errors.emailInvalid);
    await page.locator("#composer-email").fill("ada@example.com");
    await expect(page.locator("#composer-email-error")).toBeHidden();
    await expect(page.locator("#composer-email")).not.toHaveAttribute("aria-invalid", "true");
    // The honeypot is out of reach.
    await expect(page.locator(".composer-trap")).toHaveAttribute("inert", "");
  });

  test("sends end to end: the words join the thread, Delivered, and the Island says Message sent", async ({ page, context }) => {
    await isolate(context, "sends");
    await open(page);
    await toContact(page);
    const message = "Interpretable models for logistics: want to compare notes?";
    await compose(page, message);
    const answer = page.waitForResponse((response) => response.url().endsWith("/api/contact"));
    await page.locator(".composer-send").click();
    expect((await answer).status()).toBe(202);
    const sent = page.locator('.thread-messages .bubble[data-from="you"]');
    await expect(sent).toHaveText(`${words.thread.you}: ${message}`);
    await expect(page.locator(".thread-messages .receipt")).toHaveText(words.thread.delivered);
    await expect(page.locator(".thread-messages .receipt")).toHaveCSS("opacity", "1");
    await expect(page.locator(".island")).toContainText(words.thread.sent);
    // The composer is ready for another.
    await expect(page.locator("#composer-message")).toHaveValue("");
  });

  test("when it can't send, keeps the words and offers the mail app with them written", async ({ page, context }) => {
    await isolate(context, "fails");
    await page.route("**/api/contact", (route) => route.fulfill({ status: 503, json: { status: 503, error: "unavailable" } }));
    await open(page);
    await toContact(page);
    const message = "Rates & dates?";
    await compose(page, message, "ada@example.com");
    await page.locator(".composer-send").click();
    await expect(page.locator(".composer-problem")).toHaveText(words.thread.errors.unavailable);
    await expect(page.locator("#composer-message")).toHaveValue(message);
    const fallback = page.locator(".composer-fallback");
    await expect(fallback).toHaveText(words.thread.fallback);
    const url = new URL((await fallback.getAttribute("href"))!);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(content.profile.email);
    expect(url.searchParams.get("subject")).toBe(words.thread.subject);
    expect(url.searchParams.get("body")).toBe(`${message}\n\n— Ada Lovelace <ada@example.com>`);
    await expect(page.locator('.thread-messages .bubble[data-from="you"]')).toHaveCount(0);
  });

  test("allows five messages an hour from one address, then says so and offers the mail app", async ({ page, context, request }) => {
    const ip = ipFor("limit");
    await context.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    // Five through the endpoint itself, each from a different sender.
    for (let i = 0; i < 5; i++) {
      const response = await request.post("/api/contact", {
        headers: { "x-forwarded-for": ip },
        data: { name: "Ada", email: unique(), message: `Message ${i}`, website: "" },
      });
      expect(response.status()).toBe(202);
    }
    await open(page);
    await toContact(page);
    await compose(page, "A sixth, within the hour");
    await page.locator(".composer-send").click();
    await expect(page.locator(".composer-problem")).toHaveText(words.thread.errors.rate);
    await expect(page.locator(".composer-fallback")).toBeVisible();
  });

  test("answers a filled honeypot quietly, and sends nothing", async ({ request }) => {
    const response = await request.post("/api/contact", {
      headers: { "x-forwarded-for": ipFor("trap") },
      data: { name: "Bot", email: "bot@example.com", message: "Buy now", website: "https://spam.example" },
    });
    expect(response.status()).toBe(202);
    expect(await response.json()).toEqual({ status: 202, id: null });
  });

  test("without JavaScript, offers the mail app instead of a form it couldn't send", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".composer")).toBeHidden();
    await expect(page.locator(".composer-nojs a")).toHaveText(words.thread.fallback);
    await expect(page.locator(".composer-nojs a")).toHaveAttribute("href", new RegExp(`^mailto:${content.profile.email}`));
    // The dock's links work as they are.
    await expect(page.locator('.dock-item[data-app="email"]')).toHaveAttribute("href", `mailto:${content.profile.email}`);
    await context.close();
  });
});

test.describe("the footer", () => {
  test("every footnote round-trips: each mark reaches its note, and each ↩ reaches its mark", async ({ page }) => {
    await open(page);
    const refs = await page.locator('a[role="doc-noteref"]').evaluateAll((links) => links.map((link) => ({ id: link.id, href: link.getAttribute("href") })));
    expect(refs.length).toBeGreaterThan(0);
    const backs = await page.locator('#footer a[role="doc-backlink"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    // One way back for every mark, and every mark has one.
    expect(backs.sort()).toEqual(refs.map((ref) => `#${ref.id}`).sort());
    for (const ref of refs) {
      expect(ref.href).toMatch(/^#fn-\d+$/);
      await expect(page.locator(ref.href!)).toHaveCount(1);
      await expect(page.locator(`#footer ${ref.href} a[href="#${ref.id}"]`)).toHaveCount(1);
    }
    // And a real round trip, by click.
    await page.locator(`a[href="${refs[0].href}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${refs[0].href}$`));
    await page.locator(`${refs[0].href} a[href="#${refs[0].id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#${refs[0].id}$`));
  });

  test("maps the site, and every page in it is there", async ({ page, request }) => {
    await open(page);
    const links = page.locator(".footer-link");
    await expect(links).toHaveText(["Overview", "Work", "Research", content.copy.footer.pages.specs, content.copy.footer.pages.colophon]);
    for (const href of ["/specs", "/colophon"]) expect((await request.get(href)).status()).toBe(200);
  });

  test("offers the theme, the finish and the cursor's settings, and keeps no cookies", async ({ page, context, isMobile }) => {
    await page.clock.setFixedTime(NOW);
    await open(page);
    const footer = page.locator("#footer");
    await footer.locator(".footer-theme label", { hasText: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await footer.locator(".footer-finish label", { hasText: "Saffron" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-finish", "saffron");
    if (!isMobile) {
      await footer.locator("label", { hasText: "Larger cursor" }).click();
      await expect(footer.getByRole("switch", { name: "Larger cursor" })).toBeChecked();
    }
    await expect(footer.getByRole("switch", { name: "Use system cursor" })).toBeVisible();
    await expect(footer).toContainText(content.copy.footer.cookies);
    await expect(footer).toContainText(content.copy.footer.credit);
    await expect(footer.locator(".footer-fine")).toContainText("© 2026 Akshat Sharma");
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => document.cookie)).toBe("");
  });
});

test.describe("accessibility", () => {
  test("the close and the footer have no axe violations, with errors showing too", async ({ page, context }) => {
    await isolate(context, "axe");
    await page.setViewportSize(WIDE);
    await open(page);
    await toContact(page);
    // Once the headline has resolved: mid-blur, its letters are faint on purpose.
    await page.waitForFunction(() => document.querySelector("#contact-title[data-resolved]") && !document.querySelector("#contact-title div"));
    let { violations } = await new AxeBuilder({ page }).include("#contact").include("#footer").withTags(TAGS).analyze();
    expect(violations).toEqual([]);
    await page.locator(".composer-send").click();
    await expect(page.locator("#composer-name-error")).toBeVisible();
    ({ violations } = await new AxeBuilder({ page }).include("#contact").withTags(TAGS).analyze());
    expect(violations).toEqual([]);
  });

  test("the colophon reads as a sheet, and has no axe violations", async ({ page }) => {
    await page.goto("/colophon");
    await expect(page.locator("#colophon-title")).toHaveText(content.copy.colophon.headline);
    await expect(page.locator(".specs-term")).toHaveText(content.copy.colophon.rows.map((row) => row.label));
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(violations).toEqual([]);
  });
});
