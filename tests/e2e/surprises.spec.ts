import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { content } from "@/content";
import { medals } from "@/content/derive";
import { findPhoneNumbers } from "@/lib/privacy";
import { SURPRISES } from "@/lib/surprises";

/**
 * The surprises (DESIGN.md §8, Part 13), on the production build: one test for each, its
 * title tagged with the surprise's id (tests/unit/surprises.test.tsx checks every id has
 * one), then the rules they all keep. None steals focus, plays a sound or blocks reading,
 * none fires twice a session unless asked, and each respects reduced motion.
 */

const WIDE = { width: 1440, height: 900 };
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const words = content.copy.surprises;
const commands = words.commands;
const honors = medals(content);
// 3:30 PM in India on 17 November 2026: no clock on the page reads 9:41 by itself.
const AFTERNOON = new Date("2026-11-17T10:00:00Z");

const said = (page: Page, text: string) => page.locator(".island-activity-title", { hasText: text });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Search" });
const field = (page: Page) => page.getByRole("combobox", { name: "Search" });
const html = (page: Page) => page.locator("html");

async function open(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The page has hydrated: the Island has measured itself, so the shortcuts are listening. */
async function ready(page: Page) {
  await page.locator(".island-shell[data-measured]").waitFor();
}

/** A section in view, its lazy behavior loaded. */
async function toSection(page: Page, id: string, attribute: string) {
  await page.locator(`#${id}`).evaluate((element) => element.scrollIntoView());
  await expect(page.locator(`#${id}`)).toHaveAttribute(attribute, "");
}

/** Search, as each visitor opens it: ⌘K on a keyboard, the Island's Search on a phone. */
async function openSearch(page: Page, isMobile: boolean) {
  await ready(page);
  if (isMobile) {
    // The Island may still be open from the last time Search was opened from it.
    const toggle = page.locator(".island-toggle");
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.tap();
    await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Search" }).tap();
  } else {
    await page.keyboard.press("Meta+k");
  }
  await expect(dialog(page)).toBeVisible();
}

/** A secret phrase typed in full comes up as the Top hit, and Enter runs it. */
async function command(page: Page, isMobile: boolean, phrase: string, label: string) {
  await openSearch(page, isMobile);
  await field(page).fill(phrase);
  await expect(dialog(page).locator('[role=option][aria-selected="true"]')).toContainText(label);
  await field(page).press("Enter");
  await expect(dialog(page)).toBeHidden();
}

/** Each test sends from its own made-up address, so the in-memory limit never mixes them up. */
async function isolate(context: BrowserContext) {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `198.19.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
}

/** Records, in the page, whether `selector` ever had `attribute`, however briefly. */
async function watch(page: Page, selector: string, attribute: string) {
  await page.locator(selector).first().evaluate((element, name) => {
    const seen = window as unknown as { __seen?: Record<string, boolean> };
    seen.__seen ??= {};
    seen.__seen[name] = element.hasAttribute(name);
    new MutationObserver(() => {
      if (element.hasAttribute(name)) seen.__seen![name] = true;
    }).observe(element, { attributes: true, attributeFilter: [name] });
  }, attribute);
  return () => page.evaluate((name) => (window as unknown as { __seen: Record<string, boolean> }).__seen[name] === true, attribute);
}

test.describe("the hero", () => {
  test("[surprise:hero-lens] the loupe magnifies the name under the pointer", async ({ page, isMobile }) => {
    test.skip(isMobile, "The loupe needs a pointer; touch misses nothing");
    await open(page);
    const name = page.locator("#top-title");
    await expect(name).toHaveAttribute("data-cursor", "loupe");
    await page.mouse.move(40, 400);
    const box = (await name.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await expect(page.locator("[data-cursor-root]")).toHaveAttribute("data-state", "loupe");
    await expect(page.locator(".cursor-lens-copy")).toHaveAttribute("aria-hidden", "true");
  });

  test("[surprise:devanagari-name] ships off until Akshat approves it: a click on the name changes nothing", async ({ page, isMobile }) => {
    await open(page);
    const name = page.locator("#top-title");
    await expect(name).toHaveText(content.profile.name);
    await expect(name).not.toHaveAttribute("data-morph");
    await expect(page.locator(".hero-devanagari")).toHaveCount(0);
    if (isMobile) await name.tap();
    else await name.click();
    await expect(name).not.toHaveAttribute("data-morphed");
    await expect(page.getByText(words.devanagari.note)).toHaveCount(0);
  });
});

test.describe("at a glance, on a fixed clock, for a visitor in London", () => {
  test.use({ timezoneId: "Europe/London", locale: "en-US" });

  test("[surprise:glance-flips] Studying flips to the days to graduation, and Local time to 24-hour time", async ({ page }) => {
    // 09:11 UTC is 2:41 PM in India, on 16 November 2026.
    await page.clock.setFixedTime(new Date("2026-11-16T09:11:00Z"));
    await open(page);
    const studying = page.locator('[data-tile="studying"] button');
    await studying.scrollIntoViewIfNeeded();
    await studying.click();
    await expect(studying.locator('[data-face="back"]')).toContainText(/\d+\s*days to graduation/);
    const time = page.locator('[data-tile="time"] button');
    await expect(time).toContainText("2:41 PM IST");
    await time.click();
    await expect(time).toContainText("14:41 IST");
  });
});

test.describe("the edit", () => {
  test("[surprise:edit-shuttle] Space plays the edit like a video, and J, K and L shuttle it", async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones get the stack");
    await page.setViewportSize(WIDE);
    await page.clock.setFixedTime(new Date("2026-11-16T12:00:00+05:30"));
    await open(page);
    const edit = page.locator("#edit");
    await edit.evaluate((element) => element.scrollIntoView());
    await page.locator('.edit-clip[data-clip="truechip"]').focus();
    // The playhead springs to the clip first.
    await page.waitForTimeout(900);
    await page.keyboard.press(" ");
    await expect(edit).toHaveAttribute("data-playing", "");
    await page.keyboard.press(" ");
    await expect(edit).not.toHaveAttribute("data-playing");
    await page.keyboard.press("l");
    await expect(edit).toHaveAttribute("data-playing", "");
    await page.keyboard.press("k");
    await expect(edit).not.toHaveAttribute("data-playing");
    await page.keyboard.press("j");
    await expect(edit).toHaveAttribute("data-playing", "");
    await page.keyboard.press("k");
    await expect(edit).not.toHaveAttribute("data-playing");
  });
});

test.describe("research", () => {
  test("[surprise:clear-skies] the forecast's handle all the way right clears the sky, and the Island says so once a session", async ({ page, isMobile }) => {
    test.skip(isMobile, "Phones step through the forecast");
    await page.setViewportSize(WIDE);
    await open(page);
    // Halfway through the haze's chapter, where the handle is the visitor's to take.
    await page.locator("#research .chapter").nth(1).evaluate((element) => {
      const stage = element.querySelector<HTMLElement>(".chapter-stage")!;
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.round(top + ((element as HTMLElement).offsetHeight - stage.offsetHeight) * 0.5));
    });
    await expect(page.locator("#research[data-research-ready]")).toBeAttached();
    const scene = page.locator("#research .haze-scene").first();
    const handle = page.locator("#research .haze-handle").first();
    const density = () => scene.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--density"));
    await handle.focus();
    await page.keyboard.press("End");
    await expect(scene).toHaveAttribute("data-clear", "");
    expect(await density()).toBe("0");
    await expect(said(page, words.clearSkies)).toBeVisible();
    // Off the end, the forecast's haze is back; at the end again, the sky clears, quietly.
    await page.keyboard.press("Home");
    await expect(scene).not.toHaveAttribute("data-clear");
    await expect(said(page, words.clearSkies)).toHaveCount(0, { timeout: 6000 });
    await page.keyboard.press("End");
    await expect(scene).toHaveAttribute("data-clear", "");
    expect(await density()).toBe("0");
    await page.waitForTimeout(600);
    await expect(said(page, words.clearSkies)).toHaveCount(0);
  });
});

test.describe("skills", () => {
  test("[surprise:core-ripple] the chip's die ripples its cores", async ({ page }) => {
    await open(page);
    await toSection(page, "skills", "data-skills-ready");
    const die = page.locator("[data-chip-die]");
    await expect(die).toHaveAccessibleName(content.copy.skills.chip.cores);
    await die.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.locator("#chip")).toHaveAttribute("data-ripple", "");
  });

  test("[surprise:show-me-where] choosing a skill lights up what uses it, and the Island offers the jump", async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize(WIDE);
    await open(page);
    await toSection(page, "skills", "data-skills-ready");
    const skill = page.locator('.specs-skill[data-skill="next-js"]');
    if (isMobile) await skill.tap();
    else await skill.click();
    await expect(html(page)).toHaveAttribute("data-show-me", "next-js");
    await expect(page.locator('[data-evidence-id="role:ey"]')).toHaveAttribute("data-match", "");
    await expect(page.locator(".island-activity-action")).toHaveText(/^Jump to Ernst & Young \(EY\)/);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-match]")).toHaveCount(0);
  });
});

test.describe("credentials", () => {
  test("[surprise:medal-glint] a hard flick spins a medal fast and throws a glint, which fades", async ({ browser, browserName }) => {
    test.skip(browserName !== "webkit", "WebKit has the GPU here; headless Chromium is software-rendered and gets the stills");
    const context = await browser.newContext({ viewport: WIDE });
    await context.addInitScript(() => sessionStorage.setItem("classyfolio:tier-override", "HIGH"));
    const page = await context.newPage();
    await open(page);
    // Approached from above, the 3D takes over while the medals are off screen and the page is still.
    await page.locator(".skills-specs-link").evaluate((element) => element.scrollIntoView({ block: "end" }));
    const medal = page.locator(`#medal-${honors[0].id}`);
    await expect(medal).toHaveAttribute("data-scene", "3d", { timeout: 20_000 });
    await toSection(page, "credentials", "data-credentials-ready");
    await medal.scrollIntoViewIfNeeded();
    const glinted = await watch(page, `#medal-${honors[0].id}`, "data-glint");
    const box = (await medal.locator(".medal-turn").boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.1, y);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(box.x + box.width * (0.1 + i * 0.2), y);
    await page.mouse.up();
    await expect.poll(glinted).toBe(true);
    await expect(medal).not.toHaveAttribute("data-glint", { timeout: 3000 });
    await expect(medal).not.toHaveAttribute("data-spinning", "", { timeout: 8000 });
    await context.close();
  });
});

