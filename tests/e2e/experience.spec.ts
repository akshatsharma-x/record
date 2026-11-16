import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { edit } from "@/content/derive";
import { monthsAt, progressAt, type ScrubClip, scrubMap, targetOf, timeAt } from "@/lib/edit";

/**
 * "The edit" (DESIGN.md §7.4, Part 7): Experience as a multi-track timeline the visitor
 * scrubs, pinned on wide, tall screens, and a stack of role cards everywhere else.
 * Today is pinned, so the scale is the same on every run.
 */

const TODAY = "2026-11-16";
const NOW = new Date(`${TODAY}T12:00:00+05:30`);
const PINNED = { width: 1440, height: 900 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const data = edit(content);
const clips = data.tracks.flatMap((track) => track.clips.map((clip) => ({ ...clip, track: track.id })));
const scrub: ScrubClip[] = clips.map((clip) => ({ id: clip.id, track: clip.track, lane: clip.lane, from: monthsAt(clip.start), to: monthsAt(clip.end ?? TODAY) }));
const from = monthsAt(data.start);
const to = monthsAt(TODAY);
const map = scrubMap(scrub, from, to);
const panelOf = (id: string) => clips.find((clip) => clip.id === id)!.panel;
const scrubOf = (id: string) => scrub.find((clip) => clip.id === id)!;
const roles = content.experience;

const root = (page: Page) => page.locator("#edit");
const clip = (page: Page, id: string) => page.locator(`.edit-clip[data-clip="${id}"]`);
const panel = (page: Page, id: string) => page.locator(`.edit-panel[data-panel="${id}"]`);
const active = (page: Page) => page.locator(".edit-panel[data-active]");

async function open(page: Page) {
  await page.clock.setFixedTime(NOW);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/** Where the pin starts, how far it runs, and the viewport's height. */
function geometry(page: Page) {
  return page.evaluate(() => {
    const element = document.getElementById("edit")!;
    const stage = element.querySelector<HTMLElement>(".edit-stage")!;
    return { top: element.getBoundingClientRect().top + window.scrollY, length: element.offsetHeight - stage.offsetHeight, viewport: window.innerHeight };
  });
}

/** Scroll progress through the pin, 0–1. */
async function progress(page: Page) {
  const { top, length } = await geometry(page);
  return page.evaluate(({ top, length }) => Math.min(1, Math.max(0, (window.scrollY - top) / length)), { top, length });
}

async function scrubTo(page: Page, p: number) {
  const { top, length } = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(top + p * length));
}

/** The middle of each stretch the viewer shows one clip for. */
const stretches = map.stretches.flatMap((stretch) => (stretch.id ? [{ id: stretch.id, p: (progressAt(map, stretch.from) + progressAt(map, stretch.to)) / 2 }] : []));

/** Waits for a spring to settle on a clip's target. */
async function settledOn(page: Page, id: string) {
  await expect.poll(() => progress(page), { timeout: 4000 }).toBeCloseTo(targetOf(map, scrubOf(id)), 2);
}

/** Animations in the role visuals, by play state. */
function visualAnimations(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((visuals) =>
    visuals.flatMap((visual) => [...visual.querySelectorAll("*")].flatMap((element) => element.getAnimations().map((animation) => animation.playState))),
  );
}

test.describe("pinned, on a wide, tall screen", () => {
  test.use({ viewport: PINNED });
  test.skip(({ isMobile }) => isMobile, "Phones get the stack");

  test("pins for less than 300vh, and the clip under the playhead plays in the viewer", async ({ page }) => {
    await open(page);
    await expect(root(page)).toHaveAttribute("data-editing", "");
    const { length, viewport } = await geometry(page);
    expect(length).toBeGreaterThan(0);
    expect(length).toBeLessThanOrEqual(3 * viewport);
    expect(stretches.map((stretch) => stretch.id)).toEqual(expect.arrayContaining(roles.map((role) => role.id)));
    for (const stretch of stretches) {
      await scrubTo(page, stretch.p);
      await expect(active(page)).toHaveAttribute("data-panel", panelOf(stretch.id));
      await expect(active(page)).toHaveCount(1);
      // The playhead sits on the real time scale, at the time this scroll stands for.
      const t = timeAt(map, await progress(page));
      await expect.poll(async () => Number(await root(page).evaluate((element) => element.style.getPropertyValue("--playhead")))).toBeCloseTo(t - from, 1);
      await expect(page.locator(".edit-playhead-time")).toHaveText(`${MONTHS[Math.floor(t % 12)]} ${Math.floor(t / 12)}`);
    }
    // Only the panel on show is reachable; the others are inert.
    expect(await page.locator(".edit-panel[inert]").count()).toBe(data.panels.length - 1);
  });

  test("lays every clip on the real time scale, and the EY and United overlap honestly", async ({ page }) => {
    await open(page);
    const span = to - from;
    for (const entry of clips) {
      const lanes = (await page.locator(`.edit-track[data-track="${entry.track}"] .edit-lanes`).boundingBox())!;
      const box = (await clip(page, entry.id).boundingBox())!;
      const x = (t: number) => lanes.x + ((Math.min(t, to) - from) / span) * lanes.width;
      expect(Math.abs(box.x - x(monthsAt(entry.start))), `${entry.id} starts on its date`).toBeLessThan(1.5);
      const end = x(monthsAt(entry.end ?? TODAY));
      // A two-day clip is a sliver, never wider than its dates need to be seen.
      if (end - box.x >= 6) expect(Math.abs(box.x + box.width - end), `${entry.id} ends on its date`).toBeLessThan(1.5);
      else expect(box.width).toBeLessThanOrEqual(6.5);
    }
    // EY and United start the same month on two lanes, both whole, EY above.
    const ey = (await clip(page, "ey").boundingBox())!;
    const united = (await clip(page, "united-airlines").boundingBox())!;
    expect(Math.abs(ey.x - united.x)).toBeLessThan(1);
    expect(ey.y + ey.height).toBeLessThanOrEqual(united.y + 1);
    expect(united.width).toBeGreaterThan(ey.width);
    await expect(clip(page, "united-airlines")).toHaveAttribute("data-ongoing", "true");
    // Honors with only a year are year brackets, spanning exactly their year.
    for (const honor of data.tracks.find((track) => track.id === "honors")!.clips) {
      await expect(clip(page, honor.id)).toHaveAttribute("data-precision", "year");
      await expect(clip(page, honor.id)).toHaveAttribute("aria-label", new RegExp(`, ${honor.dates}$`));
    }
    await expect(page.locator(".edit-now")).toBeVisible();
  });

  test("takes every date, name and number from content", async ({ page }) => {
    await open(page);
    for (const role of roles) {
      const view = data.panels.find((entry) => entry.id === role.id)!;
      if (view.kind !== "role") throw new Error(`${role.id} isn't a role`);
      const element = panel(page, role.id);
      await expect(element.locator(".edit-kicker")).toHaveText(role.location ? `${view.dates} · ${role.location}` : view.dates);
      await expect(element.locator(".edit-title")).toHaveText(role.org);
      await expect(element.locator(".edit-role")).toHaveText(role.role);
      await expect(element.locator(".edit-summary")).toHaveText(role.summary.text);
      await expect(element.locator(".edit-highlights li")).toHaveText(role.bullets.slice(0, 3).map((bullet) => bullet.text));
      await expect(element.locator(".edit-stack li")).toHaveText(role.stack);
      const tokens = view.groups.flatMap((group) => group.metrics.map((metric) => metric.token));
      await expect(element.locator(".edit-metric-value .sr-only")).toHaveText(tokens);
      // The counters land on the stated figures.
      await scrubTo(page, targetOf(map, scrubOf(role.id)));
      await expect(active(page)).toHaveAttribute("data-panel", role.id);
      await expect(element.locator('.edit-metric-value [aria-hidden="true"]')).toHaveText(tokens, { timeout: 4000 });
    }
    await expect(clip(page, "sci-2026")).toHaveAttribute("aria-label", /28–29 Apr 2026/);
    // A count cut short leaves its figures as stated.
    const united = data.panels.find((entry) => entry.id === "united-airlines")!;
    if (united.kind !== "role") throw new Error("united-airlines isn't a role");
    await scrubTo(page, targetOf(map, scrubOf("walkingtree")));
    await scrubTo(page, targetOf(map, scrubOf("united-airlines")));
    await expect(active(page)).toHaveAttribute("data-panel", "united-airlines");
    await scrubTo(page, targetOf(map, scrubOf("walkingtree")));
    await expect(active(page)).toHaveAttribute("data-panel", "walkingtree");
    await expect(panel(page, "united-airlines").locator('.edit-metric-value [aria-hidden="true"]')).toHaveText(
      united.groups.flatMap((group) => group.metrics.map((metric) => metric.token)),
      { timeout: 500 },
    );
  });

  test("a click springs the playhead to the clip", async ({ page }) => {
    await open(page);
    await scrubTo(page, 0.98);
    await expect(active(page)).toHaveAttribute("data-panel", "united-airlines");
    const start = await page.evaluate(() => window.scrollY);
    await clip(page, "walkingtree").click();
    // It travels there over several frames, not in one jump.
    const path = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const seen: number[] = [];
          const sample = () => {
            seen.push(window.scrollY);
            if (seen.length < 12) requestAnimationFrame(sample);
            else resolve(seen);
          };
          requestAnimationFrame(sample);
        }),
    );
    expect(new Set(path).size).toBeGreaterThan(3);
    expect(path.every((y) => y <= start)).toBe(true);
    await settledOn(page, "walkingtree");
    await expect(active(page)).toHaveAttribute("data-panel", "walkingtree");
    // A honor is a marker: choosing one shows it while the playhead stays in its year.
    const deans = clips.find((entry) => entry.panel === "deans-list")!;
    await clip(page, deans.id).click();
    await expect(active(page)).toHaveAttribute("data-panel", "deans-list");
    await expect.poll(() => progress(page)).toBeCloseTo(targetOf(map, scrubOf(deans.id)), 2);
    await expect(active(page)).toHaveAttribute("data-panel", "deans-list");
  });

  test("a keyboard user gets through the section in 10 presses or fewer", async ({ page, browserName }) => {
    // Safari moves between buttons and links with Option-Tab unless told otherwise.
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await open(page);
    // From above the section: the first clip scrolls into view and still shows its role.
    await page.locator("#highlights").scrollIntoViewIfNeeded();
    // A stop just before the section, so the count starts at its edge.
    await page.evaluate(() => {
      const before = document.createElement("button");
      before.id = "before-experience";
      before.textContent = "Before";
      before.style.position = "fixed";
      before.style.top = "0";
      document.getElementById("experience")!.before(before);
      before.focus();
    });
    await page.keyboard.press(tab);
    const first = clips[0].id;
    await expect(clip(page, first)).toBeFocused();
    await expect(active(page)).toHaveAttribute("data-panel", panelOf(first));
    await settledOn(page, first);
    const reached: string[] = [first];
    let presses = 1;
    for (; presses < 20; presses++) {
      await page.keyboard.press(tab);
      const where = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element?.closest("#experience")) return null;
        return element.dataset.clip ?? element.getAttribute("href") ?? element.textContent ?? "";
      });
      if (where === null) break;
      reached.push(where);
    }
    // Every press but the last landed in the section; the last one left it.
    expect(presses + 1).toBeLessThanOrEqual(10);
    const stops = clips.filter((entry) => entry.track !== "honors").map((entry) => entry.id);
    expect(reached.slice(0, stops.length)).toEqual(stops);
    expect(reached[stops.length]).toBe(clips.find((entry) => entry.track === "honors")!.id);
  });

  test("the hint reads Press Space to play, and Space plays and pauses like a video", async ({ page }) => {
    await open(page);
    await scrubTo(page, 0.05);
    const hint = page.locator(".edit-hint");
    await expect(hint).toHaveText("Press Space to play");
    await clip(page, "walkingtree").focus();
    await settledOn(page, "walkingtree");
    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press(" ");
    await expect(root(page)).toHaveAttribute("data-playing", "");
    await expect(hint).toHaveText("Press Space to pause");
    await page.waitForTimeout(700);
    // Still playing: the key's release didn't click the clip and spring back to it.
    await expect(root(page)).toHaveAttribute("data-playing", "");
    const during = await page.evaluate(() => window.scrollY);
    expect(during).toBeGreaterThan(before);
    // Space didn't page down: playback moves about a dwell per 2.5 seconds.
    expect(during - before).toBeLessThan(600);
    await page.keyboard.press(" ");
    await expect(root(page)).not.toHaveAttribute("data-playing", "");
    await expect(hint).toHaveText("Press Space to play");
    const paused = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(paused);
  });

  test("J, K and L shuttle backward, pause and forward", async ({ page }) => {
    await open(page);
    await scrubTo(page, 0.4);
    await clip(page, "truechip").focus();
    await settledOn(page, "truechip");
    const start = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("l");
    await page.keyboard.press("l");
    await expect(root(page)).toHaveAttribute("data-playing", "");
    await page.waitForTimeout(400);
    const forward = await page.evaluate(() => window.scrollY);
    expect(forward).toBeGreaterThan(start);
    await page.keyboard.press("k");
    await expect(root(page)).not.toHaveAttribute("data-playing", "");
    const held = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("j");
    await expect(root(page)).toHaveAttribute("data-playing", "");
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(held);
    await page.keyboard.press("k");
  });

  test("never traps the scroll: the wheel stops playback and carries on through", async ({ page }) => {
    await open(page);
    await scrubTo(page, 0.3);
    await clip(page, "truechip").focus();
    await settledOn(page, "truechip");
    await page.keyboard.press(" ");
    await expect(root(page)).toHaveAttribute("data-playing", "");
    await page.mouse.move(720, 300);
    const scrollY = () => page.evaluate(() => window.scrollY);
    const before = await scrollY();
    await page.mouse.wheel(0, 400);
    await expect(root(page)).not.toHaveAttribute("data-playing", "");
    // WebKit can drop a wheel tick that lands in the same frame as one of the edit's own
    // scrolls; from the next tick on, the scroll is the visitor's alone, as in a gesture.
    // Chromium animates each tick, so each gets time to land before the next.
    await page.waitForTimeout(250);
    for (let i = 0; i < 4 && (await scrollY()) < before + 300; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(250);
    }
    await expect.poll(scrollY).toBeGreaterThan(before + 300);
    // Nothing pulls it back.
    const after = await scrollY();
    await page.waitForTimeout(300);
    expect(await scrollY()).toBe(after);
    // The wheel alone takes the visitor out the far side.
    const research = page.locator("#research");
    for (let i = 0; i < 60; i++) {
      if ((await research.boundingBox())!.y < PINNED.height / 2) break;
      await page.mouse.wheel(0, 300);
    }
    expect((await research.boundingBox())!.y).toBeLessThan(PINNED.height / 2);
  });

  test("honors are one stop, and the arrow keys move between them", async ({ page, browserName }) => {
    await open(page);
    const honors = page.locator('.edit-clip[data-track="honors"]');
    expect(await honors.evaluateAll((all) => all.filter((button) => (button as HTMLElement).tabIndex === 0).length)).toBe(1);
    const order = data.tracks.find((track) => track.id === "honors")!.clips;
    await clip(page, order[0].id).focus();
    await expect(active(page)).toHaveAttribute("data-panel", order[0].panel);
    await page.keyboard.press("ArrowRight");
    await expect(clip(page, order[1].id)).toBeFocused();
    await expect(active(page)).toHaveAttribute("data-panel", order[1].panel);
    await expect(clip(page, order[1].id)).toHaveAttribute("tabindex", "0");
    await expect(clip(page, order[0].id)).toHaveAttribute("tabindex", "-1");
    await page.keyboard.press("ArrowLeft");
    await expect(clip(page, order[0].id)).toBeFocused();
    // Tab leaves the track from wherever the roving stop is.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(page.locator('.edit-clip[data-track="honors"]:focus')).toHaveCount(0);
  });

  test("a footnote's back-link brings up the panel its mark is in", async ({ page }) => {
    await open(page);
    const mark = panel(page, "truechip").locator("a[role=doc-noteref]").first();
    const id = await mark.getAttribute("id");
    expect(id).toBeTruthy();
    await scrubTo(page, 0.98);
    await expect(active(page)).toHaveAttribute("data-panel", "united-airlines");
    await page.locator(`a[role=doc-backlink][href="#${id}"]`).click();
    await expect(active(page)).toHaveAttribute("data-panel", "truechip");
    await settledOn(page, "truechip");
    await expect(mark).toBeVisible();
  });

  test("the visuals play when their role comes on, and pause off-screen", async ({ page }) => {
    await open(page);
    await scrubTo(page, targetOf(map, scrubOf("united-airlines")));
    await expect(active(page)).toHaveAttribute("data-panel", "united-airlines");
    expect(await visualAnimations(page, ".edit-panel[data-active] .role-visual")).toContain("running");
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await expect(root(page)).toHaveAttribute("data-offscreen", "");
    expect(await visualAnimations(page, ".edit-panel[data-active] .role-visual")).not.toContain("running");
  });

  test("finishes in its own light: the lights go down only after the pin lets go", async ({ page }) => {
    await open(page);
    await scrubTo(page, 1);
    await expect(active(page)).toHaveAttribute("data-panel", "united-airlines");
    const fade = () => page.locator("[data-backdrop-surface]").nth(1).evaluate((layer) => Number((layer as HTMLElement).style.opacity));
    await page.waitForTimeout(400);
    expect(await fade()).toBe(0);
    await expect(page.locator("html")).toHaveAttribute("data-surface-active", "light");
    await page.locator("#research").evaluate((section) => section.scrollIntoView({ block: "center" }));
    await expect(page.locator("html")).toHaveAttribute("data-surface-active", "dark");
  });

  test("has no accessibility violations while pinned", async ({ page }) => {
    await open(page);
    await scrubTo(page, 0.5);
    const { violations } = await new AxeBuilder({ page }).include("#experience").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations).toEqual([]);
  });
});

