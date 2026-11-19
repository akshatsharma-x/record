import { afterEach, describe, expect, it, vi } from "vitest";
import { content } from "@/content";
import { caseStudies, research } from "@/content/derive";
import { findPhoneNumbers } from "@/lib/privacy";
import { absolute, pageMetadata, siteUrl } from "@/lib/site";
import { paper, person, personId, project } from "@/lib/structured-data";

/** Findable (Part 16): the site's address, each page's metadata, and its JSON-LD. */

afterEach(() => vi.unstubAllEnvs());

/** Every key anywhere in a JSON-LD tree. */
const keysOf = (value: unknown): string[] =>
  value && typeof value === "object" ? Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)]) : [];

describe("the site's address", () => {
  it("is content's domain once there is one, then Vercel's production address, then localhost", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "classyfolio.vercel.app");
    expect(siteUrl().toString()).toBe(content.profile.links.site ?? "https://classyfolio.vercel.app/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    if (!content.profile.links.site) expect(siteUrl().hostname).toBe("localhost");
    expect(absolute("/work/cognivault-ai")).toBe(new URL("/work/cognivault-ai", siteUrl()).toString());
  });

  it("gives every page its own canonical address and share card, never the home page's", () => {
    const metadata = pageMetadata({ path: "/specs", title: "Tech specs", description: "Every skill." });
    expect(metadata.alternates?.canonical).toBe("/specs");
    expect(metadata.openGraph).toMatchObject({ url: "/specs", title: "Tech specs", description: "Every skill.", siteName: content.profile.name });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("JSON-LD", () => {
  it("names Akshat as a Person: title, where Akshat works and studies, and the profiles elsewhere", () => {
    const node = person(content);
    expect(node).toMatchObject({
      "@type": "Person",
      "@id": personId(),
      name: content.profile.name,
      jobTitle: content.experience.find((role) => role.end === "present")!.role,
      worksFor: { "@type": "Organization", name: "United Airlines" },
      alumniOf: { "@type": "CollegeOrUniversity", name: "Manipal University Jaipur" },
    });
    expect(node.sameAs).toEqual([content.profile.links.linkedin, content.profile.links.github]);
  });

  it("never carries a telephone, or anything shaped like one", () => {
    const nodes = [person(content), ...caseStudies(content).map((study) => project(content, study)), ...research(content).map((entry) => paper(content, entry))];
    for (const node of nodes) {
      expect(keysOf(node)).not.toContain("telephone");
      expect(findPhoneNumbers(JSON.stringify(node))).toEqual([]);
    }
  });

  it("makes each project a CreativeWork of Akshat's, at its own address", () => {
    for (const study of caseStudies(content)) {
      const node = project(content, study);
      expect(node).toMatchObject({ "@type": "CreativeWork", name: study.name, description: study.tagline.text, url: absolute(study.href) });
      expect((node.author as { "@id": string })["@id"]).toBe(personId());
    }
  });

  it("makes each paper a ScholarlyArticle by the same Person, dated by its presentation until it's published", () => {
    for (const entry of research(content)) {
      const node = paper(content, entry);
      expect(node).toMatchObject({ "@type": "ScholarlyArticle", name: entry.title, headline: entry.title, url: absolute(entry.href) });
      const authors = node.author as { "@id"?: string; name: string }[];
      expect(authors.find((author) => author.name === content.profile.name)?.["@id"]).toBe(personId());
      if (!entry.published) expect(node).not.toHaveProperty("datePublished");
    }
  });
});
