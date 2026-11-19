/**
 * Research (DESIGN.md §7.5): the papers as #research and their pages show them, their
 * citations, and the structured data their pages carry, checked against schema.org's own
 * vocabulary (tests/fixtures/schema-org.json).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { research, scholarlyArticle, scholarMeta, venueLine } from "@/content/derive";
import { apa, bibtex, bibtexKey, type CiteSource, ieee, initials, plain, protect, sentenceCase, splitName } from "@/lib/cite";
import {
  bandAt,
  CHAIN,
  chainStops,
  HAZE,
  handleAt,
  hazeDensity,
  levelAt,
  nextStop,
  particleAlpha,
  particles,
  playAt,
  RESEARCH,
  skyline,
  smoothPath,
  stepTime,
  temperatureAt,
  timeWords,
  tracePoints,
} from "@/lib/research";

const papers = research(content);
const paper = (slug: string) => papers.find((entry) => entry.slug === slug)!;
const [conference] = content.conferences;

const source = (overrides: Partial<CiteSource> = {}): CiteSource => ({
  title: "Short-Term PM2.5 Forecasting Using ML for Sustainable Urban Air Quality",
  authors: [splitName("Akshat Sharma")],
  conference,
  keywords: ["PM2.5", "air quality"],
  doi: null,
  ...overrides,
});

/** A BibTeX entry's fields, braces kept off the values. */
function parseBibtex(entry: string) {
  const head = /^@(\w+)\{([^,]+),\n/.exec(entry);
  if (!head) throw new Error("not an entry");
  const fields: Record<string, string> = {};
  const body = entry.slice(head[0].length, entry.lastIndexOf("}"));
  for (const line of body.split("\n").filter(Boolean)) {
    const match = /^\s+(\w+)\s+= (.+),$/.exec(line);
    if (!match) throw new Error(`can't read ${line}`);
    const value = match[2];
    fields[match[1]] = value.startsWith("{") ? value.slice(1, -1) : value;
  }
  return { type: head[1], key: head[2], fields };
}

describe("names and titles in citations", () => {
  it("splits a name at its last word, and writes initials", () => {
    expect(splitName("Akshat Sharma")).toEqual({ given: "Akshat", family: "Sharma" });
    expect(splitName("Mary Ann Lee")).toEqual({ given: "Mary Ann", family: "Lee" });
    expect(initials("Akshat")).toBe("A.");
    expect(initials("Mary Ann")).toBe("M. A.");
    expect(initials("Jean-Paul")).toBe("J.-P.");
  });

  it("sets titles in sentence case for APA, keeping acronyms", () => {
    expect(sentenceCase("Short-Term PM2.5 Forecasting Using ML for Sustainable Urban Air Quality")).toBe(
      "Short-term PM2.5 forecasting using ML for sustainable urban air quality",
    );
    expect(sentenceCase("An Interpretable Artificial Intelligence Framework for Food Waste Prediction and Prevention in Cold-Chain Logistics")).toBe(
      "An interpretable artificial intelligence framework for food waste prediction and prevention in cold-chain logistics",
    );
    expect(sentenceCase("Air Quality: A Short-Term View")).toBe("Air quality: A short-term view");
  });

  it("braces acronyms in BibTeX titles, so styles that lowercase keep them", () => {
    expect(protect("Short-Term PM2.5 Forecasting Using ML")).toBe("Short-Term {PM2.5} Forecasting Using {ML}");
  });
});

describe("citations", () => {
  it("cite a presented paper as a presentation, in APA 7", () => {
    expect(plain(apa(source()))).toBe(
      "Sharma, A. (2026, April 28–29). Short-term PM2.5 forecasting using ML for sustainable urban air quality [Paper presentation]. SCI-2026, Hanoi, Vietnam.",
    );
    // The title is italic, as APA sets a presentation's.
    expect(
      apa(source())
        .filter((run) => run.italic)
        .map((run) => run.text),
    ).toEqual(["Short-term PM2.5 forecasting using ML for sustainable urban air quality"]);
  });

  it("cite a presented paper as presented, in IEEE", () => {
    expect(plain(ieee(source()))).toBe(
      "A. Sharma, “Short-Term PM2.5 Forecasting Using ML for Sustainable Urban Air Quality,” presented at SCI-2026, Hanoi, Vietnam, Apr. 28–29, 2026.",
    );
  });

  it("join authors as each style does", () => {
    const three = source({ authors: ["Akshat Sharma", "Jane Doe", "Ravi Kumar"].map(splitName) });
    expect(plain(apa(three))).toMatch(/^Sharma, A\., Doe, J\., & Kumar, R\. \(2026/);
    expect(plain(ieee(three))).toMatch(/^A\. Sharma, J\. Doe, and R\. Kumar, “/);
    const two = source({ authors: ["Akshat Sharma", "Jane Doe"].map(splitName) });
    expect(plain(apa(two))).toMatch(/^Sharma, A\., & Doe, J\. \(2026/);
    expect(plain(ieee(two))).toMatch(/^A\. Sharma and J\. Doe, “/);
    const seven = source({ authors: Array.from({ length: 7 }, (_, i) => splitName(`Author${i} Name${i}`)) });
    expect(plain(ieee(seven))).toMatch(/^A\. Name0 et al\., “/);
    expect(bibtex(two)).toContain("author       = {Sharma, Akshat and Doe, Jane},");
  });

  it("cite a published paper in its proceedings, with its DOI", () => {
    const published = source({ doi: "10.1007/978-3-031-00000-0_1", published: "2026-09-01" });
    expect(plain(apa(published))).toBe(
      "Sharma, A. (2026). Short-term PM2.5 forecasting using ML for sustainable urban air quality. In SCI-2026 (Springer LNNS). https://doi.org/10.1007/978-3-031-00000-0_1",
    );
    expect(plain(ieee(published))).toBe(
      "A. Sharma, “Short-Term PM2.5 Forecasting Using ML for Sustainable Urban Air Quality,” in SCI-2026, Springer LNNS, Hanoi, Vietnam, 2026, doi: 10.1007/978-3-031-00000-0_1.",
    );
    expect(parseBibtex(bibtex(published)).fields).toMatchObject({ doi: "10.1007/978-3-031-00000-0_1", month: "sep" });
  });

  it("key each entry by author, year and the title's first word", () => {
    expect(bibtexKey(source())).toBe("sharma2026short");
    expect(bibtexKey(source({ title: "An Interpretable Framework" }))).toBe("sharma2026interpretable");
  });
});

describe("a paper's citation", () => {
  it("waits until content names every author: none while the co-authors are unknown", () => {
    for (const entry of research(content)) {
      const unknown = content.publications.find((item) => item.slug === entry.slug)!.coAuthors === null;
      expect(entry.authorsKnown).toBe(!unknown);
      if (unknown) expect(entry.citations).toBeNull();
    }
  });
});

describe("the BibTeX matches the content fields", () => {
  // As it will once the co-authors are known: here, none besides Akshat.
  const known = { ...content, publications: content.publications.map((item) => ({ ...item, coAuthors: item.coAuthors ?? [] })) };
  for (const entry of known.publications) {
    it(entry.slug, () => {
      const venue = content.conferences.find((item) => item.id === entry.presentedAt)!;
      const { type, key, fields } = parseBibtex(research(known).find((item) => item.slug === entry.slug)!.citations!.bibtex);
      expect(type).toBe("inproceedings");
      expect(key).toMatch(/^sharma2026[a-z]+$/);
      expect(fields).toEqual({
        author: [content.profile.name, ...(entry.coAuthors ?? [])]
          .map((name) => {
            const { given, family } = splitName(name);
            return `${family}, ${given}`;
          })
          .join(" and "),
        // Braces only protect acronyms; the words are the title's.
        title: expect.any(String),
        booktitle: venue.name,
        series: venue.proceedings,
        organization: venue.host,
        address: `${venue.city}, ${venue.country}`,
        month: "apr",
        year: venue.start.slice(0, 4),
        keywords: entry.keywords.join(", "),
      });
      expect(fields.title.replaceAll(/[{}]/g, "")).toBe(entry.title);
      expect("doi" in fields).toBe(entry.doi !== null);
    });
  }
});

describe("the research section", () => {
  it("says where both papers were presented, in full", () => {
    expect(venueLine(conference)).toBe("SCI-2026 · Swinburne Vietnam, Hanoi · 28–29 April 2026 · Springer LNNS");
  });

  it("gives each paper its status, authors and illustration", () => {
    expect(papers.map((entry) => entry.slug)).toEqual(["food-waste-cold-chain", "pm25-forecasting"]);
    for (const entry of papers) {
      expect(entry).toMatchObject({
        status: "accepted-presented",
        statusLabel: "Accepted · Presented April 2026",
        doi: null,
        doiUrl: null,
        abstract: null,
      });
      // Content names no co-authors yet, so the citations list Akshat alone.
      expect(entry.authors).toEqual([{ name: "Akshat Sharma", self: true }]);
    }
    expect(paper("food-waste-cold-chain").illustration).toMatchObject({ kind: "cold-chain", stops: ["Farm", "Storage", "Transport", "Retail"] });
    expect(paper("pm25-forecasting").illustration).toMatchObject({ kind: "haze" });
  });

  it("relates projects by the skills and ideas they share, and says which", () => {
    expect(paper("food-waste-cold-chain").related.map((project) => [project.slug, project.shares])).toEqual([
      ["resume-screening", ["explainable AI"]],
      ["churn-prediction", ["machine learning"]],
    ]);
    expect(paper("pm25-forecasting").related.map((project) => [project.slug, project.shares])).toEqual([["churn-prediction", ["machine learning"]]]);
  });
});

describe("structured data", () => {
  it("gives Google Scholar its tags, dated by the presentation until the proceedings are out", () => {
    // Its authors only once content knows them all: Scholar takes the tags as the whole list.
    expect(scholarMeta(paper("pm25-forecasting"))).toEqual({
      citation_title: "Short-Term PM2.5 Forecasting Using ML for Sustainable Urban Air Quality",
      citation_conference_title: "SCI-2026",
      citation_publication_date: "2026/04/28",
    });
    expect(scholarMeta({ ...paper("pm25-forecasting"), authorsKnown: true })).toMatchObject({ citation_author: ["Sharma, Akshat"] });
    const published = { ...paper("pm25-forecasting"), doi: "10.1007/x", published: "2026-09-01" };
    expect(scholarMeta(published)).toMatchObject({ citation_doi: "10.1007/x", citation_publication_date: "2026/09/01" });
  });

  const vocabulary = JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "schema-org.json"), "utf8")) as {
    classes: Record<string, string[]>;
    properties: Record<string, { domains: string[]; ranges: string[] }>;
  };
  const isA = (type: string, candidates: string[]) => [type, ...(vocabulary.classes[type] ?? [])].some((name) => candidates.includes(name));

  /** Every type, property and value in a JSON-LD node, as schema.org defines them. */
  function problems(node: Record<string, unknown>, at = "$"): string[] {
    const type = node["@type"];
    if (typeof type !== "string" || !(type in vocabulary.classes)) return [`${at}: unknown type ${String(type)}`];
    return Object.entries(node).flatMap(([key, value]) => {
      if (key.startsWith("@")) return [];
      const property = vocabulary.properties[key];
      if (!property) return [`${at}.${key}: not a term the fixture knows (regenerate it, or it isn't schema.org's)`];
      if (!isA(type, property.domains)) return [`${at}.${key}: doesn't apply to ${type}`];
      return (Array.isArray(value) ? value : [value]).flatMap((item, i) => {
        const where = Array.isArray(value) ? `${at}.${key}[${i}]` : `${at}.${key}`;
        if (item && typeof item === "object") {
          const inner = (item as Record<string, unknown>)["@type"] as string;
          return isA(inner, property.ranges)
            ? problems(item as Record<string, unknown>, where)
            : [`${where}: ${inner} isn't one of ${property.ranges.join(", ")}`];
        }
        if (typeof item !== "string") return [`${where}: ${typeof item}`];
        const date = /^\d{4}-\d{2}-\d{2}$/.test(item);
        const url = /^https:\/\/\S+$/.test(item);
        const fits =
          property.ranges.includes("Text") ||
          (property.ranges.includes("URL") && url) ||
          ((property.ranges.includes("Date") || property.ranges.includes("DateTime")) && date);
        return fits ? [] : [`${where}: "${item}" isn't one of ${property.ranges.join(", ")}`];
      });
    });
  }

  for (const entry of papers) {
    it(`describes ${entry.slug} as a valid schema.org ScholarlyArticle`, () => {
      const article = scholarlyArticle(content, entry);
      expect(article).toMatchObject({ "@context": "https://schema.org", "@type": "ScholarlyArticle", name: entry.title, description: entry.tldr });
      expect(problems(article)).toEqual([]);
      // With a DOI and a publication date, it stays valid.
      expect(
        problems(scholarlyArticle(content, { ...entry, doi: "10.1007/x", doiUrl: "https://doi.org/10.1007/x", published: "2026-09-01" })),
      ).toEqual([]);
    });
  }

  it("catches a property that doesn't apply", () => {
    expect(problems({ "@type": "Person", startDate: "2026-04-28" })).toEqual(["$.startDate: doesn't apply to Person"]);
    expect(problems({ "@type": "ScholarlyArticle", author: { "@type": "PostalAddress" } })).toEqual([
      "$.author: PostalAddress isn't one of Organization, Person",
    ]);
  });
});

