import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";
import { visibility } from "./visibility";

/**
 * The cursor (DESIGN.md §6.1), on the kitchen's playground (dev server; see
 * playwright.config.ts). Runs in WebKit and Chromium.
 */

const KITCHEN = "/dev/kitchen?tier=HIGH";

declare global {
  interface Window {
    __pointer?: [number, number];
  }
}

async function open(page: Page, url = KITCHEN) {
  await page.goto(url);
  await page.locator("[data-cursor-root]").waitFor({ state: "attached" });
}

const root = (page: Page) => page.locator("[data-cursor-root]");
const html = (page: Page) => page.locator("html");

/** Waits for the next animation frame, then one more, so styles have applied. */
async function frames(page: Page, count = 2) {
  for (let i = 0; i < count; i++) await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}

/** Moves the pointer to whole pixels inside an element, `at` as fractions of its box. */
async function hover(page: Page, target: Locator, at: [number, number] = [0.5, 0.5]) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const x = Math.round(box.x + box.width * at[0]);
  const y = Math.round(box.y + box.height * at[1]);
  await page.mouse.move(x, y, { steps: 2 });
  return { x, y, box };
}

async function settle(page: Page) {
  await page.waitForTimeout(700);
}

function rect(page: Page, selector: string) {
  return page.evaluate((s) => {
    const r = document.querySelector(s)!.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  }, selector);
}

// ─── Zero lag ────────────────────────────────────────────────────────────────

test("the hotspot is within half a pixel of the pointer one frame after it moves", async ({ page }) => {
  await open(page);
  await page.evaluate(() =>
    window.addEventListener("pointermove", (event) => (window.__pointer = [event.clientX, event.clientY]), true),
  );
  const area = page.getByTestId("cursor-accuracy");
  await area.scrollIntoViewIfNeeded();
  const box = (await area.boundingBox())!;
  let seed = 20260611;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 20; i++) {
    const x = Math.round(box.x + 10 + random() * (box.width - 20));
    const y = Math.round(box.y + 10 + random() * (box.height - 20));
    await page.mouse.move(x, y);
    const [dot, pointer] = await page.evaluate(
      () =>
        new Promise<[number[], number[]]>((resolve) =>
          requestAnimationFrame(() => {
            const r = document.querySelector(".cursor-dot")!.getBoundingClientRect();
            resolve([[r.x + r.width / 2, r.y + r.height / 2], window.__pointer ?? [NaN, NaN]]);
          }),
        ),
    );
    expect(Math.abs(dot[0] - x), `x at point ${i}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(dot[1] - y), `y at point ${i}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(dot[0] - pointer[0])).toBeLessThanOrEqual(0.5);
    expect(Math.abs(dot[1] - pointer[1])).toBeLessThanOrEqual(0.5);
  }
});

test("the native cursor stays until the first move, then hides in the frame the dot appears", async ({ page }) => {
  await open(page);
  await expect(html(page)).not.toHaveClass(/cursor-custom/);
  await expect(root(page)).toHaveAttribute("data-hidden", "");
  await page.mouse.move(200, 200);
  await expect(html(page)).toHaveClass(/cursor-custom/);
  await expect(root(page)).not.toHaveAttribute("data-hidden");
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).toBe("none");
});

// ─── Visibility ──────────────────────────────────────────────────────────────

const TILES = [
  "white",
  "black",
  "gray",
  ...["contrail", "pink-city", "saffron", "monsoon"].flatMap((finish) => [`${finish}-light`, `${finish}-dark`]),
];

test("the dot shows on every background", async ({ page }) => {
  await open(page);
  // The shared stage's canvas: the noise plane renders into it.
  await page.locator("canvas").first().waitFor({ state: "attached" });
  await page.waitForTimeout(500);
  const spots: [string, Locator, [number, number]][] = [
    ...TILES.map((id): [string, Locator, [number, number]] => [id, page.getByTestId(`visibility-${id}`), [0.5, 0.5]]),
    ["photo, sky", page.getByTestId("visibility-photo"), [0.2, 0.25]],
    ["photo, sun", page.getByTestId("visibility-photo"), [0.7, 0.55]],
    ["photo, hills", page.getByTestId("visibility-photo"), [0.5, 0.78]],
    ["WebGL", page.getByRole("img", { name: "A plane of WebGL noise" }), [0.5, 0.5]],
    ["the Island", page.getByTestId("visibility-island"), [0.3, 0.5]],
  ];
  const results: Record<string, number> = {};
  for (const [name, locator, at] of spots) {
    const { x, y } = await hover(page, locator, at);
    await page.waitForTimeout(250);
    results[name] = await visibility(page, x, y);
  }
  test.info().annotations.push({ type: "visibility", description: JSON.stringify(results) });
  for (const [name, share] of Object.entries(results)) expect(share, name).toBeGreaterThanOrEqual(0.2);
});

