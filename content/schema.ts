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
import { valuesIn } from "./numbers.ts";

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

const Count = z.number().int().positive();
const Share = z.number().gt(0).lte(100);
/** Two ends, low first: $0.08–0.11 is [0.08, 0.11]. */
const Range = z
  .tuple([z.number().nonnegative(), z.number().nonnegative()])
  .refine(([low, high]) => low <= high, "put the low end first");

/** Text that may state a number. Every number gets a footnote (DESIGN.md §9). */
const Claim = z.strictObject({
  text: Text,
  footnotes: z.array(FootnoteId).default([]),
});

const Image = z.strictObject({ src: z.string().min(1), alt: Text });

/** A picture in /public, with its intrinsic size so layout never shifts. */
const Picture = z.strictObject({
  src: z.string().regex(/^\/.+\.(png|jpe?g|webp|avif)$/, "use a /public path to a .png, .jpg, .webp or .avif"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * The hero portrait (DESIGN.md §7, Part 5), as layers made from one photo: soft side
 * light, a plain background, at least 3000px tall. The portrait edition of the hero
 * switches on when this exists.
 */
const Portrait = z
  .strictObject({
    /** What the photo shows, for screen readers. */
    alt: Text,
    /** Akshat cut out, with alpha: Copy Subject on macOS, or a matting model. */
    subject: Picture,
    /** The background with Akshat removed: Photos' Clean Up, or generative fill. Same size. */
    plate: Picture,
    /** Optional: a depth map (Apple's Depth Pro) for a richer parallax. Same size. */
    depth: Picture.optional(),
    /**
     * Where the top of the head sits, as a share of the photo's height (about 0.15–0.2).
     * The hero sets the name against it, so the head covers only the foot of the letters.
     */
    headTop: z.number().min(0.05).max(0.4),
  })
  .superRefine((portrait, ctx) => {
    if (portrait.subject.height < 3000) {
      ctx.addIssue({ code: "custom", path: ["subject", "height"], message: "the portrait should be at least 3000px tall" });
    }
    for (const layer of ["plate", "depth"] as const) {
      const picture = portrait[layer];
      if (picture && (picture.width !== portrait.subject.width || picture.height !== portrait.subject.height)) {
        ctx.addIssue({ code: "custom", path: [layer], message: "every layer must be the subject's size, so they line up" });
      }
    }
  });

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
    /** The site's own address, once it's live: the printed résumé's QR code points here. */
    site: Url.nullable(),
    /** The RETROGRADE edition of the site, once it's live: Search's "retro" opens it. */
    retrograde: Url.nullable(),
  }),
  /** A phone-free résumé PDF in /public. null means there's no download (DESIGN.md §2 rule 2). */
  resumePdf: PublicPdf.nullable(),
  photo: Portrait.nullable(),
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

/**
 * A number a role states, as "the edit" shows it: a counter with its footnote (DESIGN.md
 * §7.4). The role's text or the notes it cites must state it; a range gives both ends.
 */
const Metric = z.strictObject({
  value: z.union([z.number().nonnegative(), Range]),
  /** What it counts, as in "documentation artifacts". */
  label: Text,
  footnotes: z.array(FootnoteId).default([]),
});

/**
 * The abstract visual beside a role in "the edit": drawn in SVG, never a screenshot. Each
 * figure it draws must be stated by the role's text or the notes it cites.
 */
const RoleVisual = z.discriminatedUnion("kind", [
  /** Code-like strokes untangle into a knowledge graph, pulses become documents, a cost counter settles. */
  z.strictObject({ kind: z.literal("tangle-to-map"), calls: Count.max(4), documents: Count.max(12), cost: Range }),
  /** A UI assembles from App Router route segments, a JWT reaches the client, rows land in PostgreSQL. */
  z.strictObject({ kind: z.literal("route-segments") }),
  /** Module blocks snap together, a coverage ring fills, a defect line drops. */
  z.strictObject({ kind: z.literal("module-blocks"), modules: Count.max(24), coverage: Share, defects: Share }),
  /** A dashboard builds itself, its daily-users line reaching the stated count. */
  z.strictObject({ kind: z.literal("dashboard"), users: Count }),
]);

const Experience = z.strictObject({
  id: Id,
  org: Text,
  /** The name where room is tight, like a clip in "the edit": part of `org`, as it's written there. */
  short: Text.optional(),
  role: Text,
  kind: z.enum(["internship", "full-time"]),
  start: YearMonth,
  end: z.union([YearMonth, z.literal("present")]),
  location: Text.nullable(),
  summary: Claim,
  bullets: z.array(Claim).min(1),
  /** Every number the summary and bullets state, as counters. */
  metrics: z.array(Metric).default([]),
  visual: RoleVisual.optional(),
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
  /** For citations, which place a conference by city and country. */
  country: Text,
  start: IsoDate,
  end: IsoDate,
  proceedings: Text,
});

/**
 * A paper's concept illustration in #research (DESIGN.md §7.5): the idea drawn, never its
 * results. The labels are the illustration's words; nothing in it is a finding.
 */
const Illustration = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("cold-chain"),
    /** What to do with it, shown under it. */
    hint: Text,
    /** The route's stops, in order. */
    stops: z.array(Text).min(2).max(6),
    /** The illustrative factors a stop's "Why?" panel attributes its risk to. */
    factors: z.array(Text).min(2).max(4),
  }),
  z.strictObject({ kind: z.literal("haze"), hint: Text }),
]);

