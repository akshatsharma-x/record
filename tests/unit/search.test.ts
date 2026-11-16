import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/search-index.json/route";
import { content } from "@/content";
import { calculate, formatValue } from "@/lib/search/arithmetic";
import { distance, normalize, prepare, rank } from "@/lib/search/match";
import { compose, groupOf, type Item } from "@/lib/search/results";
import type { SearchPayload } from "@/lib/search/types";
import { expansions } from "@/lib/search/vocabulary";
import { SECTIONS } from "@/lib/sections";

async function served(): Promise<SearchPayload> {
  return (await GET().json()) as SearchPayload;
}

// ─── Arithmetic ──────────────────────────────────────────────────────────────

describe("typed arithmetic", () => {
  it.each([
    ["12*7", 84],
    ["12 × 7", 84],
    ["12x7", 84],
    ["2^10", 1024],
    ["2^3^2", 512],
    ["(1+2)*3", 9],
    ["-3+5", 2],
    ["10 ÷ 4", 2.5],
    ["0.1+0.2", 0.3],
    ["1/3", 0.333333333333],
    ["−4 − −2", -2],
  ])("%s is %d", (input, value) => {
    expect(calculate(input)?.value).toBe(value);
  });

  it("typesets the expression", () => {
    expect(calculate("12*7")?.expression).toBe("12 × 7");
    expect(calculate("(1+2)/-3")?.expression).toBe("(1 + 2) ÷ −3");
  });

  it.each(["2026", "-5", "rag", "1+", "*3", "(1+2", "1+2)", "10/0", "eval(1)", "1;2", "alert(1)", "2**3", "1e3+1"])(
    "doesn't evaluate %s",
    (input) => {
      expect(calculate(input)).toBeNull();
    },
  );

  it("refuses long or deeply nested input", () => {
    expect(calculate("1+".repeat(60) + "1")).toBeNull();
    expect(calculate("(".repeat(40) + "1+1" + ")".repeat(40))).toBeNull();
  });

  it("formats answers with grouped digits", () => {
    expect(formatValue(1234567)).toBe("1,234,567");
    expect(formatValue(0.5)).toBe("0.5");
  });
});

// ─── Matching ────────────────────────────────────────────────────────────────

describe("matching", () => {
  it("normalizes case, accents and punctuation", () => {
    expect(normalize("Résumé")).toBe("resume");
    expect(normalize("C/C++")).toBe("c c++");
    expect(normalize("  Next.js — App Router ")).toBe("next js app router");
  });

  it("counts a transposition as one edit", () => {
    expect(distance("expereince", "experience", 2)).toBe(1);
    expect(distance("reserch", "research", 1)).toBe(1);
    expect(distance("cat", "dog", 1)).toBe(2);
  });

  const items = [
    { id: "a", title: "Cognivault AI", subtitle: "A multi-agent research assistant", keywords: ["RAG", "FAISS"], body: "" },
    { id: "b", title: "Next.js", subtitle: "Web", keywords: [], body: "" },
    { id: "c", title: "Truechip", subtitle: "", keywords: [], body: "Reached 90%+ test coverage." },
    { id: "d", title: "Web Accessibility Analyzer", subtitle: "", keywords: [], body: "It scores them and writes reports." },
  ].map(prepare);
  const ids = (query: string) => rank(items, query).map((hit) => hit.item.id);

  it("matches exactly, by prefix and with typos", () => {
    expect(ids("cognivault")).toEqual(["a"]);
    expect(ids("cogni")).toEqual(["a"]);
    expect(ids("cognivualt")).toEqual(["a"]);
  });

  it("matches words typed together along word boundaries", () => {
    expect(ids("nextjs")).toEqual(["b"]);
  });

  it("needs every word to match", () => {
    expect(ids("cognivault faiss")).toEqual(["a"]);
    expect(ids("cognivault python")).toEqual([]);
  });

  it("doesn't find short words inside unrelated longer ones, or typos of stopwords", () => {
    expect(ids("rag")).toEqual(["a"]);
    expect(ids("theme")).toEqual([]);
  });

  it("knows the vocabulary, singular or plural", () => {
    expect(expansions("rag")).toContain("knowledge graphs");
    expect(expansions("llms")).toEqual(expansions("llm"));
    expect(expansions("zebra")).toEqual([]);
  });
});