// ─── States ──────────────────────────────────────────────────────────────────

test("each state follows what's under the pointer", async ({ page }) => {
  await open(page);
  const panel = page.getByTestId("playground-light");

  // Magnetic: the target's rounded rect plus 8px, and a 6px dot.
  const primary = panel.getByRole("button", { name: "Primary" });
  const { box } = await hover(page, primary);
  await settle(page);
  await expect(root(page)).toHaveAttribute("data-state", "magnetic");
  const shape = await rect(page, ".cursor-shape");
  expect(shape.width).toBeCloseTo(box.width + 16, 0);
  expect(shape.height).toBeCloseTo(box.height + 16, 0);
  expect((await rect(page, ".cursor-dot")).width).toBeCloseTo(6, 0);

  // It drifts up to 4px toward the pointer, and its label up to 2px.
  await page.mouse.move(Math.round(box.x + box.width - 2), Math.round(box.y + box.height / 2), { steps: 2 });
  await settle(page);
  const drift = await primary.evaluate((button) => {
    const own = getComputedStyle(button).translate.split(" ").map(parseFloat);
    const label = getComputedStyle(button.querySelector("span")!).translate.split(" ").map(parseFloat);
    return { target: own[0], label: own[0] + label[0] };
  });
  expect(drift.target).toBeGreaterThan(3);
  expect(drift.target).toBeLessThanOrEqual(4);
  expect(drift.label).toBeGreaterThan(1);
  expect(drift.label).toBeLessThanOrEqual(2);

  // Text: a 2px I-beam as tall as the line.
  const heading = panel.getByRole("heading", { name: "Light" });
  const headingBox = (await heading.boundingBox())!;
  await page.mouse.move(Math.round(headingBox.x + 10), Math.round(headingBox.y + headingBox.height / 2), { steps: 2 });
  await settle(page);
  await expect(root(page)).toHaveAttribute("data-state", "text");
  const lineHeight = await heading.evaluate((element) => parseFloat(getComputedStyle(element).lineHeight));
  const beam = await rect(page, ".cursor-dot");
  expect(beam.width).toBeCloseTo(2, 0);
  expect(beam.height).toBeCloseTo(lineHeight, 0);

  // Media and cards: a 72px glass circle with the label and the 6px dot at its center.
  const media = await hover(page, panel.locator("[data-cursor=open]"));
  await settle(page);
  await expect(root(page)).toHaveAttribute("data-state", "media");
  await expect(page.locator(".cursor-label")).toHaveText("Open");
  const circle = await rect(page, ".cursor-shape");
  expect(circle.width).toBeCloseTo(72, 0);
  expect(circle.cx).toBeCloseTo(media.x, 0);
  expect(circle.cy).toBeCloseTo(media.y, 0);

  // Drag areas: a 64px circle with ‹ ›.
  await hover(page, panel.locator("[data-cursor=drag]"));
  await settle(page);
  await expect(root(page)).toHaveAttribute("data-state", "drag");
  expect((await rect(page, ".cursor-shape")).width).toBeCloseTo(64, 0);
  await expect(page.locator(".cursor-arrows svg")).toHaveCount(2);

  // Disabled: a slashed ring and the 14px dot.
  await hover(page, panel.getByRole("button", { name: "Disabled" }));
  await settle(page);
  await expect(root(page)).toHaveAttribute("data-state", "disabled");
  await expect(page.locator(".cursor-shape")).toHaveAttribute("data-variant", "ring");
  expect((await rect(page, ".cursor-dot")).width).toBeCloseTo(14, 0);

  // Pressed: the dot shrinks to .8 and springs back.
  const area = page.getByTestId("cursor-accuracy");
  await hover(page, area);
  await page.mouse.down();
  await expect(root(page)).toHaveAttribute("data-pressed", "");
  await settle(page);
  expect((await rect(page, ".cursor-dot")).width).toBeCloseTo(14 * 0.8, 0);
  await page.mouse.up();
  await expect(root(page)).not.toHaveAttribute("data-pressed");
});

