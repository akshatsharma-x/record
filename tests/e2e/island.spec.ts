import { expect, type Page, test } from "@playwright/test";

/** The Island (DESIGN.md §6.2), on the production build: WebKit, iPhone and Chromium. */

const NAV: [name: string, id: string][] = [
  ["Overview", "top"],
  ["Experience", "experience"],
  ["Research", "research"],
  ["Work", "work"],
  ["Skills", "skills"],
  ["Credentials", "credentials"],
  ["Contact", "contact"],
];

const nav = (page: Page) => page.getByRole("navigation", { name: "Primary" });
const toggle = (page: Page) => nav(page).locator(".island-toggle");
const link = (page: Page, name: string) => nav(page).getByRole("link", { name, exact: true });

/** The section's heading never sits under the pill. */
async function expectHeadingClear(page: Page, id: string) {
  const heading = page.locator(`#${id}`).locator("h1, h2").first();
  const shell = page.locator(".island-shell");
  await expect
    .poll(async () => {
      const [h, s] = await Promise.all([heading.boundingBox(), shell.boundingBox()]);
      return h && s ? h.y - (s.y + s.height) : -1;
    })
    .toBeGreaterThanOrEqual(0);
}

/** Waits for a smooth scroll to come to rest. */
async function settled(page: Page) {
  let last = -1;
  await expect
    .poll(async () => {
      const y = await page.evaluate(() => Math.round(window.scrollY));
      const still = y === last;
      last = y;
      return still;
    })
    .toBe(true);
}

/** The page has hydrated: the Island has measured itself. */
async function ready(page: Page) {
  await page.locator(".island-shell[data-measured]").waitFor();
}

async function openIsland(page: Page, isMobile: boolean) {
  await ready(page);
  if (isMobile) await toggle(page).tap();
  else await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
}