test.describe("contact", () => {
  test("[surprise:dock-bounce] opening an app from the dock bounces it, and leaves the dot under it", async ({ page, context, browserName, isMobile }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page);
    await toSection(page, "contact", "data-contact-ready");
    const email = page.locator('#contact .dock-item[data-app="email"]');
    const bounced = await watch(page, '#contact .dock-item[data-app="email"]', "data-launch");
    if (isMobile) await email.tap();
    else await email.click();
    await expect.poll(bounced).toBe(true);
    await expect(email).toHaveAttribute("data-open", "");
  });

  test("[surprise:delivered] a message sent says Delivered under it", async ({ page, context }) => {
    await isolate(context);
    await open(page);
    await toSection(page, "contact", "data-contact-ready");
    await page.locator("#composer-name").fill("Ada Lovelace");
    await page.locator("#composer-email").fill(`ada.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`);
    await page.locator("#composer-message").fill("I found the receipt.");
    await page.locator(".composer-send").click();
    await expect(page.locator(".thread-messages .receipt")).toHaveText(content.copy.contact.thread.delivered);
  });
});

test.describe("Search's secret commands", () => {
  test("[surprise:command-hello] hello: the Island answers", async ({ page, isMobile }) => {
    await open(page);
    await command(page, isMobile, commands.hello.phrase, commands.hello.label);
    await expect(said(page, commands.hello.answer)).toBeVisible();
  });

  test("[surprise:command-941] 9:41: every clock on the site shows 9:41 for five seconds", async ({ page, isMobile }) => {
    await page.clock.setFixedTime(AFTERNOON);
    await open(page);
    // Every clock there is: the glance's Local time and the close's. The first screen has
    // none (Part 18).
    await toSection(page, "contact", "data-contact-ready");
    const clocks = [page.locator('[data-tile="time"]'), page.locator(".contact-clock-line").first()];
    for (const clock of clocks) await expect(clock).toContainText("3:30");
    await command(page, isMobile, commands.nineFortyOne.phrase, commands.nineFortyOne.label);
    for (const clock of clocks) await expect(clock).toContainText("9:41");
    await expect(said(page, commands.nineFortyOne.answer)).toBeVisible();
    // Then time goes on.
    for (const clock of clocks) await expect(clock).toContainText("3:30", { timeout: 8000 });
  });

  test("[surprise:command-sudo] sudo hire akshat: permission granted, then Contact", async ({ page, isMobile }) => {
    await open(page);
    await command(page, isMobile, commands.sudo.phrase, commands.sudo.label);
    await expect(said(page, commands.sudo.answer)).toBeVisible();
    await expect(page.locator("#contact-title")).toBeInViewport({ timeout: 6000 });
  });

  test("[surprise:command-compare] compare opens /compare", async ({ page, isMobile }) => {
    await open(page);
    await command(page, isMobile, commands.compare.phrase, commands.compare.label);
    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.locator("#compare-title")).toHaveText(words.compare.headline);
  });

  test("[surprise:command-retro] retro opens the RETROGRADE edition, once content has its address", async ({ page, isMobile }) => {
    const retro = content.profile.links.retrograde;
    await open(page);
    if (!retro) {
      // Until then, Search doesn't know the word: the secrets are loaded, and it isn't one.
      await openSearch(page, isMobile);
      await field(page).fill(commands.hello.phrase);
      await expect(dialog(page).locator('[role=option][aria-selected="true"]')).toContainText(commands.hello.label);
      await field(page).fill(commands.retro.phrase);
      await expect(dialog(page).getByRole("option", { name: new RegExp(commands.retro.label) })).toHaveCount(0);
      const payload = (await (await page.request.get("/search-index.json")).json()) as { secrets: { id: string }[] };
      expect(payload.secrets.map((secret) => secret.id)).not.toContain("command-retro");
      return;
    }
    await page.context().route(`${retro}**`, (route) => route.fulfill({ status: 200, body: "RETROGRADE" }));
    const edition = page.waitForEvent("popup");
    await command(page, isMobile, commands.retro.phrase, commands.retro.label);
    expect((await edition).url()).toContain(retro);
  });

  test("[surprise:command-clarity] clarity: a ripple of focus spreads from the pointer, then it's gone", async ({ page, isMobile }) => {
    await open(page);
    if (!isMobile) await page.mouse.move(400, 450);
    // The ripple's radius, every frame it's there.
    await page.evaluate(() => {
      const record = window as unknown as { __ripple: number[] };
      record.__ripple = [];
      new MutationObserver((changes) => {
        for (const change of changes)
          for (const node of change.addedNodes) {
            if (!(node instanceof HTMLElement) || !node.classList.contains("clarity")) continue;
            const tick = () => {
              if (!node.isConnected) return;
              record.__ripple.push(Number.parseFloat(node.style.getPropertyValue("--r")) || 0);
              requestAnimationFrame(tick);
            };
            tick();
          }
      }).observe(document.body, { childList: true });
    });
    await command(page, isMobile, commands.clarity.phrase, commands.clarity.label);
    const ripple = page.locator(".clarity");
    await expect(ripple).toHaveCount(1);
    // Never in the way: the page under it still takes every click, and it's nothing to assistive tech.
    await expect(ripple).toHaveCSS("pointer-events", "none");
    await expect(ripple).toHaveAttribute("aria-hidden", "true");
    await expect(ripple).toHaveCount(0, { timeout: 4000 });
    const radii = await page.evaluate(() => (window as unknown as { __ripple: number[] }).__ripple);
    expect(radii.length).toBeGreaterThan(3);
    expect(radii.at(-1)!).toBeGreaterThan(radii[0]);
  });
});

