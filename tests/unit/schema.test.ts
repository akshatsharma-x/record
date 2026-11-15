import { describe, expect, it } from "vitest";
import { data } from "@/content/data";
import { ContentError, parseContent } from "@/content/schema";

type Edit = [path: (string | number)[], value: unknown];

/** A copy of the real content with deliberate mistakes, including fields the schema forbids. */
function broken(...edits: Edit[]): unknown {
  const copy: unknown = structuredClone(data);
  for (const [path, value] of edits) {
    let node = copy as Record<string | number, unknown>;
    for (const key of path.slice(0, -1)) node = node[key] as Record<string | number, unknown>;
    node[path[path.length - 1]] = value;
  }
  return copy;
}

function problemsOf(input: unknown): string[] {
  try {
    parseContent(input);
  } catch (error) {
    if (error instanceof ContentError) return error.problems;
    throw error;
  }
  throw new Error("expected the content to fail validation");
}

describe("content schema", () => {
  it("accepts the real content", () => {
    expect(() => parseContent(data)).not.toThrow();
  });

  it("names the field when a date is malformed", () => {
    expect(problemsOf(broken([["experience", 2, "start"], "2025-13"]))).toEqual([
      'experience[truechip].start: use "YYYY-MM" (got "2025-13")',
    ]);
  });

  it("names a footnote that doesn't exist", () => {
    expect(problemsOf(broken([["highlights", 0, "footnotes"], [9]]))).toEqual([
      "highlights[cartographer].footnotes[0]: footnote 9 doesn't exist",
    ]);
  });

  it("rejects a misspelled key, naming it", () => {
    expect(problemsOf(broken([["projects", 0, "yera"], 2025]))).toEqual([
      'projects[cognivault-ai]: Unrecognized key: "yera"',
    ]);
  });

  it("has no phone field to fill in", () => {
    expect(problemsOf(broken([["profile", "phone"], "never"]))).toEqual(['profile: Unrecognized key: "phone"']);
  });

  it("rejects anything shaped like a phone number, anywhere", () => {
    // Built at runtime from fake digits, so no phone-shaped literal exists in this file.
    const fake = ["+91", "9".padEnd(10, "0")].join(" ");
    expect(problemsOf(broken([["experience", 0, "bullets", 1, "text"], `Call ${fake}`]))).toEqual([
      "experience[united-airlines].bullets[1].text: looks like a phone number, and the phone number is never published (DESIGN.md §2 rule 2)",
    ]);
  });

  it('rejects the word "TODO" in text, so it can never render', () => {
    const [problem] = problemsOf(broken([["profile", "headline"], "TODO write a headline"]));
    expect(problem).toMatch(/^profile\.headline: write a gap as null/);
  });

  it("checks references between entities", () => {
    expect(problemsOf(broken([["profile", "now"], "ey"]))).toEqual([
      'profile.now: "ey" has ended; it must point to a current role',
    ]);
    expect(problemsOf(broken([["publications", 1, "presentedAt"], "nope"]))).toEqual([
      'publications[pm25-forecasting].presentedAt: no conference with id "nope"',
    ]);
    expect(problemsOf(broken([["highlights", 3, "ref", "id"], "nope"]))).toEqual([
      'highlights[churn-accuracy].ref.id: nothing with id "nope" in #work',
    ]);
  });

  it("keeps skill names and aliases unambiguous", () => {
    expect(problemsOf(broken([["skills", 5, "skills", 11], { name: "Next.js" }]))).toEqual([
      'skills[Foundations].skills[Next.js]: "Next.js" is already used by Next.js in Frameworks & backend',
    ]);
  });

  it("reports every problem at once", () => {
    const problems = problemsOf(broken([["experience", 1, "end"], "2026-13"], [["profile", "email"], "not-an-email"]));
    expect(problems).toHaveLength(2);
  });
});