test("it's a primary nav with a disclosure button and real anchors", async ({ page }) => {
  await page.goto("/");
  await expect(nav(page)).toHaveCount(1);
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  const controls = await toggle(page).getAttribute("aria-controls");
  expect(controls).toBeTruthy();
  for (const [name, id] of NAV) {
    await expect(page.locator(`[id="${controls}"] a[href="/#${id}"]`, { hasText: name })).toHaveCount(1);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every section link works", async ({ page }) => {
    await page.goto("/");
    for (const [name, id] of NAV) {
      await link(page, name).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`).locator("h1, h2").first()).toBeInViewport();
      await page.evaluate(() => window.scrollTo(0, 0));
    }
  });
});

test("every section link works with JavaScript, and the pill never covers the heading", async ({ page, isMobile }) => {
  await page.goto("/");
  for (const [name, id] of NAV) {
    await openIsland(page, isMobile);
    if (isMobile) await link(page, name).tap();
    else await link(page, name).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await settled(page);
    await expectHeadingClear(page, id);
  }
});

test("it names the current section, marks it in the nav and shows the scroll progress", async ({ page }) => {
  await page.goto("/");
  await expect(toggle(page)).toContainText("Overview");
  await page.evaluate(() => document.getElementById("research")!.scrollIntoView());
  await expect(toggle(page)).toContainText("Research");
  await expect(page.locator('.island-link[aria-current="true"]')).toHaveText("Research");
  await expect(page.locator(".island-link[aria-current]")).toHaveCount(1);
  const progress = await page.locator(".island-ring").evaluate((ring) => Number(getComputedStyle(ring).getPropertyValue("--island-progress")));
  expect(progress).toBeGreaterThan(0.2);
  expect(progress).toBeLessThan(1);
});

test("the name swaps with a blur-crossfade and the width springs", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const width = () => page.locator(".island-shell").evaluate((shell) => shell.getBoundingClientRect().width);
  const before = await width();
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __swap: string[] }).__swap = seen;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLElement) seen.push(`${node.className}:${getComputedStyle(node).animationName}`);
        }
      }
    }).observe(document.querySelector(".island-name")!, { childList: true });
    document.getElementById("credentials")!.scrollIntoView();
  });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __swap: string[] }).__swap))
    .toEqual(expect.arrayContaining(["island-name-out:island-swap-out", "island-name-in:island-swap-in"]));
  await expect(toggle(page)).toContainText("Credentials");
  await expect(page.locator(".island-name-out")).toHaveCount(0);
  await expect.poll(width).toBeGreaterThan(before);
});

test("hover opens it after an intent delay; leaving closes it after a grace period", async ({ page, isMobile }) => {
  test.skip(isMobile, "Phones have no hover");
  await page.goto("/");
  await ready(page);
  await page.evaluate(() => {
    const record = (window as unknown as { __island: Record<string, number> }).__island = {} as Record<string, number>;
    const nav = document.querySelector("nav[aria-label=Primary]")!;
    nav.addEventListener("pointerenter", () => (record.enter = performance.now()));
    nav.addEventListener("pointerleave", () => (record.leave = performance.now()));
    new MutationObserver(() => {
      const open = nav.querySelector(".island-toggle")!.getAttribute("aria-expanded") === "true";
      record[open ? "opened" : "closed"] = performance.now();
    }).observe(nav, { attributes: true, subtree: true, attributeFilter: ["aria-expanded"] });
  });
  const box = (await page.locator(".island-shell").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 2 });
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(box.x + box.width / 2, 500, { steps: 2 });
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  const record = await page.evaluate(() => (window as unknown as { __island: Record<string, number> }).__island);
  expect(record.opened - record.enter).toBeGreaterThanOrEqual(115);
  expect(record.closed - record.leave).toBeGreaterThanOrEqual(295);
});

test("a click or tap opens it; Escape closes it and returns focus", async ({ page, isMobile }) => {
  await page.goto("/");
  await openIsland(page, isMobile);
  await expect(link(page, "Work")).toBeVisible();
  await link(page, "Work").focus();
  await page.keyboard.press("Escape");
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(toggle(page)).toBeFocused();
  await expect(link(page, "Work")).toBeHidden();
});

test("keyboard focus opens it, and Tab reaches every link", async ({ page, isMobile, browserName }) => {
  test.skip(isMobile, "Phones have no Tab key");
  // Safari moves between links and buttons with Option-Tab unless told otherwise.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.goto("/");
  await ready(page);
  await toggle(page).focus();
  await page.keyboard.press(browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab");
  await page.keyboard.press(tab);
  await expect(toggle(page)).toBeFocused();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  const reached: string[] = [];
  for (let i = 0; i < 11; i++) {
    await page.keyboard.press(tab);
    reached.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""));
  }
  for (const [name] of NAV) expect(reached).toContain(name);
  expect(reached).toContain("Say hello");
  // Past the last link, focus leaves and the Island closes.
  await page.keyboard.press(tab);
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
});

test("rapid activities queue, show for 2.2 seconds each and are announced", async ({ page, isMobile }) => {
  test.skip(isMobile, "The single-key shortcuts need a keyboard");
  await page.goto("/");
  await ready(page);
  await page.locator("main").click({ position: { x: 5, y: 300 } });
  await page.evaluate(() => {
    const log: [number, string][] = [];
    (window as unknown as { __said: [number, string][] }).__said = log;
    const status = document.querySelector("nav[aria-label=Primary] [role=status]")!;
    new MutationObserver(() => log.push([performance.now(), status.textContent ?? ""])).observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await page.keyboard.press("g");
  await page.keyboard.press("f");
  await page.keyboard.press("g");
  await expect(page.locator(".island")).toHaveAttribute("data-view", "activity");
  const said = () =>
    page.evaluate(() => (window as unknown as { __said: [number, string][] }).__said.map(([, text]) => text).filter(Boolean));
  await expect.poll(said, { timeout: 10_000 }).toEqual(["Grid on", "Focus mode on", "Grid off"]);
  await expect(page.locator(".island")).toHaveAttribute("data-view", "collapsed", { timeout: 5_000 });
  const times = await page.evaluate(() => (window as unknown as { __said: [number, string][] }).__said.map(([time]) => time));
  for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(2100);
});

test("on phones, a tap opens a full-width sheet with 44pt rows", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Phones only");
  await page.goto("/");
  await openIsland(page, true);
  const viewport = page.viewportSize()!;
  await expect.poll(async () => Math.round((await page.locator(".island-shell").boundingBox())!.width)).toBe(viewport.width - 32);
  for (const [name] of NAV) expect((await link(page, name).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await link(page, "Skills").tap();
  await expect(page).toHaveURL(/#skills$/);
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
});