test.describe("the page modes, on a keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "Single keys; phones open both from Search");
  test.use({ viewport: WIDE });

  test("[surprise:design-grid] G lays the grid over the page: 12 columns, the 8pt baseline, the breakpoints labeled", async ({ page }) => {
    await open(page);
    await ready(page);
    await page.keyboard.press("g");
    const overlay = page.getByTestId("grid-overlay");
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveCSS("pointer-events", "none");
    await expect(overlay.locator(".grid-overlay-column:visible")).toHaveCount(12);
    await expect(overlay.locator(".grid-overlay-baseline")).toBeVisible();
    await expect(overlay.locator(".grid-overlay-mark")).toHaveText(["734", "1068", "1440"]);
    // Each mark's dashed edge is where a window that wide would end.
    for (const mark of [734, 1068, 1440]) {
      const box = (await overlay.locator(`[data-mark="${mark}"]`).boundingBox())!;
      expect(Math.round(box.x + box.width), String(mark)).toBe(mark);
    }
    await expect(overlay.locator(".grid-overlay-legend")).toHaveText("12 columns · 24px gutters · 8pt baseline · 1440px");
    await page.keyboard.press("g");
    await expect(overlay).toHaveCount(0);
  });

  test("[surprise:focus-mode] F dims and softens everything but the section under the pointer or the focus; F or Esc leaves", async ({ page }) => {
    await open(page);
    await ready(page);
    // The edge between At a glance and Experience in the middle of the window.
    await page.locator("#experience").evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 450));
    await page.mouse.move(720, 700, { steps: 3 });
    await page.keyboard.press("f");
    await expect(html(page)).toHaveAttribute("data-focus-mode", "");
    const under = (y: number) => page.evaluate((at) => document.elementFromPoint(720, at)?.closest("[data-section]")?.id ?? "", y);
    const focused = page.locator("[data-section][data-focused]");
    await page.mouse.move(720, 710, { steps: 2 });
    await expect(focused).toHaveCount(1);
    await expect(focused).toHaveId(await under(710));
    // The rest is dimmed and softened.
    const rest = page.locator("[data-section]:not([data-focused])").first();
    await expect(rest).toHaveCSS("filter", /blur/);
    await expect.poll(() => rest.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(1);
    // The pointer moves it.
    await page.mouse.move(720, 150, { steps: 3 });
    await expect(focused).toHaveId(await under(150));
    // So does the keyboard's focus.
    const email = page.locator('#contact .dock-item[data-app="email"]');
    await email.focus();
    await expect(focused).toHaveId("contact");
    // (An Escape in the dock puts its label away first, so leave the dock before trying Esc.)
    await email.blur();
    await page.keyboard.press("f");
    await expect(html(page)).not.toHaveAttribute("data-focus-mode");
    await expect(page.locator("[data-focused]")).toHaveCount(0);
    await page.keyboard.press("f");
    await expect(html(page)).toHaveAttribute("data-focus-mode", "");
    await page.keyboard.press("Escape");
    await expect(html(page)).not.toHaveAttribute("data-focus-mode");
  });
});