describe("the illustrations", () => {
  it("lay the cold chain's stops along its route, risk rising after the excursion", () => {
    const stops = chainStops(4, 3);
    expect(stops.map((stop) => stop.at)).toEqual([0, 1 / 3, 2 / 3, 1]);
    // Risk only grows along the chain, and jumps past the excursion.
    for (let i = 1; i < stops.length; i++) expect(stops[i].risk).toBeGreaterThanOrEqual(stops[i - 1].risk);
    expect(stops[2].risk - stops[1].risk).toBeGreaterThan(0.3);
    for (const stop of stops) {
      expect(stop.attribution.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 1);
      expect(stop.risk).toBeGreaterThanOrEqual(0);
      expect(stop.risk).toBeLessThanOrEqual(1);
    }
    // Just past the excursion, its factor weighs most; before it, time does.
    expect(stops[2].attribution.indexOf(Math.max(...stops[2].attribution))).toBe(0);
    expect(stops[0].attribution.indexOf(Math.max(...stops[0].attribution))).toBe(1);
  });

  it("keep the temperature in the safe range but for the excursion", () => {
    const { safeTop, safeBottom, top, bottom } = CHAIN.trace;
    const safe = (u: number) => {
      const y = bottom - temperatureAt(u) * (bottom - top);
      return y >= safeTop && y <= safeBottom;
    };
    expect([0, 0.2, 0.35, 0.8, 1].every(safe)).toBe(true);
    expect(safe(CHAIN.excursion)).toBe(false);
    expect(tracePoints(0.5, 10).at(-1)!.x).toBeCloseTo(CHAIN.route.left + 0.5 * (CHAIN.route.right - CHAIN.route.left), 5);
  });

  it("write paths as x,y pairs with short numbers, so no run of digits looks like a phone number", () => {
    const d = smoothPath(chainStops(4, 3));
    expect(d).toMatch(/^M\d+(\.\d+)?,\d+(\.\d+)?C/);
    expect(d.replace(/-?\d{1,3}(\.\d{1,2})?,-?\d{1,3}(\.\d{1,2})?/g, "")).toMatch(/^[MC ]+$/);
  });

  it("step through the stops, then back to the whole chain", () => {
    expect([nextStop(null, 4), nextStop(0, 4), nextStop(2, 4), nextStop(3, 4)]).toEqual([0, 1, 3, null]);
  });

  it("forecast from now inside a band that widens toward the horizon", () => {
    expect(bandAt(HAZE.now)).toBe(0);
    expect(bandAt(0.2)).toBe(0);
    let last = 0;
    for (const x of [0.6, 0.7, 0.8, 0.9, 1]) {
      expect(bandAt(x)).toBeGreaterThan(last);
      last = bandAt(x);
    }
    // The illustrative haze is clear now, thick at the episode ahead, and easing by the horizon.
    expect(hazeDensity(levelAt(HAZE.now))).toBeLessThan(0.1);
    expect(hazeDensity(levelAt(0.82))).toBeGreaterThan(0.9);
    expect(hazeDensity(levelAt(HAZE.horizon))).toBeGreaterThan(0.15);
    expect(hazeDensity(levelAt(HAZE.horizon))).toBeLessThan(0.6);
  });

  it("step the handle from now to the horizon, and scroll it there as the chapter plays", () => {
    [HAZE.now, HAZE.now + 0.15, HAZE.now + 0.3, HAZE.horizon].forEach((time, i) => expect(stepTime(i)).toBeCloseTo(time, 10));
    expect(handleAt(0)).toBe(HAZE.now);
    expect(handleAt(1)).toBe(HAZE.horizon);
    expect(playAt(RESEARCH.playShare)).toBe(1);
    expect(timeWords(HAZE.now)).toBe("Now");
    expect(timeWords(HAZE.horizon)).toBe("As far ahead as the forecast reaches");
  });

  it("thicken the haze evenly: more particles show as the density rises", () => {
    const field = particles(160);
    expect(field).toHaveLength(160);
    expect(particles(160)).toEqual(field);
    const visible = (density: number) => field.reduce((sum, particle) => sum + particleAlpha(particle, density), 0);
    expect(visible(0)).toBeLessThan(visible(0.4));
    expect(visible(0.4)).toBeLessThan(visible(0.9));
    expect(field.every((particle) => particle.x >= 0 && particle.x <= 1 && particle.y >= 0.15 && particle.y <= 1)).toBe(true);
  });

  it("build a skyline across the whole width", () => {
    const buildings = skyline(600, 300);
    expect(buildings[0].x).toBe(0);
    expect(buildings.at(-1)!.x + buildings.at(-1)!.w).toBeGreaterThanOrEqual(600);
  });
});

describe("where the chapters pin", () => {
  it("uses one query in CSS and in the controller", () => {
    const tokens = readFileSync(path.join(process.cwd(), "styles", "tokens.css"), "utf8");
    const variant = /@custom-variant research-pinned \(@media ([^;]+)\);/.exec(tokens)?.[1];
    expect(variant).toBe(`${RESEARCH.query} and (scripting: enabled) and (prefers-reduced-motion: no-preference)`);
  });
});
