import { readFileSync } from "node:fs";
import path from "node:path";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { content, measurement } from "@/content";
import { caseStudies, research } from "@/content/derive";
import { BUDGETS, MEASURED_PAGES } from "@/lib/budgets";
import { firstLoadFiles, gzipKb, routeFor } from "@/lib/first-load";
import { findPhoneNumbers } from "@/lib/privacy";

/**
 * Fast, findable and live (DESIGN.md §10, §11; Part 16), on the production build: every
 * page's own metadata and share card, the sitemap, robots and the manifest, the JSON-LD,
 * the security headers and each page's own script policy, and the budgets as /colophon
 * states them.
 */

const PAGES = ["/", "/specs", "/compare", "/colophon", ...caseStudies(content).map((study) => study.href), ...research(content).map((paper) => paper.href)];

/** A page's head, as a crawler or a link preview reads it: no scripts run. */
async function head(request: APIRequestContext, page: string) {
  const html = await (await request.get(page)).text();
  const meta = (key: string) => new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1] ?? null;
  const attribute = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
  const links = (rel: string) =>
    [...html.matchAll(/<link\b[^>]*>/g)]
      .map((match) => match[0])
      .filter((tag) => attribute(tag, "rel") === rel)
      .map((tag) => ({ href: attribute(tag, "href")!, sizes: attribute(tag, "sizes") }));
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? null;
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  return { html, meta, links, title, jsonLd };
}

/** Where an absolute URL the build wrote points on the server under test. */
const local = (url: string) => {
  const parsed = new URL(url, "http://localhost");
  return parsed.pathname + parsed.search;
};

/** A PNG's width and height, from its header. */
async function png(request: APIRequestContext, url: string) {
  const response = await request.get(local(url));
  expect(response.status(), url).toBe(200);
  expect(response.headers()["content-type"], url).toBe("image/png");
  const bytes = await response.body();
  expect(bytes.subarray(1, 4).toString("latin1"), url).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test.describe("findable", () => {
  // A crawler's view: requests only, so once is enough.
  test.skip(({ browserName, isMobile }) => browserName !== "webkit" || isMobile, "Requests, not rendering");

  test("every page has its own title, description, canonical address and share card", async ({ request }) => {
    const titles = new Set<string>();
    for (const page of PAGES) {
      const { meta, links, title } = await head(request, page);
      expect(title, page).toBeTruthy();
      titles.add(title!);
      expect(meta("description"), page).toBeTruthy();
      const canonical = links("canonical");
      expect(canonical, page).toHaveLength(1);
      expect(new URL(canonical[0].href).pathname, page).toBe(page);
      expect(new URL(meta("og:url")!).pathname, page).toBe(page);
      expect(meta("twitter:card"), page).toBe("summary_large_image");
      // The card is the page's own, at the size a preview asks for.
      const card = meta("og:image")!;
      expect(new URL(card).pathname.startsWith(page === "/" ? "/opengraph-image" : `${page}/opengraph-image`), page).toBe(true);
      expect(meta("og:image:alt"), page).toBeTruthy();
      expect(await png(request, card), page).toEqual({ width: 1200, height: 630 });
    }
    expect(titles.size).toBe(PAGES.length);
  });

  test("the monogram is the icon at every size a browser or a home screen asks for", async ({ request }) => {
    const { links } = await head(request, "/");
    const icons = [...links("icon"), ...links("apple-touch-icon")];
    expect(icons.map((icon) => icon.sizes)).toEqual(["32x32", "192x192", "512x512", "180x180"]);
    for (const icon of icons) {
      const side = Number(icon.sizes!.split("x")[0]);
      expect(await png(request, icon.href), icon.href).toEqual({ width: side, height: side });
    }
    // Next's default favicon is gone; nothing answers for it with someone else's mark.
    expect((await request.get("/favicon.ico")).status()).toBe(404);
  });

  test("the sitemap lists every page, robots points at it, and the manifest names the site", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
    expect(listed.sort()).toEqual([...PAGES].sort());

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(/^Disallow: \/api\/$/m);
    expect(new URL(/^Sitemap: (.+)$/m.exec(robots)![1]).pathname).toBe("/sitemap.xml");

    const manifest = (await (await request.get("/manifest.webmanifest")).json()) as { name: string; icons: { src: string; sizes: string }[] };
    expect(manifest.name).toBe(content.profile.name);
    for (const icon of manifest.icons) {
      const side = Number(icon.sizes.split("x")[0]);
      expect(await png(request, icon.src), icon.src).toEqual({ width: side, height: side });
    }
  });

  test("JSON-LD says who and what: a Person, each project a CreativeWork, each paper a ScholarlyArticle, never a telephone", async ({ request }) => {
    const types = new Map<string, string[]>();
    for (const page of PAGES) {
      const { jsonLd } = await head(request, page);
      types.set(page, jsonLd.map((text) => (JSON.parse(text) as { "@type": string })["@type"]));
      for (const text of jsonLd) {
        expect(text, page).not.toContain("telephone");
        expect(findPhoneNumbers(text), page).toEqual([]);
      }
    }
    expect(types.get("/")).toContain("Person");
    for (const study of caseStudies(content)) expect(types.get(study.href)).toContain("CreativeWork");
    for (const paper of research(content)) expect(types.get(paper.href)).toContain("ScholarlyArticle");
    const person = JSON.parse((await head(request, "/")).jsonLd.find((text) => text.includes('"Person"'))!) as Record<string, unknown>;
    expect(person).toMatchObject({ name: content.profile.name, jobTitle: content.experience.find((role) => role.end === "present")!.role, sameAs: [content.profile.links.linkedin, content.profile.links.github] });
  });
});