test("the navigating ring spins while a route or overlay loads", async ({ page }) => {
  await open(page);
  await page.getByText("Show the navigating ring").click();
  await expect(root(page)).toHaveAttribute("data-busy", "");
  await expect(page.locator(".cursor-shape")).toHaveAttribute("data-variant", "spinner");
  await page.getByText("Show the navigating ring").click();
  await expect(root(page)).not.toHaveAttribute("data-busy");

  // A slow route change shows it until the new page arrives.
  await page.route("**/dev/content**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.getByRole("link", { name: "Go to another page" }).click();
  await expect(root(page)).toHaveAttribute("data-busy", "");
  await page.waitForURL("**/dev/content");
  await expect(root(page)).not.toHaveAttribute("data-busy");
});

test("native zones keep the system cursor", async ({ page }) => {
  await open(page);
  for (const id of ["native-input", "native-select", "native-iframe"]) {
    const zone = page.getByTestId(id);
    await hover(page, zone);
    await frames(page);
    await expect(root(page), id).toHaveAttribute("data-state", "native");
    expect(await root(page).evaluate((element) => getComputedStyle(element).opacity), id).toBe("0");
    expect(await zone.evaluate((element) => getComputedStyle(element).cursor), id).not.toBe("none");
  }
  // The video's own controls too.
  await hover(page, page.getByLabel("A video with native controls"));
  await frames(page);
  await expect(root(page)).toHaveAttribute("data-state", "native");
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).toBe("none");
});

// ─── Locatability ────────────────────────────────────────────────────────────

test("shaking the pointer grows the dot to 3× for a moment", async ({ page }) => {
  await open(page);
  const { x, y } = await hover(page, page.getByTestId("cursor-accuracy"));
  for (let i = 0; i < 6; i++) await page.mouse.move(x + (i % 2 === 0 ? 90 : -90), y, { steps: 3 });
  await expect(root(page)).toHaveAttribute("data-shaking", "");
  await page.waitForTimeout(250);
  expect((await rect(page, ".cursor-dot")).width).toBeCloseTo(42, 0);
  await expect(root(page)).not.toHaveAttribute("data-shaking", "", { timeout: 1500 });
});

test("a slow sweep is not a shake", async ({ page }) => {
  await open(page);
  const { x, y } = await hover(page, page.getByTestId("cursor-accuracy"));
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(x + (i % 2 === 0 ? 20 : -20), y, { steps: 2 });
    await page.waitForTimeout(150);
  }
  await expect(root(page)).not.toHaveAttribute("data-shaking");
});

test("resting the pointer pulses one ring, once per rest", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const element = document.querySelector("[data-cursor-root]")!;
    element.setAttribute("data-pulses", "0");
    new MutationObserver(() => {
      if (element.hasAttribute("data-idle") && element.getAttribute("data-pulsing") !== "1") {
        element.setAttribute("data-pulses", String(Number(element.getAttribute("data-pulses")) + 1));
        element.setAttribute("data-pulsing", "1");
      }
      if (!element.hasAttribute("data-idle")) element.setAttribute("data-pulsing", "0");
    }).observe(element, { attributes: true, attributeFilter: ["data-idle"] });
  });
  await hover(page, page.getByTestId("cursor-accuracy"));
  await page.waitForTimeout(2500);
  await expect(root(page)).toHaveAttribute("data-pulses", "0");
  await expect(root(page)).toHaveAttribute("data-pulses", "1", { timeout: 1500 });
  await page.waitForTimeout(3500);
  await expect(root(page)).toHaveAttribute("data-pulses", "1");
  await hover(page, page.getByTestId("cursor-accuracy"), [0.4, 0.4]);
  await expect(root(page)).toHaveAttribute("data-pulses", "2", { timeout: 4500 });
});