test.describe("the site's own", () => {
  test("[surprise:resume-edition] printing makes a one-page résumé, on A4 and on Letter, with no phone number", async ({ page, browserName }) => {
    await open(page);
    await page.emulateMedia({ media: "print" });
    const resume = page.locator(".resume-edition");
    await expect(resume).toBeVisible();
    await expect(page.locator("#top")).toBeHidden();
    const text = await resume.innerText();
    for (const fact of [content.profile.name, content.profile.email, "linkedin.com/", "github.com/", "Manipal University Jaipur"]) expect(text).toContain(fact);
    for (const role of content.experience) expect(text).toContain(role.org);
    expect(findPhoneNumbers(text)).toEqual([]);
    // The QR code back to the site waits for its address.
    await expect(resume.locator(".resume-qr")).toHaveCount(content.profile.links.site ? 1 : 0);
    if (browserName !== "chromium") return;
    for (const format of ["A4", "Letter"] as const) {
      const pdf = await page.pdf({ format, printBackground: true });
      expect(pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)?.length, format).toBe(1);
    }
  });

  test("[surprise:console-hello] the console says hello once a session: the monogram, a greeting, GitHub and the email", async ({ page }) => {
    const logged: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "log") logged.push(message.text());
    });
    const hellos = () => logged.filter((text) => text.includes(words.console.greeting));
    await open(page);
    await expect.poll(() => hellos().length).toBe(1);
    const hello = hellos()[0];
    for (const part of [content.profile.initials, content.profile.links.github, content.profile.email]) expect(hello).toContain(part);
    expect(findPhoneNumbers(hello)).toEqual([]);
    // A reload is the same session: nothing more.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    expect(hellos()).toHaveLength(1);
  });

  test("[surprise:compare-page] /compare: Akshat's years side by side, a picker on each, from dated entries only", async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize(WIDE);
    const response = await page.goto("/compare");
    expect(response?.status()).toBe(200);
    await expect(page.locator("#compare-title")).toHaveText(words.compare.headline);
    // Phones compare the latest two years; wider screens all four.
    const pickers = page.locator(".compare-head .compare-slot:visible select");
    await expect(pickers.first()).toBeEnabled();
    const years = isMobile ? ["2025", "2026"] : ["2023", "2024", "2025", "2026"];
    await expect(pickers).toHaveCount(years.length);
    for (const [i, year] of years.entries()) await expect(pickers.nth(i)).toHaveValue(year);
    await expect(page.getByRole("rowheader")).toHaveText(Object.values(words.compare.rows));
    await expect(page.locator(".compare-footnote")).toHaveText(words.compare.footnote);
    // A picker swaps its column's year: in 2023 there were no internships yet.
    const internships = page.locator(".compare-row").nth(1).locator(".compare-cell:visible");
    await expect(internships.last()).toContainText("4");
    await pickers.last().selectOption("2023");
    await expect(pickers.last()).toHaveValue("2023");
    await expect(internships.last()).toHaveText(words.compare.none);
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(violations).toEqual([]);
  });

  test("[surprise:not-found] a page that isn't there is out of focus, and the button brings it into focus on the way home", async ({ page, isMobile }) => {
    const response = await page.goto("/a-page-that-isnt-here");
    expect(response?.status()).toBe(404);
    const main = page.locator("main.not-found");
    await expect(main).toHaveAttribute("data-blurred", "");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(words.notFound.headline);
    await expect(page.locator(".not-found-blur")).toHaveCSS("filter", /blur/);
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(violations).toEqual([]);
    const home = page.getByRole("link", { name: words.notFound.action });
    await expect(home).toHaveAttribute("href", "/");
    if (isMobile) await home.tap();
    else await home.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#top-title")).toBeVisible();
  });
});

