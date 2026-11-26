import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { visibility } from "./visibility";

/**
 * The typographic edition ships only while content has no photo; since Part 20 it has one,
 * so "/" ships the portrait edition (its own tests are in portrait.spec.ts) and the tests
 * of what only the typographic edition does wait for a build without a photo.
 */
const typographic = !content.profile.photo;
const ONLY_TYPOGRAPHIC = "the typographic edition ships only while content has no photo";

/**
 * The hero (DESIGN.md §7), typographic edition: the production build has no photo yet, so
 * "/" ships this one. The portrait edition's tests are in portrait.spec.ts.
 */

const hero = (page: Page) => page.locator("#top");
const cursor = (page: Page) => page.locator("[data-cursor-root]");

/** Scrolls by script: mobile WebKit has no wheel. */
const scrollBy = (page: Page, y: number) => page.evaluate((dy) => window.scrollBy(0, dy), y);

/** Once the arrival is over: the key facts rise in turn (Part 19), so they line up only then. */
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getElementById("top")!
      .getAnimations({ subtree: true })
      .every((animation) => animation.playState !== "running"),
  );

interface Arrival {
  ends: number[];
  opacities: string[];
  /** Each animation on the upper dot grid, by name. */
  field: string[];
  /** Each animation on the name's glint (its ::after), by name. */
  glint: string[];
}

/**
 * At the first frame: when every hero animation that ends will end (ms), the name's
 * opacity, and what moves the dot field. The arrival must be over in 1.2s, and the name
 * must never be transparent.
 */
async function watchArrival(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () =>
      requestAnimationFrame(() => {
        const ours = document.getAnimations().filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return target instanceof Element && target.closest("#top");
        });
        const ends = ours
          .filter((animation) => animation.effect!.getComputedTiming().iterations !== Infinity)
          .map((animation) => Number(animation.effect!.getComputedTiming().endTime));
        const opacities = [...document.querySelectorAll(".hero-line")].map((line) => getComputedStyle(line).opacity);
        const field = ours
          .filter((animation) => ((animation.effect as KeyframeEffect).target as Element).matches('[data-field="upper"]'))
          .map((animation) => (animation as CSSAnimation).animationName);
        const glint = ours
          .filter((animation) => {
            const effect = animation.effect as KeyframeEffect;
            return effect.pseudoElement === "::after" && (effect.target as Element).matches(".hero-name");
          })
          .map((animation) => (animation as CSSAnimation).animationName);
        (window as unknown as { __arrival: Arrival }).__arrival = { ends, opacities, field, glint };
      }),
    );
  });
}

const arrival = (page: Page) => page.evaluate(() => (window as unknown as { __arrival: Arrival }).__arrival);