test("leaving fades the cursor out; coming back shows it at once where the pointer enters", async ({ page }) => {
  await open(page);
  await hover(page, page.getByTestId("cursor-accuracy"));
  await page.mouse.move(-10, 300);
  await expect(root(page)).toHaveAttribute("data-hidden", "");
  expect(await root(page).evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0.15s");

  await page.mouse.move(640, 5);
  const state = await page.evaluate(
    () =>
      new Promise<{ opacity: string; x: number; y: number }>((resolve) =>
        requestAnimationFrame(() => {
          const element = document.querySelector("[data-cursor-root]")!;
          const r = element.querySelector(".cursor-dot")!.getBoundingClientRect();
          resolve({ opacity: getComputedStyle(element).opacity, x: r.x + r.width / 2, y: r.y + r.height / 2 });
        }),
      ),
  );
  expect(state.opacity).toBe("1");
  expect(state.x).toBeCloseTo(640, 0);
  expect(state.y).toBeCloseTo(5, 0);
});

// ─── Always on top ───────────────────────────────────────────────────────────

test("the dot stays visible above a modal dialog, a popover and a tooltip", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Open a sheet" }).click();
  const sheet = page.getByRole("dialog", { name: "A sheet" });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(1000);
  const box = (await sheet.boundingBox())!;
  for (const [x, y] of [
    [Math.round(box.x + box.width / 2), Math.round(box.y + 16)],
    [40, 40],
  ]) {
    await page.mouse.move(x, y, { steps: 2 });
    await page.waitForTimeout(250);
    expect(await visibility(page, x, y), `over the sheet at ${x},${y}`).toBeGreaterThanOrEqual(0.2);
  }
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  await page.getByRole("button", { name: "Open a popover" }).click();
  const popover = page.getByTestId("cursor-popover");
  await expect(popover).toBeVisible();
  const spot = await hover(page, popover, [0.5, 0.08]);
  await page.waitForTimeout(250);
  expect(await visibility(page, spot.x, spot.y), "over the popover").toBeGreaterThanOrEqual(0.2);
  await page.keyboard.press("Escape");

  await hover(page, page.getByRole("button", { name: "Search", exact: true, description: "Search everything, with ⌘K" }));
  const tip = page.getByRole("tooltip", { name: "Search everything, with ⌘K" });
  await expect(tip).toBeVisible();
  // Rest in the bubble's padding, past its text: over the text itself the cursor is an I-beam.
  const tipSpot = await tip.evaluate((bubble) => {
    const range = document.createRange();
    range.selectNodeContents(bubble);
    const text = range.getBoundingClientRect();
    const box = bubble.getBoundingClientRect();
    return { x: Math.round((text.right + box.right) / 2), y: Math.round(box.top + box.height / 2) };
  });
  await page.mouse.move(tipSpot.x, tipSpot.y, { steps: 2 });
  await page.waitForTimeout(250);
  await expect(tip).toBeVisible();
  await expect(root(page)).toHaveAttribute("data-state", "default");
  expect(await visibility(page, tipSpot.x, tipSpot.y), "over the tooltip").toBeGreaterThanOrEqual(0.2);
});

test("the dot stays visible over the Island and over Search", async ({ page }) => {
  await open(page);
  await page.locator(".island-shell[data-measured]").waitFor();
  const shell = (await page.locator(".island-shell").boundingBox())!;
  await page.mouse.move(Math.round(shell.x + shell.width / 2), Math.round(shell.y + shell.height / 2), { steps: 2 });
  await expect(page.locator(".island-toggle")).toHaveAttribute("aria-expanded", "true");
  // Over the pill's controls the cursor is magnetic: the light ink on black.
  await page.waitForTimeout(250);
  await expect(root(page)).toHaveAttribute("data-state", "magnetic");
  await expect(root(page)).toHaveAttribute("data-ink", "light");
  // In the open Island's empty middle, the full dot must show on black.
  await page.waitForTimeout(700);
  const toggle = (await page.locator(".island-toggle").boundingBox())!;
  const search = (await page.locator(".island-search").boundingBox())!;
  const x = Math.round((toggle.x + toggle.width + search.x) / 2);
  const y = Math.round(toggle.y + toggle.height / 2);
  await page.mouse.move(x, y, { steps: 2 });
  await page.waitForTimeout(250);
  await expect(root(page)).toHaveAttribute("data-state", "default");
  expect(await visibility(page, x, y), "over the Island").toBeGreaterThanOrEqual(0.2);

  await page.mouse.move(640, 600, { steps: 2 });
  await page.keyboard.press("Meta+k");
  const panel = page.locator(".search-panel");
  await expect(panel).toBeVisible();
  await page.waitForTimeout(500);
  const box = (await panel.boundingBox())!;
  const [px, py] = [Math.round(box.x + box.width - 60), Math.round(box.y + box.height - 22)];
  await page.mouse.move(px, py, { steps: 2 });
  await page.waitForTimeout(250);
  expect(await visibility(page, px, py), "over Search").toBeGreaterThanOrEqual(0.2);
});

