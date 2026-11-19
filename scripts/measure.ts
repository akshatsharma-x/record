/**
 * Records the latest Lighthouse measurement for /colophon (DESIGN.md §10, Part 16). Lighthouse
 * CI runs each page three times (lighthouserc.json) and its filesystem target marks each
 * page's median run; this writes those runs into content/measured.ts, which the next build
 * states beside the budgets.
 *
 *   npm run measure        (a production build first: Lighthouse CI starts it, then this)
 *
 * Measured on localhost, it says so; to measure the live site, run Lighthouse CI against its
 * address (`npx lhci collect --url=https://…`, then `npx lhci upload`) and then this.
 *
 * Plain Node: erasable TypeScript, relative imports with extensions.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type MeasurementInput, parseMeasurement } from "../content/schema.ts";

/** An entry in Lighthouse CI's manifest.json (its filesystem target). */
export interface ManifestEntry {
  url: string;
  isRepresentativeRun: boolean;
  jsonPath: string;
}

/** The parts of a Lighthouse report this reads. */
export interface Report {
  lighthouseVersion: string;
  fetchTime: string;
  categories: Record<string, { score: number | null }>;
  audits: Record<string, { numericValue?: number }>;
}

const score = (report: Report, category: string) => {
  const value = report.categories[category]?.score;
  if (typeof value !== "number") throw new Error(`The report has no ${category} score: was the category left out?`);
  return value;
};

const numeric = (report: Report, audit: string) => {
  const value = report.audits[audit]?.numericValue;
  if (typeof value !== "number") throw new Error(`The report has no ${audit}.`);
  return value;
};

/** Each page's median run, as content/measured.ts records it; dated by the latest run. */
export function measurementOf(entries: ManifestEntry[], read: (file: string) => Report): MeasurementInput {
  const runs = entries.filter((entry) => entry.isRepresentativeRun).map((entry) => ({ url: new URL(entry.url), report: read(entry.jsonPath) }));
  if (runs.length === 0) throw new Error("Lighthouse CI's manifest has no runs: run `npx lhci autorun` first.");
  const origins = new Set(runs.map((run) => run.url.origin));
  if (origins.size > 1) throw new Error(`The runs are from more than one site: ${[...origins].join(", ")}.`);
  const latest = runs.map((run) => run.report.fetchTime).sort().at(-1)!;
  return {
    date: latest.slice(0, 10),
    lighthouse: runs[0].report.lighthouseVersion,
    origin: runs[0].url.origin,
    pages: runs.map(({ url, report }) => ({
      path: url.pathname,
      performance: score(report, "performance"),
      accessibility: score(report, "accessibility"),
      bestPractices: score(report, "best-practices"),
      seo: score(report, "seo"),
      lcpMs: Math.round(numeric(report, "largest-contentful-paint")),
      tbtMs: Math.round(numeric(report, "total-blocking-time")),
      cls: Math.round(numeric(report, "cumulative-layout-shift") * 1000) / 1000,
    })),
  };
}

/** content/measured.ts, for a measurement. */
export function sourceOf(measurement: MeasurementInput): string {
  const pages = measurement.pages
    .map(
      (page) =>
        `    { path: ${JSON.stringify(page.path)}, performance: ${page.performance}, accessibility: ${page.accessibility}, bestPractices: ${page.bestPractices}, seo: ${page.seo}, lcpMs: ${page.lcpMs}, tbtMs: ${page.tbtMs}, cls: ${page.cls} },`,
    )
    .join("\n");
  return `/**
 * The latest Lighthouse measurement, which /colophon states beside the budgets (DESIGN.md
 * §10). Written by scripts/measure.ts (\`npm run measure\`) from Lighthouse CI's reports:
 * don't edit it by hand. Checked by content/schema.ts, like data.ts.
 */
import type { MeasurementInput } from "./schema.ts";

export const measured: MeasurementInput | null = {
  date: ${JSON.stringify(measurement.date)},
  lighthouse: ${JSON.stringify(measurement.lighthouse)},
  origin: ${JSON.stringify(measurement.origin)},
  pages: [
${pages}
  ],
};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = path.join(process.cwd(), "reports", "lighthouse");
  const entries = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as ManifestEntry[];
  const measurement = measurementOf(entries, (file) => JSON.parse(readFileSync(path.resolve(dir, file), "utf8")) as Report);
  parseMeasurement(measurement);
  writeFileSync(path.join(process.cwd(), "content", "measured.ts"), sourceOf(measurement));
  const pages = measurement.pages.map((page) => `${page.path} ${Math.round(page.performance * 100)}`).join(", ");
  console.log(`measure: Lighthouse ${measurement.lighthouse} on ${measurement.date} at ${measurement.origin} (performance: ${pages})`);
}
