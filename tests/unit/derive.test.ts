import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { data } from "@/content/data";
import {
  allSkills,
  clockPlace,
  compareTable,
  counts,
  credentialsHeadline,
  drafts,
  gaps,
  graduation,
  heroChips,
  initialism,
  mentions,
  nowRole,
  numbersIn,
  publicationStatus,
  publicLocation,
  roleDurations,
  searchIndex,
  skillEvidence,
  timeline,
  warnings,
} from "@/content/derive";
import { parseContent } from "@/content/schema";

/** Noon in Jaipur on 15 Nov 2026. */
const NOW = new Date("2026-11-15T06:30:00Z");

function evidenceFor(name: string) {
  const skill = skillEvidence(content).find((entry) => entry.name === name);
  if (!skill) throw new Error(`no skill named ${name}`);
  return {
    roles: skill.roles.map((hit) => hit.id),
    projects: skill.projects.map((hit) => hit.id),
    papers: skill.papers.map((hit) => hit.id),
    firstYear: skill.firstYear,
  };
}

describe("counts", () => {
  it("counts 4 internships, 2 papers and 5 projects", () => {
    expect(counts(content)).toMatchObject({ internships: 4, papers: 2, projects: 5, certificates: 0, achievements: 3 });
  });

  it("marks exactly the core six", () => {
    expect(allSkills(content).filter((skill) => skill.core).map((skill) => skill.name)).toEqual([
      "Python",
      "TypeScript",
      "Java",
      "LangGraph",
      "Next.js",
      "FastAPI",
    ]);
  });
});

describe("profile facts", () => {
  it("knows the current role", () => {
    expect(nowRole(content)).toEqual({
      id: "united-airlines",
      org: "United Airlines",
      role: "AI & ML Intern (Generative AI)",
      since: "2026-06",
    });
  });

  it("shows only the country and IST until the city is confirmed", () => {
    expect(publicLocation(content)).toEqual({
      place: "India",
      city: null,
      timeZone: "Asia/Kolkata",
      timeZoneLabel: "IST",
    });
    const confirmed = structuredClone(content);
    confirmed.profile.location.cityConfirmed = true;
    expect(publicLocation(confirmed)).toMatchObject({ place: "Jaipur, India", city: "Jaipur" });
  });
});

describe("credentials heading", () => {
  it('reads "Education." with no certificates, and never counts zero', () => {
    expect(credentialsHeadline(content)).toBe("Education.");
  });

  it('reads "Credentials." once a certificate exists', () => {
    const withCertificate = parseContent({
      ...structuredClone(data),
      certificates: [
        {
          id: "fixture",
          title: "Fixture certificate",
          issuer: "Fixture issuer",
          issued: "2026-01",
          expires: "never",
          credentialId: null,
          verifyUrl: null,
          skills: ["Python"],
          proves: null,
        },
      ],
    });
    expect(credentialsHeadline(withCertificate)).toBe("Credentials.");
  });
});

describe("publication status", () => {
  it("is accepted and presented until a DOI exists, then published", () => {
    const [paper] = content.publications;
    expect(publicationStatus(paper).status).toBe("accepted-presented");
    expect(publicationStatus({ ...paper, doi: "10.1007/fixture" }).status).toBe("published");
  });
});

describe("durations and graduation", () => {
  it("counts each role's calendar months, first and last included", () => {
    expect(Object.fromEntries(roleDurations(content, NOW).map((role) => [role.id, role.months]))).toEqual({
      "united-airlines": 6,
      ey: 2,
      truechip: 2,
      walkingtree: 2,
    });
    expect(roleDurations(content, NOW)[0].label).toBe("6 months");
  });

  it("measures graduation progress from 2023-07 to 2027-07 against today", () => {
    const progress = graduation(content, NOW);
    expect(progress).toMatchObject({
      start: "2023-07",
      end: "2027-07",
      percent: 84,
      monthsRemaining: 8,
      daysToGraduationMonth: 228,
      graduated: false,
    });
    expect(progress?.progress).toBeGreaterThan(0.84);
    expect(progress?.progress).toBeLessThan(0.85);
  });

  it("clamps progress before the start and after graduation", () => {
    expect(graduation(content, new Date("2023-01-15T06:30:00Z"))?.progress).toBe(0);
    expect(graduation(content, new Date("2027-09-01T06:30:00Z"))).toMatchObject({ progress: 1, graduated: true });
  });
});