test("if the browser won't re-stack the cursor, it rides inside the open dialog", async ({ page }) => {
  await open(page);
  await page.mouse.move(300, 300);
  await page.evaluate(() => {
    HTMLElement.prototype.showPopover = () => {
      throw new DOMException("Refused", "InvalidStateError");
    };
  });
  await page.getByRole("button", { name: "Open a sheet" }).click();
  const sheet = page.getByRole("dialog", { name: "A sheet" });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("[data-cursor-root]")).toHaveAttribute("data-reparented", "");
  await page.waitForTimeout(1000);
  const box = (await sheet.boundingBox())!;
  const [x, y] = [Math.round(box.x + box.width / 2), Math.round(box.y + 16)];
  await page.mouse.move(x, y, { steps: 2 });
  await page.waitForTimeout(250);
  expect(await visibility(page, x, y)).toBeGreaterThanOrEqual(0.2);
  const dot = await rect(page, ".cursor-dot");
  expect(dot.cx).toBeCloseTo(x, 0);
  expect(dot.cy).toBeCloseTo(y, 0);
});

test("the cursor stays live through a View Transition", async ({ page }) => {
  await open(page);
  test.skip(!(await page.evaluate(() => typeof document.startViewTransition === "function")), "No View Transitions");
  await page.addStyleTag({
    content: "::view-transition-old(root), ::view-transition-new(root) { animation-duration: 4s !important; }",
  });
  const area = page.getByTestId("cursor-accuracy");
  const start = await hover(page, area, [0.25, 0.5]);
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-view-transition", "");
    const transition = document.startViewTransition(() => {
      document.documentElement.setAttribute("data-finish", "saffron");
    });
    void transition.finished.finally(() => document.documentElement.removeAttribute("data-view-transition"));
  });
  await page.waitForTimeout(300);
  expect(await page.locator(".cursor").evaluate((element) => getComputedStyle(element).viewTransitionName)).toBe("cursor");
  const end = await hover(page, area, [0.75, 0.5]);
  await page.waitForTimeout(250);
  expect(await visibility(page, end.x, end.y), "live at the new position").toBeGreaterThanOrEqual(0.2);
  expect(await visibility(page, start.x, start.y), "no ghost at the old one").toBeLessThan(0.05);
});

// ─── Guarantees ──────────────────────────────────────────────────────────────

async function touchPage(browser: Browser) {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  return context.newPage();
}

test("touch shows no custom cursor", async ({ browser, baseURL }) => {
  const page = await touchPage(browser);
  await page.goto(`${baseURL}${KITCHEN}`);
  await page.waitForLoadState("networkidle");
  for (const [x, y] of [
    [100, 200],
    [200, 400],
    [300, 600],
  ]) {
    await page.touchscreen.tap(x, y);
  }
  await page.waitForTimeout(300);
  await expect(page.locator("html")).not.toHaveClass(/cursor-custom/);
  const custom = page.locator("[data-cursor-root]:not([data-hidden])");
  await expect(custom).toHaveCount(0);
  await page.context().close();
});

test("“Use system cursor” restores the native cursor and survives a reload", async ({ page }) => {
  await open(page);
  await page.mouse.move(200, 200);
  await expect(html(page)).toHaveClass(/cursor-custom/);
  await page.getByText("Use system cursor").click();
  await expect(page.getByRole("switch", { name: "Use system cursor" })).toBeChecked();
  await expect(html(page)).not.toHaveClass(/cursor-custom/);
  await expect(root(page)).toHaveCount(0);

  await page.reload();
  await page.getByRole("switch", { name: "Use system cursor" }).waitFor();
  await expect(page.getByRole("switch", { name: "Use system cursor" })).toBeChecked();
  await page.mouse.move(240, 240);
  await page.mouse.move(260, 260);
  await page.waitForTimeout(500);
  await expect(html(page)).not.toHaveClass(/cursor-custom/);
  await expect(root(page)).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe("none");
});

