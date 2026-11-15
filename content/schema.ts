/**
 * The content model. Every fact on the site comes from content/data.ts and is validated
 * against this schema at build time (DESIGN.md §2 rule 1).
 *
 * Conventions
 * - null is a known gap. Every null in data.ts carries a TODO(akshat) comment. Components
 *   never render a null field, and production never shows a placeholder.
 * - A field that simply doesn't apply is left out (optional), never null.
 * - Text that can state a number is a Claim, so it can carry footnotes (DESIGN.md §9).
 * - Objects are strict: a misspelled key fails validation, and so does a `phone` field.
 *
 * Runs under plain Node for the prebuild content check: relative imports with .ts
 * extensions, `import type` for types, no path aliases.
 */
import { z } from "zod";
import { findPhoneNumbers } from "../lib/privacy.ts";
import { SECTION_IDS } from "../lib/sections.ts";

// ─── Primitives ──────────────────────────────────────────────────────────────

const Text = z
  .string()
  .min(1, "can't be empty")
  .refine((value) => value === value.trim(), "has leading or trailing spaces")
  .refine(
    (value) => !/\bTODO\b/.test(value),
    'write a gap as null with a TODO(akshat) comment, never "TODO" in the text',
  );

const Id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase-kebab-case");
const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'use "YYYY-MM"');
const IsoDate = z.iso.date('use "YYYY-MM-DD"');
const Year = z.number().int().min(2000).max(2100);
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'use 24-hour "HH:MM"');
const Url = z.url({ protocol: /^https$/, error: "use a full https:// URL" });
const PublicPdf = z.string().regex(/^\/.+\.pdf$/, "use a /public path ending in .pdf");
const FootnoteId = z.number().int().positive();
const TimeZone = z.string().refine(isTimeZone, "isn't an IANA time zone");

/** Text that may state a number. Every number gets a footnote (DESIGN.md §9). */
const Claim = z.strictObject({
  text: Text,
  footnotes: z.array(FootnoteId).default([]),
});

const Image = z.strictObject({ src: z.string().min(1), alt: Text });

// ─── Entities ────────────────────────────────────────────────────────────────

const Profile = z.strictObject({
  name: Text,
  initials: z.string().regex(/^[A-Z]{2,3}$/, "use 2–3 capital letters"),
  role: Text,
  headline: Text,
  /** The id of the current role in experience. */
  now: Id,
  location: z.strictObject({
    city: Text,
    /** null until Akshat confirms the city. Until then, only the country and time zone show. */
    cityConfirmed: z.literal(true).nullable(),
    country: Text,
    timeZone: TimeZone,
  }),
  workingHours: z.strictObject({ start: Time, end: Time }),
  availability: Text.nullable(),
  email: z.email(),
  // There's deliberately no phone field (DESIGN.md §2 rule 2).
  links: z.strictObject({
    linkedin: Url,
    github: Url,
    scholar: Url.nullable(),
    orcid: Url.nullable(),
  }),
  /** A phone-free résumé PDF in /public. null means there's no download (DESIGN.md §2 rule 2). */
  resumePdf: PublicPdf.nullable(),
  photo: Image.nullable(),
  bio: z.array(Claim).min(1),
});

const CurrentFocus = z.strictObject({
  building: z.strictObject({
    name: Text,
    detail: Text,
    /** The role it belongs to. */
    experience: Id,
  }),
  researching: Text.nullable(),
  reading: Text.nullable(),
});

const Experience = z.strictObject({
  id: Id,
  org: Text,
  role: Text,
  kind: z.enum(["internship", "full-time"]),
  start: YearMonth,
  end: z.union([YearMonth, z.literal("present")]),
  location: Text.nullable(),
  summary: Claim,
  bullets: z.array(Claim).min(1),
  stack: z.array(Text).min(1),
  /** Internal work: what the site may show about it. */
  confidential: z.strictObject({ note: Text, shareable: Text.nullable() }).optional(),
});

const Degree = z.strictObject({
  kind: z.literal("degree"),
  id: Id,
  institution: Text,
  degree: Text,
  field: Text,
  start: YearMonth,
  end: YearMonth,
  grade: Claim,
  coursework: z.array(Text),
});

const School = z.strictObject({
  kind: z.literal("school"),
  id: Id,
  level: Text,
  board: Text,
  grade: Claim,
  year: Year,
});

const Education = z.discriminatedUnion("kind", [Degree, School]);

const Conference = z.strictObject({
  id: Id,
  name: Text,
  kind: Text,
  host: Text,
  city: Text,
  start: IsoDate,
  end: IsoDate,
  proceedings: Text,
});

