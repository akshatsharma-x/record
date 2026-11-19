/**
 * The latest Lighthouse measurement, which /colophon states beside the budgets (DESIGN.md
 * §10). Written by scripts/measure.ts (`npm run measure`) from Lighthouse CI's reports:
 * don't edit it by hand. Checked by content/schema.ts, like data.ts.
 */
import type { MeasurementInput } from "./schema.ts";

export const measured: MeasurementInput | null = {
  date: "2026-11-19",
  lighthouse: "13.6.0",
  origin: "http://localhost:3240",
  pages: [
    { path: "/", performance: 0.99, accessibility: 1, bestPractices: 1, seo: 1, lcpMs: 1681, tbtMs: 39, cls: 0 },
    { path: "/work/cognivault-ai", performance: 1, accessibility: 1, bestPractices: 1, seo: 1, lcpMs: 1537, tbtMs: 15, cls: 0 },
    { path: "/research/food-waste-cold-chain", performance: 0.99, accessibility: 1, bestPractices: 1, seo: 1, lcpMs: 1557, tbtMs: 30, cls: 0.016 },
  ],
};