test("“Larger cursor” makes it 1.5× and survives a reload", async ({ page }) => {
  await open(page);
  await page.getByText("Larger cursor").click();
  await expect(page.getByRole("switch", { name: "Larger cursor" })).toBeChecked();
  await hover(page, page.getByTestId("cursor-accuracy"));
  await settle(page);
  expect((await rect(page, ".cursor-dot")).width).toBeCloseTo(21, 0);
  await page.reload();
  await page.locator("[data-cursor-root]").waitFor({ state: "attached" });
  await hover(page, page.getByTestId("cursor-accuracy"));
  await settle(page);
  expect((await rect(page, ".cursor-dot")).width).toBeCloseTo(21, 0);
});

test("if the cursor loop throws, the native cursor comes back and it's logged once", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" && message.text().startsWith("Cursor:")) warnings.push(message.text());
  });
  await open(page);
  const area = await hover(page, page.getByTestId("cursor-accuracy"));
  await expect(html(page)).toHaveClass(/cursor-custom/);
  // Measure the next spot first: once the style engine is broken, Playwright's own
  // scrolling and stability checks can't be trusted, so the pointer only moves.
  const caption = (await page.getByRole("heading", { name: "Accuracy" }).boundingBox())!;
  const text = { x: Math.round(caption.x + 8), y: Math.round(caption.y + caption.height / 2) };
  await page.evaluate(() => {
    window.getComputedStyle = () => {
      throw new Error("A broken style engine");
    };
  });
  await page.mouse.move(text.x, text.y, { steps: 2 });
  await page.mouse.move(area.x, area.y, { steps: 2 });
  await expect(html(page)).not.toHaveClass(/cursor-custom/);
  await expect(root(page)).toHaveCount(0);
  expect(warnings).toHaveLength(1);
});

test("if frames stop while the pointer moves, the native cursor comes back", async ({ page }) => {
  await open(page);
  const { x, y } = await hover(page, page.getByTestId("cursor-accuracy"));
  await expect(html(page)).toHaveClass(/cursor-custom/);
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(x + (i % 10) * 4, y + (i % 7) * 3);
    await page.waitForTimeout(20);
  }
  await expect(html(page)).not.toHaveClass(/cursor-custom/);
});

test("with reduced motion, shape changes are instant and nothing drifts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const primary = page.getByTestId("playground-light").getByRole("button", { name: "Primary" });
  const { box } = await hover(page, primary, [0.95, 0.5]);
  await frames(page, 3);
  const shape = await rect(page, ".cursor-shape");
  expect(shape.width).toBeCloseTo(box.width + 16, 1);
  expect(shape.x).toBeCloseTo(box.x - 8, 1);
  expect(await primary.evaluate((button) => getComputedStyle(button).translate)).toBe("none");

  // Shake to locate still works: it changes size, not position.
  const { x, y } = await hover(page, page.getByTestId("cursor-accuracy"));
  for (let i = 0; i < 6; i++) await page.mouse.move(x + (i % 2 === 0 ? 90 : -90), y, { steps: 3 });
  await expect(root(page)).toHaveAttribute("data-shaking", "");
  await frames(page);
  expect((await rect(page, ".cursor-dot")).width).toBeCloseTo(42, 0);
});

test("increased contrast thickens the outline to 2px and drops translucency", async ({ page }) => {
  await page.emulateMedia({ contrast: "more" });
  await open(page);
  await hover(page, page.getByTestId("cursor-accuracy"));
  await frames(page);
  const dot = await page.locator(".cursor-dot").evaluate((element) => {
    const style = getComputedStyle(element);
    return { boxShadow: style.boxShadow, backgroundColor: style.backgroundColor };
  });
  expect(dot.boxShadow).toContain("0px 0px 0px 2px");
  expect(dot.backgroundColor).toBe("rgb(29, 29, 31)");
});

test("forced colors keep the system cursor", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Only Chromium emulates forced colors");
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(KITCHEN);
  await page.waitForLoadState("networkidle");
  await page.mouse.move(200, 200);
  await page.mouse.move(220, 220);
  await page.waitForTimeout(300);
  await expect(html(page)).not.toHaveClass(/cursor-custom/);
  await expect(root(page)).toHaveCount(0);
});