/** Collects layout shifts from the first byte, as CLS counts them. */
async function watchShifts(page: Page) {
  await page.addInitScript(() => {
    const shifts: number[] = [];
    (window as unknown as { __shifts: number[] }).__shifts = shifts;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) shifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

test("the hero reads like a product's first screen: the role, the name, the line, two ways on, and the key facts", async ({ page }) => {
  await page.goto("/");
  const top = hero(page);
  await expect(top.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
  await expect(top.getByText("AI & ML Engineer")).toBeVisible();
  await expect(top.getByText("I build intelligent systems — and make them clear.")).toBeVisible();
  await expect(top.getByRole("link", { name: "See my work" })).toHaveAttribute("href", "#work");
  await expect(top.getByRole("link", { name: "Say hello" })).toHaveAttribute("href", "#contact");
  // Each fact a label over its value, read as one phrase, its label first.
  const facts = top.getByRole("list", { name: "Key facts" }).getByRole("link");
  await expect(facts.locator(".hero-fact-label")).toHaveText(["Now", "Studying", "Presented"]);
  await expect(facts.locator(".hero-fact-value")).toHaveText(["Associate Analyst Intern, Merck Group", "B.Tech CSE ’27, Manipal University Jaipur", "SCI-2026, Springer LNNS"]);
  const names = ["Now: Associate Analyst Intern, Merck Group", "Studying: B.Tech CSE ’27, Manipal University Jaipur", "Presented: SCI-2026, Springer LNNS"];
  for (const [i, name] of names.entries()) await expect(facts.nth(i)).toHaveAccessibleName(name);
  // The current role's fact goes to that role, not to the timeline's start (Part 17).
  expect(await facts.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "#merck-title",
    "#credentials",
    "#research",
  ]);
  // Every finish, named like a product color, and the chosen one's name beside the dots.
  for (const name of ["Contrail", "Pink City", "Saffron", "Monsoon"]) await expect(top.getByRole("radio", { name })).toHaveCount(1);
  await expect(top.locator('.hero-finish-name [data-finish-name="contrail"]')).toBeVisible();
  await expect(top.locator('.hero-finish-name [data-finish-name="saffron"]')).toBeHidden();
});

test("the key facts sit on one line on a wide screen: each label over its value, the dots on the values' line", async ({ page, isMobile }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  test.skip(isMobile, "a wide screen");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await settled(page);
  const top = hero(page);
  const tops = await top.locator(".hero-fact-label").evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().top));
  expect(tops).toHaveLength(4);
  for (const at of tops) expect(Math.abs(at - tops[0])).toBeLessThanOrEqual(1);
  const middle = (box: { y: number; height: number }) => box.y + box.height / 2;
  const value = middle((await top.locator(".hero-fact-value").first().boundingBox())!);
  const dot = middle((await top.locator(".hero-swatches .swatch").first().boundingBox())!);
  expect(Math.abs(dot - value)).toBeLessThanOrEqual(2);
  // And it all fits inside the first screen, on every width a tablet or a desktop has.
  for (const width of [735, 1069, 1180]) {
    await page.setViewportSize({ width, height: 900 });
    const list = top.locator(".hero-fact-list");
    expect(await list.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const box = (await top.locator(".hero-facts").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});

test("the light never reaches the role's colors, and every word it does reach is white (Part 5, Part 18)", async ({ page, isMobile }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const top = hero(page);
  // The phone at its own size; tablets and desktops, tall and short.
  const sizes = isMobile ? [null] : [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 1280, height: 600 }];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    const reach = await top.locator(".hero-light-glow").evaluateAll((glows) => Math.min(...glows.map((glow) => glow.getBoundingClientRect().top)));
    // The role's gradient passes on black only (tests/unit/contrast.test.ts), so it sits above every glow.
    expect((await top.locator(".hero-role").boundingBox())!.y + (await top.locator(".hero-role").boundingBox())!.height, `the role at ${JSON.stringify(size)}`).toBeLessThan(reach);
  }
  // White passes where all three glows meet at full strength; fg-2 and the accents don't.
  const white = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--neutral-dark-fg)";
    document.querySelector("#top")!.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  for (const selector of [".hero-headline", ".hero-hello", ".hero-fact-label", ".hero-fact-value", '.hero-finish-name [data-finish-name="contrail"]']) {
    expect(await top.locator(selector).first().evaluate((element) => getComputedStyle(element).color), selector).toBe(white);
  }
  // The chosen finish's ring too: a state that has to show (non-text, 3:1).
  const ring = await top.locator(".hero-swatches input:checked + .swatch").evaluate((element) => getComputedStyle(element).outlineColor);
  expect(ring).toBe(white);
});

test.describe("on a fixed clock in India", () => {
  test.use({ timezoneId: "Asia/Kolkata", locale: "en-US" });

  test("the light warms at the visitor's dusk, and the first screen never says where Akshat is (Part 18)", async ({ page }) => {
    // 13:30 UTC is 7:00 PM in India: dusk.
    await page.clock.setFixedTime(new Date("2026-11-16T13:30:00Z"));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    if (typographic) {
      await expect(hero(page)).toHaveAttribute("data-warm", "");
      expect(await hero(page).evaluate((element) => element.style.getPropertyValue("--warmth-to"))).toBe("var(--light-dusk)");
    }
    // No date line, no clock, no country or time zone: not on screen, and not for screen readers.
    const said = await hero(page).evaluate((element) => element.textContent ?? "");
    for (const place of [/\bIndia\b/, /\bIST\b/, /Kolkata/, /\d{1,2}:\d{2}/, /November/]) expect(said).not.toMatch(place);
  });
});