const Publication = z.strictObject({
  slug: Id,
  title: Text,
  tldr: Text,
  keywords: z.array(Text).min(1),
  /** The id of the conference where it was presented. */
  presentedAt: Id,
  coAuthors: z.array(Text).min(1).nullable(),
  abstract: Text.nullable(),
  /** The status reads "published" once this exists. */
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/, 'use a bare DOI such as "10.1007/…"').nullable(),
  /** A PDF the site may host. null until the rights are confirmed. */
  pdf: PublicPdf.nullable(),
});

const Project = z.strictObject({
  slug: Id,
  name: Text,
  tagline: Claim,
  category: z.enum(["AI system", "Full-stack", "NLP", "Machine learning", "Accessibility"]),
  summary: Claim,
  /** The technologies the summary names, in order. */
  stack: z.array(Text).min(1).nullable(),
  year: Year.nullable(),
  role: Text.nullable(),
  links: z.strictObject({ repo: Url.optional(), live: Url.optional() }).nullable(),
  screenshots: z.array(Image).min(1).nullable(),
});

const Skill = z.strictObject({
  name: Text,
  /** Shown in brackets after the name: "Next.js (App Router)". */
  detail: Text.optional(),
  core: z.boolean().default(false),
  /** Other ways content or a visitor writes it. Evidence matching and search use them. */
  aliases: z.array(Text).default([]),
});

const SkillCategory = z.strictObject({ name: Text, skills: z.array(Skill).min(1) });

const Certificate = z.strictObject({
  id: Id,
  title: Text,
  issuer: Text,
  issued: YearMonth,
  /** "never" when it doesn't expire. */
  expires: z.union([YearMonth, z.literal("never")]).nullable(),
  credentialId: Text.nullable(),
  verifyUrl: Url.nullable(),
  /** Names (or aliases) from the skills list. */
  skills: z.array(Text),
  proves: Text.nullable(),
});

const Achievement = z.strictObject({
  id: Id,
  title: Text,
  org: Text.optional(),
  years: z.array(Year).min(1),
  detail: Claim.optional(),
});

const Highlight = z.strictObject({
  id: Id,
  text: Text,
  footnotes: z.array(FootnoteId).default([]),
  /** A source stated in place of a footnote. */
  source: Text.optional(),
  /** Where the full fact lives: a home section and, optionally, the entity in it. */
  ref: z.strictObject({ section: z.enum(SECTION_IDS), id: Id.optional() }),
});

const Footnote = z.strictObject({
  id: FootnoteId,
  note: Text,
  /** null is a gap. Leave it out when the note names its own source. */
  source: Text.nullable().optional(),
});

const SectionCopy = z.strictObject({
  eyebrow: Text.optional(),
  headline: Text,
  sub: Text.optional(),
});

const Copy = z.strictObject({
  /** The hero's name, role and headline come from profile; its date line is live (Part 5). */
  hero: z.strictObject({ ctaWork: Text, ctaHello: Text }),
  statement: SectionCopy,
  about: SectionCopy,
  experience: SectionCopy,
  research: SectionCopy,
  work: SectionCopy,
  skills: SectionCopy,
  credentials: SectionCopy.extend({
    /** Used while there are no certificates, so the heading never counts zero (DESIGN.md §12). */
    headlineWithoutCertificates: Text,
    honors: Text,
  }),
  contact: SectionCopy,
  footer: z.strictObject({ credit: Text }),
});

const ContentShape = z.strictObject({
  profile: Profile,
  currentFocus: CurrentFocus,
  experience: z.array(Experience).min(1),
  education: z.array(Education).min(1),
  conferences: z.array(Conference),
  publications: z.array(Publication),
  projects: z.array(Project),
  skills: z.array(SkillCategory).min(1),
  certificates: z.array(Certificate),
  achievements: z.array(Achievement),
  highlights: z.array(Highlight),
  footnotes: z.array(Footnote),
  copy: Copy,
  /** Content paths still awaiting Akshat's approval (DESIGN.md §9). "*" matches any one segment. */
  drafts: z.array(z.string().min(1)),
});

export const ContentSchema = ContentShape.superRefine(checkReferences);

export type ContentInput = z.input<typeof ContentSchema>;
export type Content = z.output<typeof ContentSchema>;
export type Claim = z.output<typeof Claim>;
export type Experience = z.output<typeof Experience>;
export type Education = z.output<typeof Education>;
export type Degree = z.output<typeof Degree>;
export type Publication = z.output<typeof Publication>;
export type Project = z.output<typeof Project>;
export type Skill = z.output<typeof Skill>;
export type Certificate = z.output<typeof Certificate>;
export type Achievement = z.output<typeof Achievement>;
export type Highlight = z.output<typeof Highlight>;

// ─── Claims ──────────────────────────────────────────────────────────────────

