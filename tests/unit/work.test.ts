/**
 * Work (DESIGN.md §7.6): the bento's packing under every filter, the case studies, their
 * architecture diagrams, and the schema's checks that every word and figure in them comes
 * from the project's own text.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { data } from "@/content/data";
import { caseStudies, work } from "@/content/derive";
import { ContentSchema, ungroundedWords } from "@/content/schema";
import { apart, DIAGRAM, layout, lines, steps } from "@/lib/architecture";
import { fillsExactly, pack, sizes } from "@/lib/bento";
import { springAt, springs } from "@/lib/motion";
import { atRest, springFrom } from "@/lib/work";

const { filters, tiles } = work(content);
const studies = caseStudies(content);
const study = (slug: string) => studies.find((entry) => entry.slug === slug)!;

/** The content with one change at a path, as an editor might make it. */
function broken(path: (string | number)[], value: unknown) {
  const copy = structuredClone(data) as Record<string, unknown>;
  let at: Record<string | number, unknown> = copy;
  for (const key of path.slice(0, -1)) at = at[key] as Record<string | number, unknown>;
  at[path.at(-1)!] = value;
  const result = ContentSchema.safeParse(copy);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

describe("the bento", () => {
  it("packs any number of tiles with no holes, on desktop and on tablets", () => {
    for (let count = 1; count <= 9; count++) {
      for (const flagship of [true, false]) {
        for (const breakpoint of ["lg", "md"] as const) {
          expect(fillsExactly(pack(sizes(count, flagship, breakpoint))), `${count} tiles, ${breakpoint}`).toBe(true);
        }
      }
    }
  });

  it("starts with the brief's spans: Cognivault 8×2, QuizMUJ 4×2, then three 4×1", () => {
    const all = tiles.map((tile) => [tile.slug, tile.places.all.lg.span, tile.places.all.lg.rows]);
    expect(all).toEqual([
      ["cognivault-ai", 8, 2],
      ["quizmuj", 4, 2],
      ["resume-screening", 4, 1],
      ["churn-prediction", 4, 1],
      ["wcag-analyzer", 4, 1],
    ]);
  });

  it("packs every filter state with no holes, the flagship large wherever it shows", () => {
    for (const filter of filters) {
      const shown = tiles.filter((tile) => tile.places[filter.id]);
      expect(shown.length, filter.id).toBeGreaterThan(0);
      for (const breakpoint of ["lg", "md"] as const) {
        expect(fillsExactly(shown.map((tile) => tile.places[filter.id][breakpoint])), `${filter.id} ${breakpoint}`).toBe(true);
      }
      const flagship = shown.find((tile) => tile.slug === "cognivault-ai");
      if (flagship) expect(flagship.places[filter.id].lg).toMatchObject({ span: 8, rows: 2 });
    }
  });

  it("has CSS for every filter's place and visibility, by its position in the control", () => {
    const css = readFileSync(path.join(process.cwd(), "styles", "components.css"), "utf8");
    // The segmented control holds at most six segments, and so does the bento's CSS.
    expect(filters.length).toBeLessThanOrEqual(6);
    for (let n = 1; n <= 6; n++) {
      const checked = `.work:has(.work-filter > label:nth-of-type(${n}) > input:checked)`;
      expect(css, `filter ${n} hides`).toContain(`${checked} .work-tile:not([data-in~="${n}"])`);
      expect(css, `filter ${n} places`).toContain(`${checked} .work-tile {\n      grid-area: var(--md${n});`);
      expect(css, `filter ${n} places`).toContain(`${checked} .work-tile {\n      grid-area: var(--lg${n});`);
    }
  });

  it("filters by category, as the brief names them", () => {
    expect(filters.map((filter) => filter.label)).toEqual(["All", "AI", "Full-stack", "ML", "Accessibility"]);
    const under = (id: string) => tiles.filter((tile) => tile.filters.includes(id)).map((tile) => tile.slug);
    expect(under("all")).toHaveLength(5);
    expect(under("ai")).toEqual(["cognivault-ai", "resume-screening"]);
    expect(under("full-stack")).toEqual(["quizmuj"]);
    expect(under("ml")).toEqual(["resume-screening", "churn-prediction"]);
    expect(under("accessibility")).toEqual(["wcag-analyzer"]);
  });

  it("gives a tile its top metric as stated, and a preview's figures in its own words", () => {
    const churn = tiles.find((tile) => tile.slug === "churn-prediction")!;
    expect(churn.metric).toMatchObject({ token: "97%", label: "accuracy", footnotes: [5] });
    expect(churn.preview).toMatchObject({ kind: "roc", aucLabel: "0.98", aucName: "ROC-AUC", accuracyLabel: "97%", accuracyName: "accuracy" });
    expect(tiles.filter((tile) => tile.metric).map((tile) => tile.slug)).toEqual(["churn-prediction"]);
    // No screenshots yet, so every preview is the cover.
    expect(tiles.every((tile) => tile.screenshot === null)).toBe(true);
  });
});

describe("the architecture diagrams", () => {
  it("put each box at the step of its longest path, and keep boxes without arrows apart", () => {
    const resume = data.projects.find((project) => project.slug === "resume-screening")!.architecture;
    const depth = steps(resume.nodes, resume.edges as never);
    expect(Object.fromEntries(depth)).toEqual({ resumes: 0, extraction: 1, tfidf: 2, bert: 2, ensemble: 3, ranking: 4, dashboard: 5 });
    const quiz = data.projects.find((project) => project.slug === "quizmuj")!.architecture;
    expect(apart(quiz.nodes, quiz.edges as never).map((node) => node.id)).toEqual(["csv", "export", "docker"]);
  });

  it("lay out across and down without overlapping boxes", () => {
    for (const project of data.projects) {
      const { nodes: boxes, edges } = project.architecture;
      for (const direction of ["across", "down"] as const) {
        const entry = { slug: project.slug };
        const { nodes, width, height } = layout(boxes, edges as never, direction);
        for (const a of nodes) {
          expect(a.x).toBeGreaterThanOrEqual(0);
          expect(a.y).toBeGreaterThanOrEqual(0);
          expect(a.x + a.width).toBeLessThanOrEqual(width + 0.5);
          expect(a.y + a.height).toBeLessThanOrEqual(height + 0.5);
          for (const b of nodes) {
            if (a === b) continue;
            const apartX = a.x + a.width <= b.x || b.x + b.width <= a.x;
            const apartY = a.y + a.height <= b.y || b.y + b.height <= a.y;
            expect(apartX || apartY, `${entry.slug} ${direction}: ${a.id} and ${b.id}`).toBe(true);
          }
        }
      }
    }
  });

  it("draw the brief's diagrams, each from the project's own facts", () => {
    const chain = (slug: string) => study(slug).diagram.down.nodes.map((node) => node.label);
    expect(chain("cognivault-ai")).toEqual(["Query", "Intent orchestrator", "A2A agents", "FAISS + HyDE", "Gemini Vision", "Summary", "Ragas"]);
    expect(chain("wcag-analyzer")).toEqual(["URL", "Headless crawler", "WCAG 2.1 rules", "Score and fixes", "Report"]);
    expect(chain("churn-prediction")).toContain("97% · 0.98");
    expect(study("churn-prediction").diagram.footnotes).toEqual([5]);
    expect(study("cognivault-ai").diagram.down.edges.find((edge) => edge.to === "ragas")).toMatchObject({ dashed: true });
  });

  it("write labels in at most two lines, and paths as x,y pairs", () => {
    expect(lines("Gemini Vision PDF extraction")).toEqual(["Gemini Vision PDF", "extraction"]);
    expect(lines("Query")).toEqual(["Query"]);
    const d = layout([{ id: "a", label: "A" }, { id: "b", label: "B" }], [["a", "b"]], "across").edges[0].d;
    expect(d).toBe(`M${DIAGRAM.box.width},${DIAGRAM.box.height / 2}C${DIAGRAM.box.width + DIAGRAM.gap.across / 2},${DIAGRAM.box.height / 2} ${DIAGRAM.box.width + DIAGRAM.gap.across / 2},${DIAGRAM.box.height / 2} ${DIAGRAM.box.width + DIAGRAM.gap.across},${DIAGRAM.box.height / 2}`);
  });
});

describe("the case studies", () => {
  it("carry each project's facts, and hide what content doesn't have yet", () => {
    for (const entry of studies) {
      const project = data.projects.find((item) => item.slug === entry.slug)!;
      expect(entry).toMatchObject({ href: `/work/${entry.slug}`, name: project.name, category: project.category, year: null, role: null, problem: null });
      expect(entry.links).toEqual({ repo: null, live: null });
      expect(entry.summary.text).toBe(project.summary.text);
    }
    expect(study("churn-prediction").metrics).toEqual([
      {
        footnotes: [5],
        metrics: [
          expect.objectContaining({ token: "97%", label: "accuracy" }),
          expect.objectContaining({ token: "0.98", label: "ROC-AUC" }),
        ],
      },
    ]);
    expect(study("wcag-analyzer").stack).toEqual([]);
  });

  it("link stack chips that are skills, and end each on the next project", () => {
    expect(study("cognivault-ai").stack.find((item) => item.name === "Gemini 1.5")?.skill).toBe(false);
    expect(study("cognivault-ai").stack.find((item) => item.name === "LangChain")?.skill).toBe(true);
    expect(studies.map((entry) => entry.next.slug)).toEqual(["quizmuj", "resume-screening", "churn-prediction", "wcag-analyzer", "cognivault-ai"]);
  });
});

describe("the sheet's spring", () => {
  it("is the DESIGN.md spring from rest, and keeps a starting speed when it turns around", () => {
    for (const t of [0.05, 0.2, 0.4, 0.8]) expect(springFrom(springs.smooth, 0)(t).progress).toBeCloseTo(springAt(springs.smooth, t), 6);
    const moving = springFrom(springs.smooth, -3);
    // Starting away from its target, it goes on a little, then comes back and settles.
    expect(moving(0).velocity).toBeCloseTo(-3, 6);
    expect(moving(0.02).progress).toBeLessThan(0);
    expect(atRest(moving(3))).toBe(true);
    expect(atRest(springFrom(springs.snappy, 0)(0.1))).toBe(false);
  });
});

describe("the schema keeps the bento and case studies honest", () => {
  it("counts a word as the project's own when its text starts a word the same way", () => {
    expect(ungroundedWords("Summary", "for automated summarization")).toEqual([]);
    expect(ungroundedWords("Query", "anything")).toEqual([]);
    expect(ungroundedWords("Blockchain ledger", "a ranking of candidates")).toEqual(["blockchain", "ledger"]);
  });

  it("fails a diagram box or a preview label in words the project never uses", () => {
    expect(broken(["projects", 0, "architecture", "nodes", 0, "label"], "Blockchain")).toEqual([
      'projects.0.architecture.nodes.0: "blockchain" isn\'t in this project\'s own words',
    ]);
    expect(broken(["projects", 1, "preview", "labels", "alert"], "Face detection")).toEqual([
      'projects.1.preview.labels.alert: "face, detection" isn\'t in this project\'s own words',
    ]);
  });

  it("fails an arrow to a box that isn't there, and a figure the project doesn't state", () => {
    expect(broken(["projects", 4, "architecture", "edges", 0], ["url", "nowhere"])).toEqual(['projects.4.architecture.edges.0: no box "nowhere"']);
    expect(broken(["projects", 3, "preview", "auc"], 0.99)).toEqual(["projects.3.preview: 0.99 isn't one of this project's metrics"]);
    expect(broken(["projects", 3, "metrics"], [{ value: 97, label: "accuracy", footnotes: [5] }])).toEqual([
      "projects.3.preview: 0.98 isn't one of this project's metrics",
      "projects.3.metrics: 0.98 is in this project's text but isn't one of its metrics",
    ]);
  });
});