test.describe("the colophon's things to find", () => {
  // Off: the Devanagari name. Waiting: "retro", until content has the edition's address.
  const findable = SURPRISES.filter((surprise) => surprise.on && (surprise.id !== "command-retro" || content.profile.links.retrograde));
  const things = content.copy.colophon.things;

  test("lists every surprise that's on, behind a spoiler that's closed until asked", async ({ page }) => {
    await page.goto("/colophon");
    await expect(page.locator("#things-title")).toHaveText(things.label);
    const spoiler = page.locator("details.things-spoiler");
    const toggle = page.locator(".things-toggle");
    await expect(spoiler).not.toHaveAttribute("open");
    await expect(toggle).toHaveText(things.show, { useInnerText: true });
    await expect(page.locator(".things-item").first()).toBeHidden();
    // A keyboard opens it, and closes it again.
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(spoiler).toHaveAttribute("open", "");
    await expect(toggle).toHaveText(things.hide, { useInnerText: true });
    const items = page.locator(".things-item");
    await expect(items).toHaveCount(findable.length);
    await expect(items.locator(".things-name")).toHaveText(findable.map((surprise) => things.items[surprise.id].name));
    await expect(items.locator(".things-find")).toHaveText(findable.map((surprise) => things.items[surprise.id].find));
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(violations).toEqual([]);
    await page.keyboard.press("Enter");
    await expect(spoiler).not.toHaveAttribute("open");
  });
});