export type Path = (string | number)[];

/** Every piece of text that can carry footnotes, with its path. */
export function* claimsOf(content: z.output<typeof ContentShape>): Generator<{
  path: Path;
  text: string;
  footnotes: number[];
}> {
  for (const [i, claim] of content.profile.bio.entries()) yield { path: ["profile", "bio", i], ...claim };
  for (const [i, role] of content.experience.entries()) {
    yield { path: ["experience", i, "summary"], ...role.summary };
    for (const [j, bullet] of role.bullets.entries()) {
      yield { path: ["experience", i, "bullets", j], ...bullet };
    }
  }
  for (const [i, entry] of content.education.entries()) {
    yield { path: ["education", i, "grade"], ...entry.grade };
  }
  for (const [i, project] of content.projects.entries()) {
    yield { path: ["projects", i, "tagline"], ...project.tagline };
    yield { path: ["projects", i, "summary"], ...project.summary };
  }
  for (const [i, achievement] of content.achievements.entries()) {
    if (achievement.detail) yield { path: ["achievements", i, "detail"], ...achievement.detail };
  }
  for (const [i, highlight] of content.highlights.entries()) {
    yield { path: ["highlights", i], text: highlight.text, footnotes: highlight.footnotes };
  }
}

// ─── Draft paths ─────────────────────────────────────────────────────────────

/** Resolves a dotted path such as "publications.*.tldr" to the values it names. */
export function resolvePattern(root: unknown, pattern: string): { path: Path; value: unknown }[] {
  let matches: { path: Path; value: unknown }[] = [{ path: [], value: root }];
  for (const segment of pattern.split(".")) {
    matches = matches.flatMap(({ path, value }) => {
      if (value === null || typeof value !== "object") return [];
      const entries: [string | number, unknown][] = Array.isArray(value)
        ? value.map((item, index) => [index, item])
        : Object.entries(value);
      return entries
        .filter(([key]) => segment === "*" || String(key) === segment)
        .map(([key, child]) => ({ path: [...path, key], value: child }));
    });
  }
  return matches;
}

// ─── Cross-references ────────────────────────────────────────────────────────

