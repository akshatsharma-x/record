/**
 * size-limit holds every route's first-load JavaScript to DESIGN.md §10's budget, after a
 * build: `npm run size`. The files are the ones `next build` counts (lib/first-load.ts),
 * compressed as the budget is stated, gzip; a KiB is the KB the budget means.
 */
import { BUDGETS } from "./lib/budgets.ts";
import { firstLoadFiles } from "./lib/first-load.ts";

const routes = firstLoadFiles();
if (!routes) throw new Error("size-limit measures a build: run `npm run build` first.");

export default [...routes].map(([route, files]) => ({
  name: `First-load JS on ${route}`,
  path: files,
  gzip: true,
  limit: `${BUDGETS.firstLoadKb} KiB`,
}));
