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

  describe("the portrait", () => {
    const layer = (src: string, height = 3200) => ({ src, width: 2400, height });
    const portrait = {
      alt: "Akshat, lit softly from the left.",
      subject: layer("/portrait/subject.avif"),
      plate: layer("/portrait/plate.avif"),
      headTop: 0.18,
    };

    it("accepts two aligned layers from a tall photo", () => {
      expect(() => parseContent(broken([["profile", "photo"], portrait]))).not.toThrow();
    });

    it("asks for a photo at least 3000px tall", () => {
      expect(problemsOf(broken([["profile", "photo"], { ...portrait, subject: layer("/portrait/subject.avif", 2000), plate: layer("/portrait/plate.avif", 2000) }]))).toEqual([
        "profile.photo.subject.height: the portrait should be at least 3000px tall",
      ]);
    });

    it("keeps every layer the subject's size, so they line up", () => {
      expect(problemsOf(broken([["profile", "photo"], { ...portrait, plate: layer("/portrait/plate.avif", 3300) }]))).toEqual([
        "profile.photo.plate: every layer must be the subject's size, so they line up",
      ]);
    });

    it("needs to know where the head sits, as a share of the height", () => {
      expect(problemsOf(broken([["profile", "photo"], { ...portrait, headTop: 18 }]))).toHaveLength(1);
      expect(problemsOf(broken([["profile", "photo"], { ...portrait, headTop: undefined }]))).toHaveLength(1);
    });

    it("takes images from /public only", () => {
      expect(problemsOf(broken([["profile", "photo"], { ...portrait, plate: { ...portrait.plate, src: "https://example.com/p.png" } }]))).toHaveLength(1);
    });
  });

  describe("the highlights' films", () => {
    it("draw only figures their footnotes state", () => {
      expect(problemsOf(broken([["highlights", 1, "film", "cost"], [0.08, 0.12]]))).toEqual([
        "highlights[pennies-a-run].film: 0.12 isn't stated by the notes this highlight cites",
      ]);
      expect(problemsOf(broken([["highlights", 4, "film", "from"], 200]))).toEqual([
        "highlights[sih-top-50].film: 200 isn't stated by the notes this highlight cites",
      ]);
      // Dots are drawn one by one, so a film can't ask for thousands.
      expect(problemsOf(broken([["highlights", 4, "film", "from"], 3000])).join()).toMatch(/400/);
    });

    it("count papers at a real conference", () => {
      expect(problemsOf(broken([["highlights", 2, "film", "conference"], "nope"]))).toEqual([
        'highlights[two-papers].film.conference: no conference with id "nope"',
      ]);
    });

    it("are required, one of the known kinds", () => {
      expect(problemsOf(broken([["highlights", 0, "film"], { kind: "spiral" }]))).toHaveLength(1);
      expect(problemsOf(broken([["highlights", 0, "film"], undefined]))).toHaveLength(1);
    });
  });

  describe("a role's metrics and visual", () => {
    it("state only what the role and its notes state", () => {
      expect(problemsOf(broken([["experience", 0, "metrics", 0, "value"], 7]))).toEqual(
        expect.arrayContaining(["experience[united-airlines].metrics[0]: 7 isn't stated by this role or the notes it cites"]),
      );
      expect(problemsOf(broken([["experience", 2, "visual", "coverage"], 95]))).toEqual([
        "experience[truechip].visual: 95 isn't stated by this role or the notes it cites",
      ]);
    });

    it("cover every number the role's text states, so the edit can footnote each once", () => {
      const metrics = data.experience[3].metrics!.filter((metric) => metric.value !== 2500);
      expect(problemsOf(broken([["experience", 3, "metrics"], metrics]))).toEqual([
        "experience[walkingtree].metrics: 2500 is in this role's text but isn't one of its metrics",
      ]);
    });

    it("cite footnotes that exist", () => {
      expect(problemsOf(broken([["experience", 0, "metrics", 0, "footnotes"], [9]]))).toEqual([
        "experience[united-airlines].metrics[0].footnotes[0]: footnote 9 doesn't exist",
      ]);
    });

    it("shorten the org's name only to a part of it", () => {
      expect(problemsOf(broken([["experience", 1, "short"], "E&Y"]))).toEqual(['experience[ey].short: "E&Y" isn\'t part of "Ernst & Young (EY)"']);
    });
  });

  it("puts the statement's gradient phrase in the statement, once", () => {
    expect(problemsOf(broken([["copy", "statement", "emphasis"], "the murky kind"]))).toEqual([
      "copy.statement.emphasis: must appear in the headline exactly once",
    ]);
  });

  it("reports every problem at once", () => {
    const problems = problemsOf(broken([["experience", 1, "end"], "2026-13"], [["profile", "email"], "not-an-email"]));
    expect(problems).toHaveLength(2);
  });
});