function checkReferences(content: z.output<typeof ContentShape>, ctx: z.RefinementCtx): void {
  const problem = (path: Path, message: string) => ctx.addIssue({ code: "custom", path, message });

  const unique = <T>(items: T[], key: (item: T) => string | number, path: Path, what: string) => {
    const seen = new Set<string | number>();
    items.forEach((item, index) => {
      const value = key(item);
      if (seen.has(value)) problem([...path, index], `duplicate ${what} "${value}"`);
      seen.add(value);
    });
  };
  unique(content.experience, (role) => role.id, ["experience"], "id");
  unique(content.education, (entry) => entry.id, ["education"], "id");
  unique(content.conferences, (conference) => conference.id, ["conferences"], "id");
  unique(content.publications, (paper) => paper.slug, ["publications"], "slug");
  unique(content.projects, (project) => project.slug, ["projects"], "slug");
  unique(content.certificates, (certificate) => certificate.id, ["certificates"], "id");
  unique(content.achievements, (achievement) => achievement.id, ["achievements"], "id");
  unique(content.highlights, (highlight) => highlight.id, ["highlights"], "id");
  unique(content.footnotes, (footnote) => footnote.id, ["footnotes"], "id");

  // The current role and the current focus point at real roles.
  const roles = new Map(content.experience.map((role) => [role.id, role]));
  const now = roles.get(content.profile.now);
  if (!now) problem(["profile", "now"], `no role with id "${content.profile.now}" in experience`);
  else if (now.end !== "present") {
    problem(["profile", "now"], `"${now.id}" has ended; it must point to a current role`);
  }
  if (!roles.has(content.currentFocus.building.experience)) {
    problem(
      ["currentFocus", "building", "experience"],
      `no role with id "${content.currentFocus.building.experience}" in experience`,
    );
  }

  // Dates run forward.
  content.experience.forEach((role, i) => {
    if (role.end !== "present" && role.end < role.start) problem(["experience", i, "end"], "ends before it starts");
  });
  content.education.forEach((entry, i) => {
    if (entry.kind === "degree" && entry.end < entry.start) problem(["education", i, "end"], "ends before it starts");
  });
  content.conferences.forEach((conference, i) => {
    if (conference.end < conference.start) problem(["conferences", i, "end"], "ends before it starts");
  });
  content.certificates.forEach((certificate, i) => {
    if (certificate.expires && certificate.expires !== "never" && certificate.expires < certificate.issued) {
      problem(["certificates", i, "expires"], "expires before it was issued");
    }
  });

  // Papers point at a conference.
  const conferences = new Set(content.conferences.map((conference) => conference.id));
  content.publications.forEach((paper, i) => {
    if (!conferences.has(paper.presentedAt)) {
      problem(["publications", i, "presentedAt"], `no conference with id "${paper.presentedAt}"`);
    }
  });

  // Footnote references exist.
  const footnotes = new Set(content.footnotes.map((footnote) => footnote.id));
  for (const claim of claimsOf(content)) {
    claim.footnotes.forEach((id, j) => {
      if (!footnotes.has(id)) problem([...claim.path, "footnotes", j], `footnote ${id} doesn't exist`);
    });
  }

  // Highlights point at something real.
  const collections: Partial<Record<(typeof SECTION_IDS)[number], Set<string>>> = {
    experience: new Set(content.experience.map((role) => role.id)),
    research: new Set(content.publications.map((paper) => paper.slug)),
    work: new Set(content.projects.map((project) => project.slug)),
    credentials: new Set([
      ...content.education.map((entry) => entry.id),
      ...content.certificates.map((certificate) => certificate.id),
      ...content.achievements.map((achievement) => achievement.id),
    ]),
  };
  content.highlights.forEach((highlight, i) => {
    const { section, id } = highlight.ref;
    if (id && !collections[section]?.has(id)) {
      problem(["highlights", i, "ref", "id"], `nothing with id "${id}" in #${section}`);
    }
  });

  // Skill names and aliases are unambiguous, and certificates name real skills.
  const skillTerms = new Map<string, string>();
  content.skills.forEach((category, i) => {
    category.skills.forEach((skill, j) => {
      for (const term of [skill.name, ...skill.aliases]) {
        const key = term.toLowerCase();
        const owner = skillTerms.get(key);
        if (owner) problem(["skills", i, "skills", j], `"${term}" is already used by ${owner}`);
        else skillTerms.set(key, `${skill.name} in ${category.name}`);
      }
    });
  });
  content.certificates.forEach((certificate, i) => {
    certificate.skills.forEach((name, j) => {
      if (!skillTerms.has(name.toLowerCase())) problem(["certificates", i, "skills", j], `"${name}" isn't in the skills list`);
    });
  });

  // Draft paths name real content.
  content.drafts.forEach((pattern, i) => {
    if (resolvePattern(content, pattern).length === 0) problem(["drafts", i], `"${pattern}" matches no content`);
  });

  // Nothing anywhere is shaped like a phone number (DESIGN.md §2 rule 2).
  walkStrings(content, [], (value, path) => {
    if (findPhoneNumbers(value).length > 0) {
      problem(path, "looks like a phone number, and the phone number is never published (DESIGN.md §2 rule 2)");
    }
  });
}

function walkStrings(value: unknown, path: Path, visit: (value: string, path: Path) => void): void {
  if (typeof value === "string") visit(value, path);
  else if (Array.isArray(value)) value.forEach((item, i) => walkStrings(item, [...path, i], visit));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) walkStrings(child, [...path, key], visit);
  }
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export class ContentError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    const count = `${problems.length} problem${problems.length === 1 ? "" : "s"}`;
    super(`content/data.ts failed validation (${count}):\n${problems.map((p) => `  • ${p}`).join("\n")}`);
    this.name = "ContentError";
    this.problems = problems;
  }
}

/** Validates content. On failure it throws a ContentError that names every bad field. */
export function parseContent(input: unknown): Content {
  const result = ContentSchema.safeParse(input, { reportInput: true });
  if (result.success) return result.data;
  throw new ContentError(
    result.error.issues.map((issue) => {
      const got =
        issue.code !== "unrecognized_keys" && ["string", "number", "boolean"].includes(typeof issue.input)
          ? ` (got ${JSON.stringify(issue.input)})`
          : "";
      return `${formatPath(issue.path, input)}: ${issue.message}${got}`;
    }),
  );
}

/**
 * "experience.2.start" → "experience[truechip].start". Array items are labeled by their
 * id, slug or name when they have one, so the message points at the entry by name.
 */
export function formatPath(path: PropertyKey[], root: unknown): string {
  let out = "";
  let node: unknown = root;
  for (const key of path) {
    if (typeof key === "number") {
      const item: unknown = Array.isArray(node) ? node[key] : undefined;
      const label = labelOf(item);
      out += label ? `[${label}]` : `[${key}]`;
      node = item;
    } else {
      out += `${out ? "." : ""}${String(key)}`;
      node = node && typeof node === "object" ? (node as Record<PropertyKey, unknown>)[key] : undefined;
    }
  }
  return out || "content";
}

function labelOf(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const record = item as Record<string, unknown>;
  for (const key of ["id", "slug", "name"]) {
    if (typeof record[key] === "string") return record[key];
  }
  return undefined;
}