describe("skill evidence", () => {
  it("lists where each core skill was used", () => {
    expect(evidenceFor("Python")).toMatchObject({ roles: [], projects: ["resume-screening"], papers: [] });
    expect(evidenceFor("TypeScript")).toMatchObject({ roles: ["ey"], projects: [] });
    expect(evidenceFor("Java")).toMatchObject({ roles: ["truechip", "walkingtree"], projects: [] });
    expect(evidenceFor("LangGraph")).toMatchObject({ roles: ["united-airlines"] });
    expect(evidenceFor("Next.js")).toMatchObject({ roles: ["ey"], projects: ["cognivault-ai"] });
    expect(evidenceFor("FastAPI")).toMatchObject({ roles: [], projects: ["cognivault-ai"] });
  });

  it("matches aliases", () => {
    expect(evidenceFor("LLMs").roles).toEqual(["united-airlines"]);
    expect(evidenceFor("multimodal AI").projects).toEqual(["cognivault-ai"]);
    expect(evidenceFor("Transformers").projects).toEqual(["resume-screening"]);
    expect(evidenceFor("REST APIs").roles).toEqual(["ey"]);
    expect(evidenceFor("code review").roles).toEqual(["ey", "truechip"]);
    expect(evidenceFor("machine learning")).toMatchObject({
      roles: ["united-airlines"],
      projects: ["churn-prediction"],
      papers: ["food-waste-cold-chain", "pm25-forecasting"],
    });
  });

  it("finds RAG in Cognivault AI", () => {
    expect(evidenceFor("RAG").projects).toEqual(["cognivault-ai"]);
  });

  it("never counts a skill inside another name", () => {
    expect(evidenceFor("JavaScript")).toMatchObject({ roles: [], projects: [], papers: [] });
    expect(evidenceFor("SQL")).toMatchObject({ roles: [], projects: [], papers: [] });
    expect(evidenceFor("GitHub").roles).toEqual(["ey"]);
    expect(evidenceFor("Git").roles).toEqual(["ey", "truechip"]);
  });

  it("dates a skill by its earliest dated evidence, ignoring undated projects", () => {
    expect(evidenceFor("Java").firstYear).toBe(2025);
    expect(evidenceFor("LangGraph").firstYear).toBe(2026);
    expect(evidenceFor("FastAPI").firstYear).toBeNull();
  });
});

describe("mentions", () => {
  it.each([
    ["Built with Next.js 16 (App Router)", "JS", false],
    ["(Node.js, Express, MongoDB)", "Node", false],
    ["(Node.js, Express, MongoDB)", "Node.js", true],
    ["a Core Java backend", "Java", true],
    ["JavaScript", "Java", false],
    ["PostgreSQL", "SQL", false],
    ["Git/GitHub", "Git", true],
    ["Django REST Framework", "Django", true],
    ["SDLC-driven delivery", "SDLC", true],
    ["AI & ML Intern", "ml", true],
    ["HTML5", "ML", false],
  ])("%s · %s → %s", (text, term, expected) => {
    expect(mentions(text, term)).toBe(expected);
  });
});

describe("timeline", () => {
  const result = timeline(content, NOW);
  const track = (id: string) => result.tracks.find((t) => t.id === id)!;

  it("runs from Jul 2023 to today", () => {
    expect(result.start).toBe("2023-07-01");
    expect(result.today).toBe("2026-11-15");
  });

  it("stacks EY and United on two lanes where they overlap", () => {
    const work = track("work");
    const lane = (id: string) => work.clips.find((clip) => clip.id === id)!.lane;
    expect(work.lanes).toBe(2);
    expect(lane("united-airlines")).not.toBe(lane("ey"));
    expect(work.clips.find((clip) => clip.id === "united-airlines")).toMatchObject({ ongoing: true, end: "2026-11-16" });
    expect(work.clips.find((clip) => clip.id === "ey")).toMatchObject({ start: "2026-06-01", end: "2026-08-01" });
  });

  it("dates research to the day and honors to the year, never an invented month", () => {
    expect(track("research").clips).toEqual([
      expect.objectContaining({ id: "sci-2026", start: "2026-04-28", end: "2026-04-30", precision: "day" }),
    ]);
    const honors = track("honors").clips;
    expect(honors.map((clip) => clip.id).sort()).toEqual([
      "deans-list",
      "smart-india-hackathon-2024",
      "smart-india-hackathon-2025",
      "student-excellence-award",
    ]);
    expect(honors.every((clip) => clip.precision === "year" && clip.start.endsWith("-01-01"))).toBe(true);
  });

  it("shows Manipal University Jaipur as one continuous clip", () => {
    expect(track("education").clips).toEqual([
      expect.objectContaining({ title: "Manipal University Jaipur", start: "2023-07-01", end: "2027-08-01", ongoing: true }),
    ]);
  });
});

