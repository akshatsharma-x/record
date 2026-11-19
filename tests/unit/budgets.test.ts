import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { measured } from "@/content/measured";
import { parseMeasurement } from "@/content/schema";
import { BUDGETS, CATEGORIES, MEASURED_PAGES } from "@/lib/budgets";
import { routeFor, routeOf } from "@/lib/first-load";
import { type ManifestEntry, measurementOf, type Report, sourceOf } from "../../scripts/measure.ts";

/** DESIGN.md §10's budgets, held in CI (Part 16): one set of numbers, and what states them. */

const root = path.resolve(__dirname, "../..");
const rc = JSON.parse(readFileSync(path.join(root, "lighthouserc.json"), "utf8")) as {
  ci: {
    collect: { url: string[]; numberOfRuns: number; settings: { throttlingMethod: string; onlyCategories: string[] } };
    assert: { assertions: Record<string, [string, { minScore?: number; maxNumericValue?: number; aggregationMethod?: string }]> };
  };
};

describe("Lighthouse CI", () => {
  it("measures the pages the colophon names, three times each, as §10 measures: DevTools throttling", () => {
    expect(rc.ci.collect.url.map((url) => new URL(url).pathname)).toEqual([...MEASURED_PAGES]);
    expect(rc.ci.collect.numberOfRuns).toBe(3);
    expect(rc.ci.collect.settings.throttlingMethod).toBe("devtools");
    expect(rc.ci.collect.settings.onlyCategories).toEqual([...CATEGORIES]);
  });

  it("holds each page's median run to the budgets, and fails the run when one is missed", () => {
    const { assertions } = rc.ci.assert;
    for (const category of CATEGORIES) {
      expect(assertions[`categories:${category}`]).toEqual(["error", { minScore: BUDGETS.lighthouse[category], aggregationMethod: "median-run" }]);
    }
    expect(assertions["largest-contentful-paint"]).toEqual(["error", { maxNumericValue: BUDGETS.lcpMs, aggregationMethod: "median-run" }]);
    expect(assertions["cumulative-layout-shift"]).toEqual(["error", { maxNumericValue: BUDGETS.cls, aggregationMethod: "median-run" }]);
  });
});

describe("the measurement /colophon states", () => {
  it("covers every page Lighthouse CI measures, and passes content's schema", () => {
    const measurement = parseMeasurement(measured);
    if (measurement) expect(measurement.pages.map((page) => page.path)).toEqual([...MEASURED_PAGES]);
  });

  it("is exactly what scripts/measure.ts writes, so it's never edited by hand", () => {
    if (!measured) return;
    expect(readFileSync(path.join(root, "content", "measured.ts"), "utf8")).toBe(sourceOf(measured));
  });

  it("takes each page's median run, dated by the latest, and refuses runs from two sites", () => {
    const report = (score: number, fetchTime: string): Report => ({
      lighthouseVersion: "13.6.0",
      fetchTime,
      categories: { performance: { score }, accessibility: { score: 1 }, "best-practices": { score: 1 }, seo: { score: 1 } },
      audits: { "largest-contentful-paint": { numericValue: 1681.4 }, "total-blocking-time": { numericValue: 39.2 }, "cumulative-layout-shift": { numericValue: 0.01641 } },
    });
    const reports: Record<string, Report> = { a: report(0.97, "2026-11-19T04:15:49Z"), b: report(0.99, "2026-11-19T04:16:13Z"), c: report(1, "2026-11-20T01:00:00Z") };
    const entries: ManifestEntry[] = [
      { url: "http://localhost:3240/", isRepresentativeRun: false, jsonPath: "a" },
      { url: "http://localhost:3240/", isRepresentativeRun: true, jsonPath: "b" },
      { url: "http://localhost:3240/specs", isRepresentativeRun: true, jsonPath: "c" },
    ];
    const measurement = measurementOf(entries, (file) => reports[file]);
    expect(measurement).toEqual({
      date: "2026-11-20",
      lighthouse: "13.6.0",
      origin: "http://localhost:3240",
      pages: [
        { path: "/", performance: 0.99, accessibility: 1, bestPractices: 1, seo: 1, lcpMs: 1681, tbtMs: 39, cls: 0.016 },
        { path: "/specs", performance: 1, accessibility: 1, bestPractices: 1, seo: 1, lcpMs: 1681, tbtMs: 39, cls: 0.016 },
      ],
    });
    expect(parseMeasurement(measurement)).toEqual(measurement);
    expect(() => measurementOf([...entries, { url: "https://example.com/", isRepresentativeRun: true, jsonPath: "a" }], (file) => reports[file])).toThrow(/more than one site/);
  });
});

describe("first-load JavaScript's routes", () => {
  it("names a page's route as Next does: no slots or groups, interceptions kept", () => {
    expect(routeOf("/page")).toBe("/");
    expect(routeOf("/@modal/page")).toBe("/");
    expect(routeOf("/@modal/(.)work/[slug]/page")).toBe("/(.)work/[slug]");
    expect(routeOf("/(site)/specs/page")).toBe("/specs");
    expect(routeOf("/work/[slug]/page")).toBe("/work/[slug]");
  });

  it("finds an address's route: its own first, then a dynamic one, never an interception", () => {
    const routes = ["/", "/(.)work/[slug]", "/work/[slug]", "/work/archive", "/docs/[...path]"];
    expect(routeFor("/", routes)).toBe("/");
    expect(routeFor("/work/cognivault-ai", routes)).toBe("/work/[slug]");
    expect(routeFor("/work/archive", routes)).toBe("/work/archive");
    expect(routeFor("/docs/a/b", routes)).toBe("/docs/[...path]");
    expect(routeFor("/work/a/b", routes)).toBeNull();
    expect(routeFor("/nowhere", routes)).toBeNull();
  });
});