test.describe("secure", () => {
  test("every response carries the security headers", async ({ request }) => {
    for (const page of ["/", "/work/cognivault-ai", "/sitemap.xml"]) {
      const headers = (await request.get(page)).headers();
      expect(headers["content-security-policy"], page).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"], page).toContain("object-src 'none'");
      expect(headers["x-content-type-options"], page).toBe("nosniff");
      expect(headers["referrer-policy"], page).toBe("strict-origin-when-cross-origin");
      expect(headers["x-frame-options"], page).toBe("DENY");
      expect(headers["cross-origin-opener-policy"], page).toBe("same-origin");
      expect(headers["permissions-policy"], page).toContain("camera=()");
      expect(headers["strict-transport-security"], page).toMatch(/max-age=\d+/);
    }
  });

  /**
   * Watches a page for script-policy violations, from before its first script, and for
   * anything it fetches from another origin. Each navigation starts a new count.
   */
  async function watch(page: Page, origin: string) {
    const elsewhere: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["data:", "blob:"].includes(url.protocol) && url.origin !== origin) elsewhere.push(request.url());
    });
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { violations: string[] }).violations = seen;
      document.addEventListener("securitypolicyviolation", (event) => seen.push(`${event.effectiveDirective} ${event.blockedURI}`));
    });
    return { elsewhere, violations: () => page.evaluate(() => (window as unknown as { violations: string[] }).violations) };
  }

  test("each page runs only its own scripts, and fetches nothing from anywhere else", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const { elsewhere, violations } = await watch(page, new URL(baseURL!).origin);
    for (const route of PAGES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      // Hydrated: the Island measured itself, which only its script does.
      await page.locator(".island-shell[data-measured]").waitFor();
      const meta = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
      expect(meta, route).toMatch(/^script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+$/);
      expect(await violations(), route).toEqual([]);
    }
    expect(elsewhere).toEqual([]);
  });

  test("a script someone slips into the page doesn't run", async ({ page, baseURL }) => {
    const { violations } = await watch(page, new URL(baseURL!).origin);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.injected = true";
      document.head.append(script);
      const trap = document.createElement("img");
      trap.setAttribute("onerror", "window.handled = true");
      trap.src = "data:,broken";
      document.body.append(trap);
    });
    await expect.poll(async () => (await violations()).length).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(() => ({ injected: "injected" in window, handled: "handled" in window }))).toEqual({ injected: false, handled: false });
  });
});

test.describe("within budget", () => {
  test.skip(({ browserName, isMobile }) => browserName !== "webkit" || isMobile, "The build's files, read once");

  test("first-load JavaScript is counted as Next counts it, and every page is within the budget", () => {
    const routes = firstLoadFiles()!;
    const stats = JSON.parse(readFileSync(path.join(process.cwd(), ".next", "diagnostics", "route-bundle-stats.json"), "utf8")) as { route: string; firstLoadChunkPaths: string[] }[];
    for (const { route, firstLoadChunkPaths } of stats) {
      expect(new Set(routes.get(route)), route).toEqual(new Set(firstLoadChunkPaths.map((file) => path.resolve(file))));
      expect(gzipKb(routes.get(route)!), route).toBeLessThanOrEqual(BUDGETS.firstLoadKb);
    }
  });

  test("/colophon states this build's JavaScript and Lighthouse's latest measurement", async ({ page }) => {
    await page.goto("/colophon");
    const routes = firstLoadFiles()!;
    const cells = (row: string) => page.locator(`.budgets-table tr[data-budget="${row}"] td:not(.budgets-budget)`).allTextContents();
    expect(await cells("javascript")).toEqual(MEASURED_PAGES.map((route) => `${gzipKb(routes.get(routeFor(route, routes.keys())!)!).toFixed(1)} KB`));
    if (measurement) {
      expect(await cells("performance")).toEqual(MEASURED_PAGES.map((route) => String(Math.round(measurement!.pages.find((run) => run.path === route)!.performance * 100))));
      await expect(page.locator(".budgets")).toContainText(`Lighthouse ${measurement.lighthouse}`);
    }
  });
});