/** The stack: role cards under a read-only strip, each visual on its final frame. */
async function expectStack(page: Page) {
  await expect(root(page)).not.toHaveAttribute("data-editing", "");
  const { length } = await geometry(page);
  expect(length).toBe(0);
  await expect(page.locator(".edit-timeline")).toHaveAttribute("aria-hidden", "true");
  expect(await page.locator(".edit-clip").evaluateAll((all) => all.filter((button) => (button as HTMLElement).tabIndex >= 0).length)).toBe(0);
  for (const role of roles) {
    await expect(panel(page, role.id)).toBeVisible();
    await expect(panel(page, role.id).locator(".role-visual")).toBeVisible();
  }
  for (const entry of data.panels.filter((item) => item.kind !== "role")) await expect(panel(page, entry.id)).toBeHidden();
  await page.locator("#experience").scrollIntoViewIfNeeded();
  expect(await visualAnimations(page, ".role-visual")).toEqual([]);
  // The figures read as stated, with nothing counting.
  for (const role of data.panels) {
    if (role.kind !== "role") continue;
    const tokens = role.groups.flatMap((group) => group.metrics.map((metric) => metric.token));
    await expect(panel(page, role.id).locator('.edit-metric-value [aria-hidden="true"]')).toHaveText(tokens);
  }
}

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "Phones only");

  test("is a stack of role cards under a read-only strip", async ({ page }) => {
    await open(page);
    await expectStack(page);
    await expect(page.locator(".edit-now")).toBeVisible();
  });
});

test.describe("with reduced motion", () => {
  test.use({ viewport: PINNED, reducedMotion: "reduce" });

  test("doesn't pin: it's the stack, each visual on its final frame", async ({ page }) => {
    await open(page);
    await expectStack(page);
  });
});

test.describe("without JavaScript", () => {
  test.use({ viewport: PINNED, javaScriptEnabled: false });

  test("is the stack, its strip ending at the last date content knows", async ({ page }) => {
    await page.goto("/");
    await expect(root(page)).not.toHaveAttribute("data-editing", "");
    await expect(page.locator(".edit-timeline")).toHaveAttribute("aria-hidden", "true");
    for (const role of roles) await expect(panel(page, role.id)).toBeVisible();
    await expect(page.locator(".edit-now")).toBeHidden();
    const { length } = await geometry(page);
    expect(length).toBe(0);
  });
});