test.describe("the rules every surprise keeps", () => {
  test("none steals focus or makes a sound", async ({ page, isMobile }) => {
    await page.addInitScript(() => {
      const record = window as unknown as { __sounds: number };
      record.__sounds = 0;
      const count = () => {
        record.__sounds += 1;
      };
      for (const name of ["AudioContext", "webkitAudioContext"] as const) {
        const Original = (window as unknown as Record<string, (new () => unknown) | undefined>)[name];
        if (!Original) continue;
        (window as unknown as Record<string, unknown>)[name] = class extends (Original as new () => object) {
          constructor() {
            super();
            count();
          }
        };
      }
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        if (!this.muted && this.volume > 0) count();
        return play.call(this);
      };
    });
    await open(page);
    // Through the whole page, every lazy part loaded, and a few surprises asked for.
    for (const [id, attribute] of [
      ["skills", "data-skills-ready"],
      ["credentials", "data-credentials-ready"],
      ["contact", "data-contact-ready"],
    ] as const)
      await toSection(page, id, attribute);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await command(page, isMobile, commands.hello.phrase, commands.hello.label);
    await command(page, isMobile, commands.clarity.phrase, commands.clarity.label);
    expect(await page.evaluate(() => (window as unknown as { __sounds: number }).__sounds)).toBe(0);
    await expect(page.locator("audio")).toHaveCount(0);
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("clarity is one soft pulse in place, with nothing traveling", async ({ page, isMobile }) => {
    await open(page);
    await command(page, isMobile, commands.clarity.phrase, commands.clarity.label);
    await expect(page.locator(".clarity[data-still]")).toHaveCount(1);
    await expect(page.locator(".clarity")).toHaveCount(0, { timeout: 3000 });
  });

  test("the dock's apps open without bouncing", async ({ page, context, browserName, isMobile }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page);
    await toSection(page, "contact", "data-contact-ready");
    const email = page.locator('#contact .dock-item[data-app="email"]');
    const bounced = await watch(page, '#contact .dock-item[data-app="email"]', "data-launch");
    if (isMobile) await email.tap();
    else await email.click();
    await expect(email).toHaveAttribute("data-open", "");
    expect(await bounced()).toBe(false);
  });

  test("focus mode dims at once, and the 404 comes into focus at once on the way home", async ({ page, isMobile }) => {
    await open(page);
    if (!isMobile) {
      await ready(page);
      await page.keyboard.press("f");
      await expect(html(page)).toHaveAttribute("data-focus-mode", "");
      expect(await page.locator("#top").evaluate((element) => getComputedStyle(element).transitionDuration)).toMatch(/^0s/);
      await page.keyboard.press("Escape");
    }
    await page.goto("/a-page-that-isnt-here");
    const home = page.getByRole("link", { name: words.notFound.action });
    if (isMobile) await home.tap();
    else await home.click();
    await expect(page).toHaveURL(/\/$/, { timeout: 1500 });
  });
});