// ─── The real index ──────────────────────────────────────────────────────────

describe("the search index", () => {
  it("finds the brief's examples: rag → Cognivault AI and United Airlines, llm → Cartographer", async () => {
    const { entries } = await served();
    const prepared = entries.map(prepare);
    const titles = (query: string) => rank(prepared, query).map((hit) => hit.item.title);
    expect(titles("rag")).toEqual(expect.arrayContaining(["Cognivault AI", "United Airlines"]));
    expect(titles("llm")).toContain("Cartographer");
    expect(titles("expereince")[0]).toBe("Experience");
    expect(titles("cartografer")).toContain("Cartographer");
  });

  it("links every entry to a page or a home section that exists", async () => {
    const { entries } = await served();
    const sections = new Set(SECTIONS.map((section) => section.id));
    // Paper pages are prerendered for every paper in content.
    expect(existsSync(path.join(process.cwd(), "app", "research", "[slug]", "page.tsx"))).toBe(true);
    const papers = new Set(content.publications.map((paper) => `/research/${paper.slug}`));
    for (const entry of entries) {
      const section = /^\/#([\w-]+)$/.exec(entry.href)?.[1];
      const resolves = papers.has(entry.href) || Boolean(section && sections.has(section as never));
      expect(resolves, `${entry.id} → ${entry.href}`).toBe(true);
    }
    expect(entries.filter((entry) => entry.href.startsWith("/research/"))).toHaveLength(content.publications.length);
  });

  it("serves the profile links the actions open, and never a phone number", async () => {
    const payload = await served();
    expect(payload.profile.email).toMatch(/@/);
    expect(payload.profile.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\//);
    expect(payload.profile.github).toMatch(/^https:\/\/github\.com\//);
    expect(JSON.stringify(payload)).not.toMatch(/\+91|\b[6-9]\d{9}\b/);
  });
});

// ─── Arranging results ───────────────────────────────────────────────────────

describe("results", () => {
  const item = (id: string, kind: Item["kind"], title: string, extra: Partial<Item> = {}): Item => ({
    id,
    kind,
    title,
    subtitle: "",
    keywords: [],
    body: "",
    ...extra,
  });
  const items = [
    item("s:work", "section", "Work", { suggested: true }),
    item("w:cog", "work", "Cognivault AI"),
    item("r:ua", "role", "United Airlines"),
    item("p:food", "paper", "Food waste"),
    item("k:rag", "skill", "RAG"),
    item("e:muj", "education", "Manipal University Jaipur"),
    item("a:theme", "action", "Toggle theme", { suggested: true }),
    item("a:saffron", "action", "Use the Saffron finish", { quiet: true }),
  ].map(prepare);

  it("puts roles and projects in Work, and credentials in their own group", () => {
    expect(groupOf("role")).toBe("work");
    expect(groupOf("work")).toBe("work");
    expect(groupOf("certificate")).toBe("credentials");
  });

  it("suggests sections and actions before anything is typed, and keeps quiet actions quiet", () => {
    const { top, groups } = compose(items, "");
    expect(top).toBeNull();
    expect(groups.map((group) => [group.name, group.items.map((entry) => entry.id)])).toEqual([
      ["Sections", ["s:work"]],
      ["Actions", ["a:theme"]],
    ]);
  });

  it("lifts the best match into Top hit, out of its group", () => {
    const { top, groups } = compose(items, "united");
    expect(top?.id).toBe("r:ua");
    expect(groups.flatMap((group) => group.items).map((entry) => entry.id)).not.toContain("r:ua");
  });

  it("shows a quiet action when the query asks for it", () => {
    const { top } = compose(items, "saffron");
    expect(top?.id).toBe("a:saffron");
  });
});
