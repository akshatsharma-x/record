import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";

/** Search (DESIGN.md §6.3), on the production build: WebKit, iPhone and Chromium. */

const dialog = (page: Page) => page.getByRole("dialog", { name: "Search" });
const field = (page: Page) => page.getByRole("combobox", { name: "Search" });
const option = (page: Page, name: RegExp | string) => dialog(page).getByRole("option", { name });

/** The page has hydrated: the Island has measured itself. */
async function ready(page: Page) {
  await page.locator(".island-shell[data-measured]").waitFor();
}

async function openWithKeys(page: Page) {
  await ready(page);
  await page.keyboard.press("Meta+k");
  await expect(dialog(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
}

/** Types a query and waits for the index to answer it. */
async function search(page: Page, query: string) {
  await field(page).fill(query);
  await expect(dialog(page).getByRole("option").first()).toBeVisible();
}

const selected = (page: Page) => dialog(page).locator('[role=option][aria-selected="true"]');

test.describe("on a keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "Phones open Search from the Island");

  test("opens with ⌘K, Ctrl K and /, closes with Esc, and returns focus", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    // Something focused to come back to: the dock's Email (Part 12).
    const email = page.locator('#contact .dock-item[data-app="email"]');
    await email.focus();
    for (const keys of ["Meta+k", "Control+k", "/"]) {
      await page.keyboard.press(keys);
      await expect(dialog(page), keys).toBeVisible();
      await expect(field(page)).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toBeHidden();
      await expect(email).toBeFocused();
    }
    // ⌘K toggles, even from inside the field.
    await page.keyboard.press("Meta+k");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Meta+k");
    await expect(dialog(page)).toBeHidden();
  });

  test("finds by alias and despite typos, and does arithmetic", async ({ page }) => {
    await page.goto("/");
    await openWithKeys(page);
    await search(page, "rag");
    await expect(option(page, /^Cognivault AI/)).toBeVisible();
    await expect(option(page, /^United Airlines/)).toBeVisible();
    await search(page, "llm");
    await expect(option(page, /^Cartographer/)).toBeVisible();
    await search(page, "expereince");
    await expect(selected(page)).toHaveAccessibleName(/^Experience/);
    await search(page, "12*7");
    await expect(selected(page)).toHaveAccessibleName("= 84, 12 × 7");
    await expect(selected(page)).toContainText("= 84");
  });

  test("groups results: Top hit, then sections, work, research, skills and actions", async ({ page }) => {
    await page.goto("/");
    await openWithKeys(page);
    const groups = () => dialog(page).getByRole("group").evaluateAll((all) => all.map((group) => group.getAttribute("aria-labelledby") && document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent));
    // With nothing typed, Ask's suggested questions come first (Part 14).
    expect(await groups()).toEqual([content.copy.ask.label, "Sections", "Actions"]);
    await search(page, "rag");
    expect(await groups()).toEqual(["Top hit", "Work", "Skills"]);
  });

  test("works fully from the keyboard: ↑ ↓ Enter, and ⌘Enter for a new tab", async ({ page, context }) => {
    await page.goto("/");
    await openWithKeys(page);
    await search(page, "rag");
    const first = await field(page).getAttribute("aria-activedescendant");
    await expect(selected(page)).toHaveAttribute("id", first!);
    await page.keyboard.press("ArrowDown");
    const second = await field(page).getAttribute("aria-activedescendant");
    expect(second).not.toBe(first);
    await expect(selected(page)).toHaveAttribute("id", second!);
    await page.keyboard.press("ArrowUp");
    await expect(field(page)).toHaveAttribute("aria-activedescendant", first!);
    await page.keyboard.press("ArrowUp");
    // It wraps around to the last result.
    expect(await field(page).getAttribute("aria-activedescendant")).not.toBe(first);

    await search(page, "experience");
    const [tab] = await Promise.all([context.waitForEvent("page"), page.keyboard.press("Meta+Enter")]);
    await expect.poll(() => tab.url()).toMatch(/\/#experience$/);
    await tab.close();

    await openWithKeys(page);
    await search(page, "experience");
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/#experience$/);
    await expect(page.locator("#experience h2")).toBeFocused();
  });

  test("keeps focus inside while open: the page behind is inert", async ({ page }) => {
    await page.goto("/");
    await openWithKeys(page);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const outside = await page.evaluate(() => {
        const active = document.activeElement;
        return Boolean(active && active !== document.body && !document.querySelector("dialog.search")!.contains(active));
      });
      expect(outside).toBe(false);
    }
  });

  test("results resolve in 40ms apart, and the highlight slides to the selection", async ({ page }) => {
    await page.goto("/");
    await openWithKeys(page);
    await search(page, "rag");
    const delays = await dialog(page).getByRole("option").evaluateAll((all) => all.slice(0, 3).map((row) => getComputedStyle(row).animationDelay));
    expect(delays).toEqual(["0s", "0.04s", "0.08s"]);
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const marker = document.querySelector<HTMLElement>(".search-highlight")!;
          const row = document.querySelector<HTMLElement>('[role=option][aria-selected="true"]')!;
          const y = parseFloat(getComputedStyle(marker).translate.split(" ")[1] ?? "0");
          return Math.abs(y - row.offsetTop) < 1;
        }),
      )
      .toBe(true);
  });

  test("has no accessibility violations, and names its parts for screen readers", async ({ page }) => {
    await page.goto("/");
    await openWithKeys(page);
    await search(page, "rag");
    await page.waitForTimeout(600);
    const { violations } = await new AxeBuilder({ page })
      .include("dialog.search")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    await expect(field(page)).toHaveAttribute("aria-expanded", "true");
    await expect(field(page)).toHaveAttribute("aria-controls", /.+/);
    await expect(dialog(page).getByRole("listbox", { name: "Results" })).toBeVisible();
    await expect(dialog(page).getByRole("group", { name: "Top hit" })).toBeVisible();
    await expect(dialog(page).getByRole("status")).toHaveText(/\d+ results?/);
  });

  /** Runs one action from Search, by query and option name. */
  async function run(page: Page, query: string, title: RegExp) {
    await openWithKeys(page);
    await search(page, query);
    await option(page, title).first().click();
    await expect(dialog(page)).toBeHidden();
  }
  const activity = (page: Page) => page.locator(".island-activity-title");

  test("copies the email and confirms it in the Island", async ({ page, context, browserName }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await run(page, "copy email", /^Copy email/);
    await expect(activity(page)).toHaveText("Email copied");
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("status")).toContainText("Email copied");
    if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/@/);
  });

  test("toggles the theme and changes the finish", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const theme = await html.getAttribute("data-theme");
    await run(page, "toggle theme", /^Toggle theme/);
    await expect(html).not.toHaveAttribute("data-theme", theme!);
    await run(page, "change finish", /^Change finish/);
    await expect(html).toHaveAttribute("data-finish", "pink-city");
    await expect(activity(page)).toContainText("Finish: Pink City");
  });

  test("shows the grid and focus mode", async ({ page }) => {
    await page.goto("/");
    await run(page, "show grid", /^Show grid/);
    await expect(page.getByTestId("grid-overlay")).toBeVisible();
    await run(page, "focus mode", /^Focus mode/);
    await expect(page.locator("html")).toHaveAttribute("data-focus-mode", "");
    await expect(page.locator("[data-section][data-focused]")).toHaveCount(1);
  });

  test("sets the cursor and prints the résumé edition", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await page.goto("/");
    await run(page, "larger cursor", /^Larger cursor/);
    expect(await page.evaluate(() => localStorage.getItem("classyfolio:cursor-large"))).toBe("1");
    await run(page, "print", /^Print the résumé edition/);
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
  });

  test("opens GitHub and LinkedIn in a new tab", async ({ page, context }) => {
    await context.route(/linkedin\.com|github\.com/, (route) => route.fulfill({ status: 200, body: "elsewhere" }));
    await page.goto("/");
    for (const [query, title, host] of [
      ["github", /^Open GitHub/, /^https:\/\/github\.com\//],
      ["linkedin", /^Open LinkedIn/, /^https:\/\/www\.linkedin\.com\//],
    ] as const) {
      await openWithKeys(page);
      await search(page, query);
      const [tab] = await Promise.all([context.waitForEvent("page"), option(page, title).click()]);
      await expect.poll(() => tab.url()).toMatch(host);
      await tab.close();
    }
  });

  test("turns single-key shortcuts off, and that sticks (WCAG 2.1.4)", async ({ page }) => {
    await page.goto("/");
    await run(page, "single-key shortcuts", /^Single-key shortcuts/);
    await page.locator("main").click({ position: { x: 5, y: 300 } });
    await page.keyboard.press("/");
    await expect(dialog(page)).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem("classyfolio:single-key-shortcuts"))).toBe("off");
    await page.reload();
    await ready(page);
    await page.keyboard.press("g");
    await expect(page.getByTestId("grid-overlay")).toHaveCount(0);
    await page.keyboard.press("Meta+k");
    await expect(dialog(page)).toBeVisible();
  });

  test("stays open when reopened right after an action", async ({ page }) => {
    await page.goto("/");
    await openWithKeys(page);
    await search(page, "show grid");
    // Choose, then reopen at once: the first close's queued event mustn't close the second.
    await option(page, /^Show grid/).first().click();
    await page.keyboard.press("Meta+k");
    await expect(dialog(page)).toBeVisible();
    await page.waitForTimeout(600);
    await expect(dialog(page)).toBeVisible();
  });

  test("never steals a key while you're typing", async ({ page }) => {
    await page.goto("/");
    await openWithKeys(page);
    await field(page).pressSequentially("g/f");
    await expect(field(page)).toHaveValue("g/f");
    await expect(page.getByTestId("grid-overlay")).toHaveCount(0);
  });
});

test("opens from the Island on phones and desktops, and returns focus there", async ({ page, isMobile }) => {
  await page.goto("/");
  await ready(page);
  const toggle = page.locator(".island-toggle");
  if (isMobile) await toggle.tap();
  else await toggle.click();
  const button = page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Search" });
  if (isMobile) await button.tap();
  else await button.click();
  await expect(dialog(page)).toBeVisible();
  await search(page, "work");
  if (isMobile) await option(page, /^Work/).first().tap();
  else {
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(toggle).toBeFocused();
  }
});