test("the arrival takes at most 1.2s, and the name is painted from the first frame", async ({ page }) => {
  await watchArrival(page);
  await page.goto("/");
  await page.waitForFunction(() => "__arrival" in window);
  const { ends, opacities } = await arrival(page);
  expect(opacities).toEqual(["1", "1"]);
  expect(ends.length).toBeGreaterThan(0);
  expect(Math.max(...ends)).toBeLessThanOrEqual(1200);
});

test("the dot field arrives out of register and settles into it with the name, then holds still", async ({ page }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  await watchArrival(page);
  await page.goto("/");
  await page.waitForFunction(() => "__arrival" in window);
  expect((await arrival(page)).field).toEqual(["hero-register"]);
  const upper = hero(page).locator('.hero-field-layer[data-field="upper"]');
  // Once it has arrived, the two grids are one: the upper one neither turned nor scaled.
  await expect.poll(() => upper.evaluate((element) => element.getAnimations().length), { timeout: 3000 }).toBe(0);
  expect(await upper.evaluate((element) => [getComputedStyle(element).rotate, getComputedStyle(element).scale])).toEqual(["none", "none"]);
});

test("loading the hero shifts nothing", async ({ page }) => {
  await watchShifts(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const shifts = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts);
  expect(shifts.reduce((sum, value) => sum + value, 0)).toBeLessThan(0.01);
});

test("the CTAs lead to the work and to contact", async ({ page }) => {
  await page.goto("/");
  await hero(page).getByRole("link", { name: "See my work" }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work")).toBeInViewport();
  await page.goto("/");
  await hero(page).getByRole("link", { name: "Say hello" }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator("#contact")).toBeInViewport();
});

test("choosing a finish recolors the site from the swatch and says so in the Island", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await hero(page).locator('.hero-swatches .swatch[data-finish="pink-city"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-finish", "pink-city");
  await expect(hero(page).getByRole("radio", { name: "Pink City" })).toBeChecked();
  await expect(hero(page).locator('.hero-finish-name [data-finish-name="pink-city"]')).toBeVisible();
  await expect(hero(page).locator('.hero-finish-name [data-finish-name="contrail"]')).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Finish: Pink City" })).toHaveCount(1);
  // The wipe tidies up after itself, and the choice survives a reload.
  await expect(page.locator("html")).not.toHaveAttribute("data-finish-wiping");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-finish", "pink-city");
});

test("a glint crosses the name as it settles, drawn on a copy nothing reads or finds (Part 19)", async ({ page }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  await watchArrival(page);
  await page.goto("/");
  await page.waitForFunction(() => "__arrival" in window);
  expect((await arrival(page)).glint).toEqual(["hero-glint"]);
  const name = hero(page).getByRole("heading", { level: 1 });
  // The copy is the heading's generated content, with empty alternative text: it reads once.
  await expect(name).toHaveAccessibleName("Akshat Sharma");
  await expect(name).toHaveText("Akshat Sharma");
  await expect(name).toHaveAttribute("data-glint", "Akshat Sharma");
  // Once it has crossed, it rests off the name, to the right.
  await expect
    .poll(() => name.evaluate((h1) => getComputedStyle(h1, "::after").getPropertyValue("--hero-glint-x").trim()), { timeout: 3000 })
    .toBe("1.6");
});

test("under a mouse, the dots near the pointer light up, and the glint follows the pointer across the name (Part 19)", async ({ page, isMobile }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  test.skip(isMobile, "a mouse");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const top = hero(page);
  const spot = top.locator(".hero-spot");
  await expect(spot).toHaveCSS("opacity", "0");
  // Off to the headline's right, clear of the name and its loupe.
  await page.mouse.move(720, 450);
  await page.mouse.move(1100, 560, { steps: 8 });
  await expect(top).toHaveAttribute("data-pointer", "");
  await expect.poll(() => spot.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);
  // The pool settles under the pointer, on the spring.
  await expect
    .poll(async () => {
      const box = (await spot.boundingBox())!;
      return Math.hypot(box.x + box.width / 2 - 1100, box.y + box.height / 2 - 560);
    })
    .toBeLessThan(3);
  // Under the name's middle, the glint is halfway across it.
  const name = (await top.locator("#top-title").boundingBox())!;
  await page.mouse.move(Math.round(name.x + name.width / 2), Math.round(name.y + name.height + 24), { steps: 8 });
  const glint = () => top.evaluate((element) => Number(element.style.getPropertyValue("--hero-glint-x")));
  await expect.poll(glint).toBeCloseTo(0.5, 1);
  // Onto the Island, out of the hero: the pool goes out and the glint slides away.
  const island = (await page.locator(".island-shell").boundingBox())!;
  await page.mouse.move(Math.round(island.x + island.width / 2), Math.round(island.y + island.height / 2), { steps: 4 });
  await expect(top).not.toHaveAttribute("data-pointer", "");
  await expect.poll(glint).toBeCloseTo(1.6, 1);
});

test("nothing loops: once it has arrived the hero holds still, so there's nothing to pause (Part 18)", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const running = () =>
    hero(page).evaluate((element) =>
      element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length,
    );
  await expect.poll(running, { timeout: 3000 }).toBe(0);
  const loops = await hero(page).evaluate(
    (element) => element.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity).length,
  );
  expect(loops).toBe(0);
  // The portrait's one button is the aperture dial's (DESIGN.md §6.1).
  await expect(hero(page).getByRole("button")).toHaveCount(typographic ? 0 : 1);
});

