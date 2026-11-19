import { type CaseStudy, type ResearchPaper, scholarlyArticle } from "@/content/derive";
import type { Content } from "@/content/schema";
import { absolute } from "./site";

/**
 * Structured data (DESIGN.md §10, Part 16), schema.org as JSON-LD: Akshat as a Person on
 * the home page, each project as a CreativeWork and each paper as a ScholarlyArticle, every
 * one of them pointing back at the same Person. Only what content states, so a gap stays a
 * gap: no telephone, ever (§2 rule 2), and no date published until there's one.
 */

type Node = Record<string, unknown>;

const CONTEXT = "https://schema.org";

/** The Person's identifier, which every work names as its author. */
export function personId(): string {
  return `${absolute("/")}#person`;
}

/**
 * Who Akshat is: name, title, where Akshat works and studies, and the profiles elsewhere.
 * The title is the one Akshat holds where Akshat works, since the two are read together.
 */
export function person(content: Content): Node {
  const { profile } = content;
  const current = content.experience.find((role) => role.end === "present");
  const school = content.education.find((entry) => entry.kind === "degree");
  return {
    "@context": CONTEXT,
    "@type": "Person",
    "@id": personId(),
    name: profile.name,
    jobTitle: current?.role ?? profile.role,
    description: profile.headline,
    url: absolute("/"),
    ...(current ? { worksFor: { "@type": "Organization", name: current.org } } : {}),
    ...(school ? { alumniOf: { "@type": "CollegeOrUniversity", name: school.institution } } : {}),
    sameAs: [profile.links.linkedin, profile.links.github].filter((link): link is string => Boolean(link)),
  };
}

/** Akshat, as a work names its author. */
function author(content: Content): Node {
  return { "@type": "Person", "@id": personId(), name: content.profile.name, url: absolute("/") };
}

/** A project: what it is, what it's built with, and who made it. */
export function project(content: Content, study: CaseStudy): Node {
  return {
    "@context": CONTEXT,
    "@type": "CreativeWork",
    "@id": `${absolute(study.href)}#work`,
    name: study.name,
    headline: study.name,
    description: study.tagline.text,
    abstract: study.summary.text,
    genre: study.category,
    keywords: study.stack.map((item) => item.name).join(", "),
    url: absolute(study.href),
    creator: author(content),
    author: author(content),
    ...(study.year ? { dateCreated: String(study.year) } : {}),
    ...(study.links.live ? { sameAs: study.links.live } : {}),
  };
}

/**
 * A paper: Part 8's ScholarlyArticle (content/derive.ts: its status, keywords, authors and
 * where it was presented), given its own address and Akshat as the same Person the home
 * page names.
 */
export function paper(content: Content, entry: ResearchPaper): Node {
  const article = scholarlyArticle(content, entry);
  return {
    ...article,
    "@id": `${absolute(entry.href)}#article`,
    headline: entry.title,
    url: absolute(entry.href),
    author: entry.authors.map((name, i) => (name.self ? { ...article.author[i], ...author(content) } : article.author[i])),
  };
}
