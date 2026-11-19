/**
 * First-load JavaScript (DESIGN.md §10), per route, counted as `next build` counts it: every
 * chunk the route's segments need (its client manifest's entry files) and the ones every
 * page shares (the build manifest's root files). Next writes that count to
 * .next/diagnostics/route-bundle-stats.json only once the pages are prerendered, too late
 * for /colophon, which states the home page's from the build it's part of; so this reads the
 * manifests the compiler wrote before. size-limit (.size-limit.ts) holds every route to the
 * budget, and tests/e2e/findable.spec.ts checks that this count is Next's.
 *
 *   node lib/first-load.ts         (each route's, after a build)
 *
 * Plain Node too: erasable TypeScript, node: imports only.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";

type ClientManifest = Record<string, { entryJSFiles?: Record<string, string[]> } | undefined>;

/** A page's route as Next names it: no slots (`@modal`) or groups (`(site)`); `(.)` stays. */
export function routeOf(page: string): string {
  const segments = page.split("/").filter((segment) => segment && !segment.startsWith("@") && !/^\([^.)][^)]*\)$/.test(segment));
  segments.pop();
  return `/${segments.join("/")}`;
}

/**
 * Each route's first-load scripts, as absolute paths, or null without a build. Next's own
 * global-error page is left out, as Next leaves it out; a route's slots share its chunks, so
 * like Next this counts its first page.
 */
export function firstLoadFiles(root = process.cwd()): Map<string, string[]> | null {
  const dir = path.join(root, ".next");
  const build = path.join(dir, "build-manifest.json");
  const pages = path.join(dir, "server", "app-paths-manifest.json");
  if (!existsSync(build) || !existsSync(pages)) return null;
  const { rootMainFiles = [] } = JSON.parse(readFileSync(build, "utf8")) as { rootMainFiles?: string[] };
  const routes = new Map<string, string[]>();
  for (const page of Object.keys(JSON.parse(readFileSync(pages, "utf8")) as Record<string, string>)) {
    if (!page.endsWith("/page") || page.startsWith("/_global-error/")) continue;
    const route = routeOf(page);
    const client = path.join(dir, "server", "app", `${page}_client-reference-manifest.js`);
    if (routes.has(route) || !existsSync(client)) continue;
    // The client manifest is a script that fills in a global: run it in a sandbox to read it.
    const sandbox: { globalThis?: unknown; __RSC_MANIFEST: ClientManifest } = { __RSC_MANIFEST: {} };
    sandbox.globalThis = sandbox;
    runInNewContext(readFileSync(client, "utf8"), sandbox);
    const entries = (sandbox.__RSC_MANIFEST[page] ?? sandbox.__RSC_MANIFEST[route])?.entryJSFiles ?? {};
    const files = [...new Set([...Object.values(entries).flat(), ...rootMainFiles])].filter((file) => file.endsWith(".js"));
    routes.set(route, files.map((file) => path.join(dir, file)));
  }
  return routes;
}

/**
 * The route an address belongs to, from the routes a build has: "/work/cognivault-ai" is
 * "/work/[slug]"'s. A route of its own wins over a dynamic one; an interception, `(.)`,
 * belongs to a soft navigation, never to an address.
 */
export function routeFor(pathname: string, routes: Iterable<string>): string | null {
  const candidates = [...routes].filter((route) => !route.includes("(."));
  if (candidates.includes(pathname)) return pathname;
  // Segment by segment: `[slug]` is one segment, `[...slug]` the rest, anything else itself.
  const segment = (part: string) => (part.startsWith("[...") ? ".+" : part.startsWith("[") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = (route: string) => new RegExp(`^${route.split("/").map(segment).join("/")}$`);
  return candidates.find((route) => route.includes("[") && pattern(route).test(pathname)) ?? null;
}

/** Files' total size in KB of gzip, at level 9 as size-limit compresses, to a tenth. */
export function gzipKb(files: string[]): number {
  const bytes = files.reduce((sum, file) => sum + gzipSync(readFileSync(file), { level: 9 }).length, 0);
  return Math.round((bytes / 1024) * 10) / 10;
}

/** A route's first-load JavaScript, in KB of gzip, or null without a build. */
export function firstLoadKb(route = "/", root = process.cwd()): number | null {
  const files = firstLoadFiles(root)?.get(route);
  return files ? gzipKb(files) : null;
}

// Run as a script (not imported): Playwright's specs import this as CommonJS, so no import.meta.
if (process.argv[1]?.endsWith(`${path.sep}lib${path.sep}first-load.ts`)) {
  const routes = firstLoadFiles();
  if (!routes) console.log("No build to measure: run next build first.");
  else for (const [route, files] of routes) console.log(`${gzipKb(files).toFixed(1).padStart(7)} KB  ${route}`);
}