test("under a mouse, the upper grid follows the pointer and the light moves against it", async ({ page, isMobile }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  test.skip(isMobile, "a mouse; phones tilt instead");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(720, 450);
  await page.mouse.move(1400, 450, { steps: 6 });
  const x = (selector: string) =>
    hero(page)
      .locator(selector)
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).translate.split(" ")[0]) || 0);
  await expect.poll(() => x('.hero-field-layer[data-field="upper"]')).toBeGreaterThan(1);
  expect(await x(".hero-light")).toBeLessThan(-1);
  // A few pixels at most: the grid's shift stays under one dot's pitch.
  expect(await x('.hero-field-layer[data-field="upper"]')).toBeLessThan(14);
});

test("scrolling away, the name lifts, recedes and fades, and the field tilts back into a floor (Part 19)", async ({ page }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Measured once the faces are in: the hero's height is what they make it.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const top = hero(page);
  const height = await top.evaluate((element) => (element as HTMLElement).offsetHeight);
  const out = () => top.evaluate((element) => Number(element.style.getPropertyValue("--hero-out")));
  // Halfway out when 30% of the hero has gone.
  await scrollBy(page, Math.round(height * 0.3));
  await expect.poll(out).toBeCloseTo(0.5, 1);
  const stack = top.locator(".hero-stack");
  expect(await stack.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(1);
  expect(await stack.evaluate((element) => Number(getComputedStyle(element).scale))).toBeLessThan(1);
  // The field turns about its foot, away from the viewer.
  expect(await top.locator(".hero-field").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m22)).toBeLessThan(0.99);
  // It's all done by the time 60% of the hero has gone.
  await scrollBy(page, Math.round(height * 0.35));
  await expect.poll(out).toBe(1);
});

