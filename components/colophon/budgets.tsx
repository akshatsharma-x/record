import { Footnote } from "@/components/ui/type";
import { content, measurement } from "@/content";
import { caseStudies } from "@/content/derive";
import { BUDGETS, MEASURED_PAGES } from "@/lib/budgets";
import { formatIsoDate } from "@/lib/dates";
import { firstLoadFiles, gzipKb, routeFor } from "@/lib/first-load";

/**
 * Each page's first-load JavaScript, counted once from the build this page is prerendered
 * in (lib/first-load.ts), or null where there's no build to count (`next dev` before one).
 */
const LOADS = firstLoadFiles();
const firstLoad = (page: string) => {
  const route = LOADS ? routeFor(page, LOADS.keys()) : null;
  return route ? gzipKb(LOADS!.get(route)!) : null;
};
const JAVASCRIPT = new Map(MEASURED_PAGES.map((page) => [page, firstLoad(page)]));

type Words = typeof content.copy.colophon.budgets;
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

/** A page's column head: the home page by name, a case study or a paper by its own. */
function pageName(path: string, words: Words): string {
  if (path === "/") return words.home;
  const study = caseStudies(content).find((entry) => entry.href === path);
  if (study) return study.name;
  return content.publications.find((paper) => `/research/${paper.slug}` === path)?.short ?? path;
}

interface Row {
  id: string;
  label: string;
  budget: string;
  cells: string[];
}

/**
 * DESIGN.md §10's budgets beside what was measured (Part 16): a row per budget, a column per
 * page Lighthouse CI measures. The JavaScript is this build's; Lighthouse's numbers are its
 * latest run, dated, and left out until there's been one.
 */
export function Budgets() {
  const words = content.copy.colophon.budgets;
  const kb = (value: number, digits = 1) => fill(words.units.kb, { value: value.toFixed(digits) });
  const seconds = (ms: number) => fill(words.units.seconds, { value: (ms / 1000).toFixed(1) });
  const score = (value: number) => String(Math.round(value * 100));
  const shift = (value: number) => String(Number(value.toFixed(3)));

  const rows: Row[] = [];
  const loads = MEASURED_PAGES.map((page) => JAVASCRIPT.get(page) ?? null);
  if (loads.every((value) => value !== null)) {
    rows.push({ id: "javascript", label: words.metrics.javascript, budget: kb(BUDGETS.firstLoadKb, 0), cells: loads.map((value) => kb(value!)) });
  }
  const runs = MEASURED_PAGES.map((page) => measurement?.pages.find((run) => run.path === page) ?? null);
  const measured = runs.every((run) => run !== null) ? runs.map((run) => run!) : null;
  if (measured) {
    const { lighthouse } = BUDGETS;
    rows.push(
      { id: "performance", label: words.metrics.performance, budget: score(lighthouse.performance), cells: measured.map((run) => score(run.performance)) },
      { id: "accessibility", label: words.metrics.accessibility, budget: score(lighthouse.accessibility), cells: measured.map((run) => score(run.accessibility)) },
      { id: "best-practices", label: words.metrics.bestPractices, budget: score(lighthouse["best-practices"]), cells: measured.map((run) => score(run.bestPractices)) },
      { id: "seo", label: words.metrics.seo, budget: score(lighthouse.seo), cells: measured.map((run) => score(run.seo)) },
      { id: "lcp", label: words.metrics.lcp, budget: seconds(BUDGETS.lcpMs), cells: measured.map((run) => seconds(run.lcpMs)) },
      { id: "cls", label: words.metrics.cls, budget: shift(BUDGETS.cls), cells: measured.map((run) => shift(run.cls)) },
    );
  }
  if (rows.length === 0) return null;

  const notes: string[] = [];
  if (rows[0].id === "javascript") notes.push(words.javascript);
  if (measured && measurement) {
    const { hostname } = new URL(measurement.origin);
    const values = { version: measurement.lighthouse, date: formatIsoDate(measurement.date), host: hostname };
    notes.push(fill(hostname === "localhost" ? words.measured.local : words.measured.live, values));
  }

  return (
    <div className="budgets">
      <h2 id="budgets-title" className="colophon-title">
        {words.label}
      </h2>
      <table className="budgets-table" aria-labelledby="budgets-title">
        <thead>
          <tr>
            <td />
            <th scope="col">{words.budget}</th>
            {MEASURED_PAGES.map((page) => (
              <th key={page} scope="col">
                {pageName(page, words)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-budget={row.id}>
              <th scope="row">{row.label}</th>
              <td className="budgets-budget">{row.budget}</td>
              {row.cells.map((cell, i) => (
                <td key={MEASURED_PAGES[i]}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {notes.map((note) => (
        <Footnote key={note}>{note}</Footnote>
      ))}
    </div>
  );
}