describe("/compare", () => {
  const table = compareTable(content, NOW);
  const cells = (id: string) => table.rows.find((row) => row.id === id)!.cells;

  it("has a column for each year from 2023 to this year", () => {
    expect(table.years).toEqual([2023, 2024, 2025, 2026]);
  });

  it("counts internships to date", () => {
    expect(table.years.map((year) => cells("internships")[year].length)).toEqual([0, 0, 2, 4]);
  });

  it("puts papers and honors in their years", () => {
    expect(cells("papers")[2026]).toHaveLength(2);
    expect(cells("papers")[2025]).toEqual([]);
    expect(cells("honors")[2024]).toEqual(["Smart India Hackathon", "Dean's List for Academic Excellence"]);
    expect(cells("honors")[2026]).toEqual(["Student Excellence Award"]);
  });

  it("is built from dated entries only: no undated project appears", () => {
    const everything = JSON.stringify(table);
    for (const project of content.projects) expect(everything).not.toContain(project.name);
  });
});

describe("the hero", () => {
  it("shortens a field of study to its initials", () => {
    expect(initialism("Computer Science and Engineering")).toBe("CSE");
    expect(initialism("Artificial Intelligence & Machine Learning")).toBe("AIML");
  });

  it("derives the three context chips, each pointing at the section that tells the rest", () => {
    expect(heroChips(content)).toEqual([
      { label: "Now at United Airlines", section: "experience" },
      { label: "B.Tech CSE \u201927 \u00b7 Manipal University Jaipur", section: "credentials" },
      { label: "SCI-2026 \u00b7 Springer LNNS", section: "research" },
    ]);
  });

  it("names Akshat's clock by its time zone until the city is confirmed, then by the city", () => {
    expect(clockPlace(content)).toEqual({ label: "IST", timeZone: "Asia/Kolkata" });
    const confirmed = parseContent({ ...data, profile: { ...data.profile, location: { ...data.profile.location, cityConfirmed: true } } });
    expect(clockPlace(confirmed)).toEqual({ label: "in Jaipur", timeZone: "Asia/Kolkata" });
  });
});

describe("search index", () => {
  const index = searchIndex(content);

  it("covers every section, role, project, paper and skill", () => {
    const kinds = (kind: string) => index.filter((entry) => entry.kind === kind).length;
    expect(kinds("section")).toBe(9);
    expect(kinds("work")).toBe(5);
    expect(kinds("paper")).toBe(2);
    expect(kinds("skill")).toBe(70);
    expect(index.find((entry) => entry.id === "role:united-airlines")).toBeDefined();
  });

  it('lets "rag" find Cognivault AI and "llm" find Cartographer', () => {
    const findsTerm = (term: string) =>
      index.filter((entry) =>
        [entry.title, entry.subtitle, entry.body, ...entry.keywords].some((text) => mentions(text, term)),
      );
    expect(findsTerm("rag").map((entry) => entry.title)).toContain("Cognivault AI");
    expect(findsTerm("llm").map((entry) => entry.title)).toContain("Cartographer");
  });

  it("links projects and papers to their pages", () => {
    expect(index.find((entry) => entry.id === "work:quizmuj")?.href).toBe("/work/quizmuj");
    expect(index.find((entry) => entry.id === "paper:pm25-forecasting")?.href).toBe("/research/pm25-forecasting");
  });
});

describe("warnings", () => {
  it("flags numbers without footnotes, papers without a DOI and projects without a year", () => {
    const list = warnings(content);
    const paths = (kind: string) => list.filter((w) => w.kind === kind).map((w) => w.path);
    expect(paths("number-without-footnote")).toEqual([
      "experience[truechip].summary",
      "experience[truechip].bullets[0]",
      "education[manipal-university-jaipur].grade",
      "education[class-xii].grade",
      "education[class-x].grade",
    ]);
    expect(paths("paper-without-doi")).toHaveLength(2);
    expect(paths("project-without-year")).toHaveLength(5);
  });

  it("ignores names, versions and years when looking for numbers", () => {
    expect(numbersIn("Built Cartographer with GPT-4.1 and Claude Sonnet 4.5: 6 artifacts in 2 calls.")).toEqual([
      "6",
      "2",
    ]);
    expect(numbersIn("graduating in 2027, presented at SCI-2026")).toEqual([]);
    expect(numbersIn("$0.08–0.11 per run with 22–25% compression")).toEqual(["$0.08–0.11", "22–25%"]);
  });
});

describe("gaps and drafts", () => {
  it("lists every null field", () => {
    const list = gaps(content);
    expect(list).toHaveLength(41);
    expect(list).toContain("profile.location.cityConfirmed");
    expect(list).toContain("projects[wcag-analyzer].stack");
    expect(list).toContain("footnotes[4].source");
  });

  it("expands draft patterns to the fields they cover", () => {
    expect(drafts(content).find((draft) => draft.pattern === "publications.*.tldr")?.paths).toEqual([
      "publications[food-waste-cold-chain].tldr",
      "publications[pm25-forecasting].tldr",
    ]);
  });
});