const Publication = z.strictObject({
  slug: Id,
  title: Text,
  /** A few words for where a long title won't fit: Ask's source chips (Part 14). */
  short: Text,
  tldr: Text,
  keywords: z.array(Text).min(1),
  /** The id of the conference where it was presented. */
  presentedAt: Id,
  coAuthors: z.array(Text).min(1).nullable(),
  abstract: Text.nullable(),
  /** The status reads "published" once this exists. */
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/, 'use a bare DOI such as "10.1007/…"').nullable(),
  /** The day the proceedings came out; add it with the DOI. Until then citations date it by its presentation. */
  published: IsoDate.optional(),
  /** A PDF the site may host. null until the rights are confirmed. */
  pdf: PublicPdf.nullable(),
  illustration: Illustration.optional(),
});

const ProjectCategory = z.enum(["AI system", "Full-stack", "NLP", "Machine learning", "Accessibility"]);

/**
 * A box in a case study's architecture diagram (DESIGN.md §7.6). Its words come from the
 * project's own text: `from` is the phrase it stands for when the label is a short form
 * ("Base learners" stands for "Stacking ensemble"), else the label itself.
 */
const ArchitectureNode = z.strictObject({
  id: Id,
  label: Text,
  /** A second, smaller line: "PDF extraction". */
  detail: Text.optional(),
  from: Text.optional(),
  /** Notes for a figure the box states. */
  footnotes: z.array(FootnoteId).default([]),
});

/** An arrow between two boxes; "dashed" for a relation that isn't a step, like evaluation. */
const ArchitectureEdge = z.union([z.tuple([Id, Id]), z.tuple([Id, Id, z.literal("dashed")])]);

/** A tile's living preview (DESIGN.md §7.6), labeled in the project's own words. */
const ProjectPreview = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("agents"), labels: z.strictObject({ query: Text, agents: Text, hypothetical: Text, neighbors: Text, summary: Text }) }),
  z.strictObject({ kind: z.literal("exam-room"), labels: z.strictObject({ room: Text, alert: Text, proctor: Text }) }),
  z.strictObject({ kind: z.literal("lanes"), labels: z.strictObject({ left: Text, right: Text, ranked: Text, scatter: Text }) }),
  z.strictObject({ kind: z.literal("roc"), auc: z.number().gt(0).lte(1), accuracy: Share }),
  z.strictObject({ kind: z.literal("scan"), labels: z.strictObject({ issues: Text, score: Text }) }),
]);