test("the loupe magnifies the name under the cursor, and the dot stays visible at its center", async ({ page, isMobile }) => {
  test.skip(!typographic, ONLY_TYPOGRAPHIC);
  test.skip(isMobile, "the loupe needs a pointer; touch users miss nothing");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.mouse.move(40, 400);
  const box = (await page.locator("#top-title").boundingBox())!;
  // On a letter's stroke, and in the gap between two words.
  const spots = [
    [0.05, 0.62],
    [0.5, 0.5],
  ];
  for (const [fx, fy] of spots) {
    const [x, y] = [Math.round(box.x + box.width * fx), Math.round(box.y + box.height * fy)];
    await page.mouse.move(x, y, { steps: 4 });
    await expect(cursor(page)).toHaveAttribute("data-state", "loupe");
    await page.waitForTimeout(800);
    const shape = page.locator(".cursor-shape");
    await expect(shape).toHaveAttribute("data-variant", "lens");
    const size = (await shape.boundingBox())!;
    expect(Math.abs(size.width - 120)).toBeLessThanOrEqual(4);
    expect(await page.locator(".cursor-lens-copy").evaluate((copy) => copy.style.transform)).toContain("scale(1.35)");
    expect(await visibility(page, x, y), `the dot over the lens at ${fx}, ${fy}`).toBeGreaterThanOrEqual(0.2);
  }
  // The copy is decoration: hidden from assistive tech, and never a second heading.
  await expect(page.locator(".cursor-lens-copy")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  // Leaving the name puts the lens away.
  await page.mouse.move(Math.round(box.x + box.width / 2), Math.round(box.y + box.height + 160), { steps: 4 });
  await expect(cursor(page)).not.toHaveAttribute("data-state", "loupe");
  await expect(page.locator(".cursor-lens-copy")).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the hero reads in full: nothing waits on a script to appear", async ({ page }) => {
    await page.goto("/");
    const top = hero(page);
    await expect(top.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
    for (const text of ["AI & ML Engineer", "I build intelligent systems — and make them clear.", "Associate Analyst Intern, Merck Group"]) {
      await expect(top.getByText(text)).toBeVisible();
    }
    await expect(top.getByRole("link", { name: "See my work" })).toBeVisible();
    await expect(top.getByRole("link", { name: "Say hello" })).toBeVisible();
    await expect(top.getByRole("list", { name: "Key facts" }).getByRole("link")).toHaveCount(3);
    // The finish waits for a script: without one it couldn't change anything.
    await expect(top.locator(".hero-finish")).toBeHidden();
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the hero is complete and still: the grids already in register, no glint, no lit dots, no parallax, no scroll-out", async ({ page, isMobile }) => {
    test.skip(!typographic, ONLY_TYPOGRAPHIC);
    await page.goto("/");
    const top = hero(page);
    await expect(top.getByRole("heading", { level: 1 })).toHaveText("Akshat Sharma");
    await expect(top.getByRole("link", { name: "See my work" })).toBeVisible();
    const upper = top.locator('.hero-field-layer[data-field="upper"]');
    expect(await upper.evaluate((element) => getComputedStyle(element).getPropertyValue("--hero-register-turn").trim())).toBe("0deg");
    expect(await upper.evaluate((element) => getComputedStyle(element).getPropertyValue("--hero-register-scale").trim())).toBe("1");
    // No glint across the name, and no pool of lit dots.
    expect(await top.locator("#top-title").evaluate((h1) => getComputedStyle(h1, "::after").animationName)).toBe("none");
    await expect(top.locator(".hero-spot")).toBeHidden();
    await page.waitForLoadState("networkidle");
    if (!isMobile) {
      await page.mouse.move(40, 450);
      await page.mouse.move(1000, 450, { steps: 6 });
      await page.waitForTimeout(300);
      expect(await top.evaluate((element) => element.style.getPropertyValue("--px"))).toBe("");
      expect(await top.evaluate((element) => element.style.getPropertyValue("--hero-glint-x"))).toBe("");
      await expect(top).not.toHaveAttribute("data-pointer", "");
    }
    await scrollBy(page, 400);
    await page.waitForTimeout(300);
    expect(await top.evaluate((element) => element.style.getPropertyValue("--hero-out"))).toBe("0.0000");
  });
});
