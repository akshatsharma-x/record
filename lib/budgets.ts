/**
 * DESIGN.md §10's budgets, in one place. size-limit (.size-limit.ts) and Lighthouse CI
 * (lighthouserc.json, held to these by tests/unit/budgets.test.ts) keep the site within them
 * on every pull request, and /colophon states them beside what was last measured.
 *
 * Plain Node too: erasable TypeScript, no imports.
 */
export const BUDGETS = {
  /** First-load JavaScript, in KB of gzip: a KB is 1,024 bytes, as every part has counted. */
  firstLoadKb: 170,
  /** Largest Contentful Paint, in milliseconds, on Lighthouse's phone under DevTools throttling. */
  lcpMs: 2000,
  /** Interaction to Next Paint, in milliseconds: measured in the field, never in the lab. */
  inpMs: 150,
  /** Cumulative Layout Shift. */
  cls: 0.05,
  /** Lighthouse's four scores, out of 1. */
  lighthouse: { performance: 0.95, accessibility: 1, "best-practices": 1, seo: 1 },
} as const;

/** Lighthouse's four categories, in the order it reports them. */
export const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;
export type Category = (typeof CATEGORIES)[number];

/** The pages Lighthouse CI measures: the home page, a case study and a paper (Part 16). */
export const MEASURED_PAGES = ["/", "/work/cognivault-ai", "/research/food-waste-cold-chain"] as const;