const Project = z.strictObject({
  slug: Id,
  name: Text,
  tagline: Claim,
  category: ProjectCategory,
  summary: Claim,
  /** The technologies the summary names, in order. */
  stack: z.array(Text).min(1).nullable(),
  year: Year.nullable(),
  role: Text.nullable(),
  links: z.strictObject({ repo: Url.optional(), live: Url.optional() }).nullable(),
  screenshots: z.array(Image).min(1).nullable(),
  /** Every number the tagline and summary state, as counters; the first is the tile's. */
  metrics: z.array(Metric).default([]),
  /** The case study's first chapter: the problem it solves. */
  problem: Claim.nullable(),
  /** What came of it, in words, beside or instead of the metrics. */
  outcome: Claim.nullable(),
  preview: ProjectPreview,
  architecture: z.strictObject({ nodes: z.array(ArchitectureNode).min(2), edges: z.array(ArchitectureEdge) }),
});

const Skill = z.strictObject({
  name: Text,
  /** Shown in brackets after the name: "Next.js (App Router)". */
  detail: Text.optional(),
  core: z.boolean().default(false),
  /** Other ways content or a visitor writes it. Evidence matching and search use them. */
  aliases: z.array(Text).default([]),
  /** Its Simple Icons slug (DESIGN.md §4.10), where it has one; else it gets a monogram. */
  icon: z.string().regex(/^[a-z0-9]+$/).optional(),
});

const SkillCategory = z.strictObject({ name: Text, skills: z.array(Skill).min(1) });

/** A pass's own color: an issuer's tasteful tone, never its logo. White text must read on it. */
const Tone = z.string().regex(/^#[0-9a-f]{6}$/i, "a #rrggbb color");

const Certificate = z.strictObject({
  id: Id,
  title: Text,
  issuer: Text,
  /** Its pass's color (DESIGN.md §7.8); without one, it takes one from the finish. */
  tone: Tone.optional(),
  issued: YearMonth,
  /** "never" when it doesn't expire. */
  expires: z.union([YearMonth, z.literal("never")]).nullable(),
  credentialId: Text.nullable(),
  verifyUrl: Url.nullable(),
  /** Names (or aliases) from the skills list. */
  skills: z.array(Text),
  proves: Text.nullable(),
});

const MedalShape = z.enum(["circle", "hexagon", "rounded-square", "shield"]);

const Achievement = z.strictObject({
  id: Id,
  title: Text,
  org: Text.optional(),
  years: z.array(Year).min(1),
  detail: Claim.optional(),
  /**
   * Its medal (DESIGN.md §7.8): a minted shape of its own, and the words on its face,
   * engraved as "face — years · line". The line's figures must be the detail's.
   */
  medal: z.strictObject({ shape: MedalShape, face: Text, line: Text.optional() }),
});

/**
 * The micro-film a highlight plays in the reel (DESIGN.md §7, Part 6). Each figure it draws
 * must be stated by the notes the highlight cites, so the film never shows a number the
 * footnotes don't back.
 */
const Film = z.discriminatedUnion("kind", [
  /** Pulses fan out into documents: so many calls, so many outputs. */
  z.strictObject({ kind: z.literal("fan-out"), from: Count.max(4), to: Count.max(12) }),
  /** A cost counter settles on a range while a token bar compresses. */
  z.strictObject({ kind: z.literal("cost"), cost: Range, compression: Range }),
  /** Sheets settle under a conference: the papers presented there, counted from content. */
  z.strictObject({ kind: z.literal("papers"), conference: Id }),
  /** An ROC curve draws to its AUC. */
  z.strictObject({ kind: z.literal("roc"), auc: z.number().gt(0.5).lte(1) }),
  /** A field of dots condenses to the few that made it. */
  z.strictObject({ kind: z.literal("condense"), from: Count.max(400), to: Count }),
  /** A ring fills to a share. */
  z.strictObject({ kind: z.literal("ring"), percent: Share }),
  /** Days of bars rise to a daily count. */
  z.strictObject({ kind: z.literal("bars"), value: Count }),
]);

const Highlight = z.strictObject({
  id: Id,
  text: Text,
  footnotes: z.array(FootnoteId).default([]),
  /** A source stated in place of a footnote. */
  source: Text.optional(),
  /** Where the full fact lives: a home section and, optionally, the entity in it. */
  ref: z.strictObject({ section: z.enum(SECTION_IDS), id: Id.optional() }),
  film: Film,
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

/** Copy with named slots the page fills in, such as "It's {time} {place}": each slot must be there. */
const Template = (...slots: string[]) =>
  Text.refine((text) => slots.every((slot) => text.includes(`{${slot}}`)), { error: `needs ${slots.map((slot) => `{${slot}}`).join(" and ")}` });

const ContactCopy = z.strictObject({
  headline: Text,
  /** Akshat's live time: `{time}`, and `{place}` ("in Jaipur", or "IST" until the city is confirmed). */
  clock: Template("time", "place"),
  /** Akshat's working hours against the visitor's day, on the visitor's clock. */
  overlap: Template("from", "to"),
  noOverlap: Text,
  dock: z.strictObject({
    label: Text,
    email: Text,
    linkedin: Text,
    github: Text,
    resume: Text,
    copied: Text,
    notCopied: Text,
    openMail: Text,
  }),
  thread: z.strictObject({
    label: Text,
    greeting: Text,
    akshat: Text,
    you: Text,
    name: Text,
    email: Text,
    message: Text,
    send: Text,
    sending: Text,
    delivered: Text,
    sent: Text,
    /** The mail app's way in when the form can't send. */
    fallback: Text,
    /** Without JavaScript the form can't send, so this leads into the address itself. */
    nojs: Text,
    /** The subject of the email the form sends, and of the mail app's draft. */
    subject: Text,
    errors: z.strictObject({
      nameRequired: Text,
      nameLong: Text,
      emailRequired: Text,
      emailInvalid: Text,
      emailLong: Text,
      messageRequired: Text,
      messageLong: Text,
      rate: Text,
      unavailable: Text,
      failed: Text,
    }),
  }),
});

const FooterCopy = z.strictObject({
  credit: Text,
  notes: Text,
  map: Text,
  pages: z.strictObject({ specs: Text, colophon: Text }),
  settings: Text,
  cookies: Text,
  copyright: Template("year"),
});

/** A surprise in /colophon's list: its name, and how to find it. */
const Thing = z.strictObject({ name: Text, find: Text });

/** How the site is built (/colophon): rows like a spec sheet's. Facts about the site, not about Akshat. */
const ColophonCopy = z.strictObject({
  headline: Text,
  sub: Text,
  rows: z.array(z.strictObject({ label: Text, items: z.array(Text).min(1) })).min(1),
  /** The surprises (DESIGN.md §8), behind a spoiler: one per id in lib/surprises. */
  things: z.strictObject({ label: Text, show: Text, hide: Text, items: z.record(z.string(), Thing) }),
});

/** The surprises' own words (DESIGN.md §8). */
/**
 * Ask (DESIGN.md §6.3, Part 14): its words in Search. The answers come from the model, or
 * from the site's own text when it can't answer; these are the words around them.
 */
const AskCopy = z.strictObject({
  /** The group the suggested questions sit in, and the word before a question in the Top hit. */
  label: Text,
  /** What the Top hit says it does. */
  hint: Text,
  suggestions: z.array(Text).length(4),
  /** Over the source chips. */
  sources: Text,
  /** While the answer is on its way, for screen readers. */
  answering: Text,
  /** When the answer comes from the site's own text instead, and why. */
  fallback: z.strictObject({ unavailable: Text, rate: Text, offline: Text, nothing: Text }),
  /** When the model declines the question. */
  declined: Text,
  /** The way to ask Akshat instead. */
  contact: Text,
});

const SurprisesCopy = z.strictObject({
  devanagari: z.strictObject({ name: Text, note: Text }),
  clearSkies: Text,
  commands: z.strictObject({
    hello: z.strictObject({ phrase: Text, label: Text, answer: Text }),
    nineFortyOne: z.strictObject({ phrase: Text, label: Text, answer: Text }),
    sudo: z.strictObject({ phrase: Text, label: Text, answer: Text }),
    compare: z.strictObject({ phrase: Text, label: Text }),
    retro: z.strictObject({ phrase: Text, label: Text }),
    clarity: z.strictObject({ phrase: Text, label: Text }),
  }),
  console: z.strictObject({ greeting: Text }),
  notFound: z.strictObject({ headline: Text, sub: Text, action: Text }),
  compare: z.strictObject({
    headline: Text,
    picker: Text,
    none: Text,
    footnote: Text,
    rows: z.strictObject({ studying: Text, internships: Text, papers: Text, honors: Text, stack: Text }),
  }),
});

const Copy = z.strictObject({
  /** The hero's name, role and headline come from profile; its date line is live (Part 5). */
  hero: z.strictObject({ ctaWork: Text, ctaHello: Text }),
  statement: z.strictObject({
    headline: Text,
    /** The section's one gradient phrase (DESIGN.md §4.4). It must appear in the headline once. */
    emphasis: Text,
  }),
  about: z.strictObject({
    headline: Text,
    /** Labels the quiet line of what Akshat is building, researching and reading. */
    currently: Text,
    /** The bento's heading. */
    glance: Text,
    /** The local-time tile shows how Akshat's working hours overlap a visitor's working day. */
    visitorDay: z.strictObject({ start: Time, end: Time }),
  }),
  highlights: z.strictObject({ eyebrow: Text }),
  experience: SectionCopy,
  research: SectionCopy.extend({
    /** Under every concept illustration, so none reads as a result. */
    caption: Text,
  }),
  work: SectionCopy.extend({
    /** The bento's filter: each shows the projects in its categories. */
    filters: z
      .array(z.strictObject({ id: Id, label: Text, categories: z.array(ProjectCategory).min(1) }))
      .min(1),
    /** The label for the filter group, for assistive tech. */
    filterLabel: Text,
    /** A case study's words around the project's own (DESIGN.md §7.6). */
    caseStudy: z.strictObject({
      chapters: z.strictObject({ problem: Text, approach: Text, outcome: Text, built: Text }),
      facts: z.strictObject({ year: Text, role: Text, stack: Text }),
      architecture: Text,
      links: z.strictObject({ repo: Text, live: Text }),
      next: Text,
      back: Text,
      notes: Text,
    }),
  }),
  skills: SectionCopy.extend({
    /** The chip (DESIGN.md §7.7): its layers, top to bottom, by category name, and its words. */
    chip: z.strictObject({
      label: Text,
      layers: z.array(Text).min(1),
      /** "skill" and "skills", after a layer's count. */
      unit: z.strictObject({ one: Text, other: Text }),
      cores: Text,
    }),
    core: z.strictObject({ headline: Text, usedIn: Text }),
    /** The segmented control between the two views of every skill. */
    views: z.strictObject({ label: Text, specs: Text, cloud: Text }),
    /** "Show me where": the Island's jump, and what it says when nothing names a skill. */
    showMe: z.strictObject({ jump: Text, none: Text, clear: Text }),
    specsLink: Text,
  }),
  /** The full tech-specs page (/specs). */
  specs: z.strictObject({ headline: Text, sub: Text.optional(), education: Text, coursework: Text, back: Text }),
  credentials: SectionCopy.extend({
    /** Used while there are no certificates, so the heading never counts zero (DESIGN.md §12). */
    headlineWithoutCertificates: Text,
    honors: Text,
    /** The wallet's words around each pass's own (DESIGN.md §7.8). */
    wallet: z.strictObject({
      label: Text,
      education: Text,
      certificate: Text,
      classOf: Text,
      grade: Text,
      issued: Text,
      credentialId: Text,
      skills: Text,
      proves: Text,
      verify: Text,
      expires: Text,
      expired: Text,
      never: Text,
      coursework: Text,
      flip: Text,
      scan: Text,
    }),
    medals: z.strictObject({ label: Text, flip: Text, medal: Text }),
  }),
  contact: ContactCopy,
  footer: FooterCopy,
  colophon: ColophonCopy,
  surprises: SurprisesCopy,
  ask: AskCopy,
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
export type Illustration = z.output<typeof Illustration>;
export type Education = z.output<typeof Education>;
export type Degree = z.output<typeof Degree>;
export type Publication = z.output<typeof Publication>;
export type Conference = z.output<typeof Conference>;
export type Project = z.output<typeof Project>;
export type ProjectPreview = z.output<typeof ProjectPreview>;
export type ArchitectureNode = z.output<typeof ArchitectureNode>;
export type Skill = z.output<typeof Skill>;
export type Certificate = z.output<typeof Certificate>;
export type Achievement = z.output<typeof Achievement>;
export type Highlight = z.output<typeof Highlight>;
export type Film = z.output<typeof Film>;
export type Metric = z.output<typeof Metric>;
export type RoleVisual = z.output<typeof RoleVisual>;
export type Portrait = z.output<typeof Portrait>;

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
    if (project.problem) yield { path: ["projects", i, "problem"], ...project.problem };
    if (project.outcome) yield { path: ["projects", i, "outcome"], ...project.outcome };
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

// ─── Films ───────────────────────────────────────────────────────────────────

/** Every figure a film draws. Counts it derives from content (papers) aren't listed. */
export function filmFigures(film: z.output<typeof Film>): number[] {
  switch (film.kind) {
    case "fan-out":
    case "condense":
      return [film.from, film.to];
    case "cost":
      return [...film.cost, ...film.compression];
    case "roc":
      return [film.auc];
    case "ring":
      return [film.percent];
    case "bars":
      return [film.value];
    case "papers":
      return [];
  }
}

/** Every figure a role's visual draws. */
export function visualFigures(visual: z.output<typeof RoleVisual>): number[] {
  switch (visual.kind) {
    case "tangle-to-map":
      return [visual.calls, visual.documents, ...visual.cost];
    case "module-blocks":
      return [visual.modules, visual.coverage, visual.defects];
    case "dashboard":
      return [visual.users];
    case "route-segments":
      return [];
  }
}

// ─── Cross-references ────────────────────────────────────────────────────────

/** Words that frame a diagram rather than state a fact, so need no source. */
const FRAMING_WORDS = new Set(["query", "data"]);

/**
 * The words of a phrase that a project's own text doesn't use (DESIGN.md §7.6). A word of
 * four letters or more counts as used when the text has a word that starts the same way
 * (its first five letters, or all of a shorter word): "Summary" is "summarization"'s.
 */
/** The contrast of white text on a #rrggbb color (WCAG 2's relative luminance). */
export function contrastWithWhite(hex: string): number {
  const channel = (offset: number) => {
    const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}

export function ungroundedWords(phrase: string, text: string): string[] {
  const words = new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  const stems = [...words].map((word) => word.slice(0, 5));
  return (phrase.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => {
    if (word.length < 4 || FRAMING_WORDS.has(word) || words.has(word)) return false;
    return !stems.includes(word.slice(0, 5));
  });
}

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

  // A film draws only figures its highlight's notes state, and its papers exist.
  const notes = new Map(content.footnotes.map((footnote) => [footnote.id, footnote]));
  content.highlights.forEach((highlight, i) => {
    const { film } = highlight;
    if (film.kind === "papers") {
      if (!conferences.has(film.conference)) problem(["highlights", i, "film", "conference"], `no conference with id "${film.conference}"`);
      else if (!content.publications.some((paper) => paper.presentedAt === film.conference)) {
        problem(["highlights", i, "film", "conference"], `no paper was presented at "${film.conference}"`);
      }
      return;
    }
    // A missing footnote is reported above; its figures can't be checked without it.
    if (highlight.footnotes.some((n) => !notes.has(n))) return;
    const cited = [
      highlight.text,
      highlight.source ?? "",
      ...highlight.footnotes.flatMap((n) => [notes.get(n)?.note ?? "", notes.get(n)?.source ?? ""]),
    ].join(" ");
    const stated = valuesIn(cited);
    for (const figure of filmFigures(film)) {
      if (!stated.includes(figure)) problem(["highlights", i, "film"], `${figure} isn't stated by the notes this highlight cites`);
    }
  });

  // A role's metrics and visual state only what its text and notes do, and every number its
  // text states is a metric, so "the edit" can footnote each one once.
  content.experience.forEach((role, i) => {
    if (role.short && !role.org.includes(role.short)) problem(["experience", i, "short"], `"${role.short}" isn't part of "${role.org}"`);
    const claims = [role.summary, ...role.bullets];
    const cited = new Set([...claims.flatMap((claim) => claim.footnotes), ...role.metrics.flatMap((metric) => metric.footnotes)]);
    role.metrics.forEach((metric, j) => {
      metric.footnotes.forEach((id, k) => {
        if (!notes.has(id)) problem(["experience", i, "metrics", j, "footnotes", k], `footnote ${id} doesn't exist`);
      });
    });
    if ([...cited].some((id) => !notes.has(id))) return;
    const stated = valuesIn(
      [...claims.map((claim) => claim.text), ...[...cited].flatMap((id) => [notes.get(id)!.note, notes.get(id)!.source ?? ""])].join(" "),
    );
    const counted = role.metrics.flatMap((metric) => (Array.isArray(metric.value) ? metric.value : [metric.value]));
    role.metrics.forEach((metric, j) => {
      for (const value of Array.isArray(metric.value) ? metric.value : [metric.value]) {
        if (!stated.includes(value)) problem(["experience", i, "metrics", j], `${value} isn't stated by this role or the notes it cites`);
      }
    });
    if (role.visual) {
      for (const figure of visualFigures(role.visual)) {
        if (!stated.includes(figure)) problem(["experience", i, "visual"], `${figure} isn't stated by this role or the notes it cites`);
      }
    }
    // Text with a phone-shaped number already fails, and its digits must never be repeated.
    const text = claims.map((claim) => claim.text).join(" ");
    if (findPhoneNumbers(text).length === 0) {
      for (const value of new Set(valuesIn(text))) {
        if (!counted.includes(value)) problem(["experience", i, "metrics"], `${value} is in this role's text but isn't one of its metrics`);
      }
    }
  });

  // A project's metrics follow the same rules, its preview's figures too, and its diagram
  // and preview speak only in its own words.
  content.projects.forEach((project, i) => {
    const claims = [project.tagline, project.summary];
    const cited = new Set([...claims.flatMap((claim) => claim.footnotes), ...project.metrics.flatMap((metric) => metric.footnotes)]);
    project.metrics.forEach((metric, j) => {
      metric.footnotes.forEach((id, k) => {
        if (!notes.has(id)) problem(["projects", i, "metrics", j, "footnotes", k], `footnote ${id} doesn't exist`);
      });
    });
    project.architecture.nodes.forEach((node, j) => {
      node.footnotes.forEach((id, k) => {
        if (!notes.has(id)) problem(["projects", i, "architecture", "nodes", j, "footnotes", k], `footnote ${id} doesn't exist`);
      });
    });
    if ([...cited].some((id) => !notes.has(id))) return;
    const own = [project.name, project.category, ...claims.map((claim) => claim.text), ...(project.stack ?? [])].join(" ");
    const stated = valuesIn([own, ...[...cited].flatMap((id) => [notes.get(id)!.note, notes.get(id)!.source ?? ""])].join(" "));
    const counted = project.metrics.flatMap((metric) => (Array.isArray(metric.value) ? metric.value : [metric.value]));
    project.metrics.forEach((metric, j) => {
      for (const value of Array.isArray(metric.value) ? metric.value : [metric.value]) {
        if (!stated.includes(value)) problem(["projects", i, "metrics", j], `${value} isn't stated by this project or the notes it cites`);
      }
    });
    if (project.preview.kind === "roc") {
      for (const figure of [project.preview.auc, project.preview.accuracy]) {
        if (!counted.includes(figure)) problem(["projects", i, "preview"], `${figure} isn't one of this project's metrics`);
      }
    }
    const text = claims.map((claim) => claim.text).join(" ");
    if (findPhoneNumbers(text).length === 0) {
      for (const value of new Set(valuesIn(text))) {
        if (!counted.includes(value)) problem(["projects", i, "metrics"], `${value} is in this project's text but isn't one of its metrics`);
      }
    }
    const words = own.toLowerCase();
    const ungrounded = (phrase: string) => ungroundedWords(phrase, words);
    const ids = new Set<string>();
    project.architecture.nodes.forEach((node, j) => {
      if (ids.has(node.id)) problem(["projects", i, "architecture", "nodes", j, "id"], `"${node.id}" is used twice`);
      ids.add(node.id);
      for (const phrase of [node.from ?? node.label, ...(node.from ? [] : [node.detail ?? ""])]) {
        const missing = ungrounded(phrase);
        if (missing.length > 0) problem(["projects", i, "architecture", "nodes", j], `"${missing.join(", ")}" isn't in this project's own words`);
      }
    });
    project.architecture.edges.forEach((edge, j) => {
      for (const id of edge.slice(0, 2)) {
        if (!ids.has(id)) problem(["projects", i, "architecture", "edges", j], `no box "${id}"`);
      }
    });
    if ("labels" in project.preview) {
      for (const [slot, label] of Object.entries(project.preview.labels)) {
        const missing = ungrounded(label);
        if (missing.length > 0) problem(["projects", i, "preview", "labels", slot], `"${missing.join(", ")}" isn't in this project's own words`);
      }
    }
  });

  // The work filter's ids are unique.
  unique(content.copy.work.filters, (filter) => filter.id, ["copy", "work", "filters"], "id");

  // The statement's gradient phrase is in the statement, once.
  const { headline, emphasis } = content.copy.statement;
  if (headline.split(emphasis).length !== 2) problem(["copy", "statement", "emphasis"], "must appear in the headline exactly once");

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

  // Each medal is minted in a shape of its own, and its line states only what its detail does.
  unique(content.achievements, (achievement) => achievement.medal.shape, ["achievements"], "medal shape");
  content.achievements.forEach((achievement, i) => {
    const line = achievement.medal.line;
    if (!line) return;
    const stated = new Set(valuesIn(achievement.detail?.text ?? ""));
    for (const value of valuesIn(line)) {
      if (!stated.has(value)) problem(["achievements", i, "medal", "line"], `${value} isn't in this achievement's detail`);
    }
  });

  // White text must read on a pass's own color (WCAG AA, 4.5:1).
  content.certificates.forEach((certificate, i) => {
    if (certificate.tone && contrastWithWhite(certificate.tone) < 4.5) {
      problem(["certificates", i, "tone"], `white text on ${certificate.tone} is ${contrastWithWhite(certificate.tone).toFixed(2)}:1, under 4.5:1`);
    }
  });

  // The chip's layers are the skill categories, each exactly once.
  const layers = content.copy.skills.chip.layers;
  const categories = content.skills.map((category) => category.name);
  layers.forEach((name, i) => {
    if (!categories.includes(name)) problem(["copy", "skills", "chip", "layers", i], `"${name}" isn't a skill category`);
  });
  for (const name of categories) {
    if (!layers.includes(name)) problem(["copy", "skills", "chip", "layers"], `"${name}" has no layer`);
  }
  unique(layers, (name) => name, ["copy", "skills", "chip", "layers"], "layer");

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
