/**
 * Everything computed from content. Each function is pure: the same content and the same
 * `now` always give the same answer, so tests pin `now` and pages pass the real time.
 * "Today" is the calendar date in Akshat's time zone (profile.location.timeZone).
 *
 * Runs under plain Node for the prebuild content check: relative imports with .ts
 * extensions, `import type` for types, no path aliases.
 */
import type { Content, Degree, Education, Path, Publication } from "./schema.ts";
import { claimsOf, formatPath, resolvePattern } from "./schema.ts";
import type { CalendarDate } from "../lib/dates.ts";
import {
  calendarDateIn,
  daysBetween,
  endOfMonthExclusive,
  formatYearMonth,
  monthIndex,
  monthsInclusive,
  parseIsoDate,
  parseYearMonth,
  toIsoDate,
  utcDate,
} from "../lib/dates.ts";
import type { SectionId } from "../lib/sections.ts";
import { SECTIONS } from "../lib/sections.ts";

// ─── Basics ──────────────────────────────────────────────────────────────────

/** Today's calendar date in Akshat's time zone. */
export function todayFor(content: Content, now: Date): CalendarDate {
  return calendarDateIn(content.profile.location.timeZone, now);
}

export function counts(content: Content) {
  return {
    internships: content.experience.filter((role) => role.kind === "internship").length,
    papers: content.publications.length,
    projects: content.projects.length,
    skills: allSkills(content).length,
    certificates: content.certificates.length,
    achievements: content.achievements.length,
  };
}

/** The current role: "AI & ML Intern (Generative AI) at United Airlines, since 2026-06". */
export function nowRole(content: Content) {
  const role = content.experience.find((entry) => entry.id === content.profile.now);
  if (!role) throw new Error(`profile.now points at a missing role: ${content.profile.now}`);
  return { id: role.id, org: role.org, role: role.role, since: role.start };
}

/** Where the site may say Akshat is. Only the country shows until the city is confirmed. */
export function publicLocation(content: Content) {
  const { city, cityConfirmed, country, timeZone } = content.profile.location;
  return {
    place: cityConfirmed ? `${city}, ${country}` : country,
    /** null until confirmed; callers show the time zone label instead. */
    city: cityConfirmed ? city : null,
    timeZone,
    timeZoneLabel: timeZoneLabel(timeZone),
  };
}

function timeZoneLabel(timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-IN", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date(0))
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** "Credentials." with at least one certificate, "Education." with none. Never a zero. */
export function credentialsHeadline(content: Content): string {
  const { headline, headlineWithoutCertificates } = content.copy.credentials;
  return content.certificates.length > 0 ? headline : headlineWithoutCertificates;
}

/** Accepted and presented, until a DOI makes it published. */
export function publicationStatus(paper: Publication) {
  return paper.doi
    ? ({ status: "published", label: "Published" } as const)
    : ({ status: "accepted-presented", label: "Accepted and presented" } as const);
}

// ─── Durations and graduation ────────────────────────────────────────────────

/** Each role's length in calendar months, counting the first and last month (Jul–Aug is 2). */
export function roleDurations(content: Content, now: Date) {
  const today = todayFor(content, now);
  return content.experience.map((role) => {
    const end = role.end === "present" ? today : parseYearMonth(role.end);
    const months = Math.max(0, monthsInclusive(parseYearMonth(role.start), end));
    return { id: role.id, start: role.start, end: role.end, months, label: monthsLabel(months) };
  });
}

function monthsLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${rest === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

/**
 * Degree progress from the first day of the start month to the first day of the
 * graduation month, measured against today. Content knows the month, not the day.
 */
export function graduation(content: Content, now: Date) {
  const degree = content.education.find(isDegree);
  if (!degree) return null;
  const today = todayFor(content, now);
  const todayDate = utcDate(today.year, today.month, today.day);
  const start = parseYearMonth(degree.start);
  const end = parseYearMonth(degree.end);
  const startDate = utcDate(start.year, start.month);
  const endDate = utcDate(end.year, end.month);
  const progress = clamp(daysBetween(startDate, todayDate) / daysBetween(startDate, endDate), 0, 1);
  return {
    id: degree.id,
    institution: degree.institution,
    start: degree.start,
    end: degree.end,
    progress,
    /** Rounded down, so it never overstates. */
    percent: Math.floor(progress * 100),
    monthsRemaining: Math.max(0, monthIndex(end) - monthIndex(today)),
    daysToGraduationMonth: Math.max(0, daysBetween(todayDate, endDate)),
    graduated: todayDate >= endDate,
  };
}

// ─── Skills and evidence ─────────────────────────────────────────────────────

export function allSkills(content: Content) {
  return content.skills.flatMap((category) =>
    category.skills.map((skill) => ({
      id: slugify(skill.name),
      category: category.name,
      name: skill.name,
      label: skill.detail ? `${skill.name} (${skill.detail})` : skill.name,
      core: skill.core,
      aliases: skill.aliases,
    })),
  );
}

type EvidenceKind = "role" | "project" | "paper";

/** The roles, projects and papers to search, each with its date (null when unknown). */
function evidenceSources(content: Content) {
  const conferences = new Map(content.conferences.map((conference) => [conference.id, conference]));
  return [
    ...content.experience.map((role) => ({
      kind: "role" as EvidenceKind,
      id: role.id,
      title: role.org,
      year: parseYearMonth(role.start).year as number | null,
      text: [role.role, role.summary.text, ...role.bullets.map((b) => b.text), ...role.stack].join("\n"),
    })),
    ...content.projects.map((project) => ({
      kind: "project" as EvidenceKind,
      id: project.slug,
      title: project.name,
      year: project.year,
      text: [project.name, project.tagline.text, project.category, project.summary.text, ...(project.stack ?? [])].join(
        "\n",
      ),
    })),
    ...content.publications.map((paper) => {
      const conference = conferences.get(paper.presentedAt);
      return {
        kind: "paper" as EvidenceKind,
        id: paper.slug,
        title: paper.title,
        year: conference ? parseIsoDate(conference.start).year : null,
        text: [paper.title, paper.tldr, ...paper.keywords].join("\n"),
      };
    }),
  ];
}

/**
 * Whole-term, case-insensitive match. A dotted name is one word, so "JS" doesn't match
 * "Next.js" and "Node" doesn't match "Node.js". "Java" doesn't match "JavaScript", "SQL"
 * doesn't match "PostgreSQL" and "Git" doesn't match "GitHub". "Django" does match
 * "Django REST Framework", because there it's a word of its own.
 */
export function mentions(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}]\\.?)${escaped}(?!\\.?[\\p{L}\\p{N}])`, "iu").test(text);
}

/** For each skill: the roles, projects and papers that name it or one of its aliases. */
export function skillEvidence(content: Content) {
  const sources = evidenceSources(content);
  return allSkills(content).map((skill) => {
    const terms = [skill.name, ...skill.aliases];
    const hits = sources.flatMap((source) => {
      const matched = terms.filter((term) => mentions(source.text, term));
      return matched.length > 0
        ? [{ kind: source.kind, id: source.id, title: source.title, year: source.year, matched }]
        : [];
    });
    return {
      ...skill,
      roles: hits.filter((hit) => hit.kind === "role"),
      projects: hits.filter((hit) => hit.kind === "project"),
      papers: hits.filter((hit) => hit.kind === "paper"),
      /** The earliest year a dated role, project or paper used it. null if none is dated. */
      firstYear: minOrNull(hits.map((hit) => hit.year)),
    };
  });
}

// ─── Timeline (Part 7) ───────────────────────────────────────────────────────

export type TrackId = "work" | "research" | "education" | "honors";

export interface Clip {
  id: string;
  title: string;
  subtitle?: string;
  /** Inclusive start, "YYYY-MM-DD". */
  start: string;
  /** Exclusive end, "YYYY-MM-DD". An ongoing clip ends after today (or at its future end). */
  end: string;
  ongoing: boolean;
  /** How precisely content knows the dates. A "year" clip renders as a year bracket. */
  precision: "day" | "month" | "year";
  /** Clips that overlap within a track stack on separate lanes, starting at 0. */
  lane: number;
  ref: { section: SectionId; id?: string };
}

export interface Track {
  id: TrackId;
  label: string;
  lanes: number;
  clips: Clip[];
}

/** The multi-track career timeline, on a real time scale from the first clip to today. */
export function timeline(content: Content, now: Date) {
  const today = todayFor(content, now);
  const todayDate = utcDate(today.year, today.month, today.day);
  const afterToday = toIsoDate(utcDate(today.year, today.month, today.day + 1));

  const work = content.experience.map((role): Omit<Clip, "lane"> => {
    const start = parseYearMonth(role.start);
    const ongoing = role.end === "present";
    return {
      id: role.id,
      title: role.org,
      subtitle: role.role,
      start: toIsoDate(utcDate(start.year, start.month)),
      end: ongoing ? afterToday : toIsoDate(endOfMonthExclusive(parseYearMonth(role.end))),
      ongoing,
      precision: "month",
      ref: { section: "experience", id: role.id },
    };
  });

  const research = content.conferences.map((conference): Omit<Clip, "lane"> => {
    const papers = content.publications.filter((paper) => paper.presentedAt === conference.id).length;
    const last = parseIsoDate(conference.end);
    return {
      id: conference.id,
      title: conference.name,
      subtitle: `${papers} ${papers === 1 ? "paper" : "papers"} · ${conference.host}, ${conference.city}`,
      start: conference.start,
      end: toIsoDate(utcDate(last.year, last.month, last.day + 1)),
      ongoing: false,
      precision: "day",
      ref: { section: "research" },
    };
  });

  const education = content.education.filter(isDegree).map((degree): Omit<Clip, "lane"> => {
    const start = parseYearMonth(degree.start);
    const end = endOfMonthExclusive(parseYearMonth(degree.end));
    return {
      id: degree.id,
      title: degree.institution,
      subtitle: `${degree.degree}, ${degree.field}`,
      start: toIsoDate(utcDate(start.year, start.month)),
      end: toIsoDate(end),
      ongoing: end > todayDate,
      precision: "month",
      ref: { section: "credentials", id: degree.id },
    };
  });

  const honors = content.achievements.flatMap((achievement) =>
    achievement.years.map(
      (year): Omit<Clip, "lane"> => ({
        id: achievement.years.length > 1 ? `${achievement.id}-${year}` : achievement.id,
        title: achievement.title,
        subtitle: achievement.org,
        start: `${year}-01-01`,
        end: `${year + 1}-01-01`,
        ongoing: false,
        precision: "year",
        ref: { section: "credentials", id: achievement.id },
      }),
    ),
  );

  const tracks: Track[] = [
    track("work", "Work", work),
    track("research", "Research", research),
    track("education", "Education", education),
    track("honors", "Honors", honors),
  ];
  const starts = tracks.flatMap((t) => t.clips.map((clip) => clip.start)).sort();
  return {
    start: starts[0] ?? toIsoDate(todayDate),
    today: toIsoDate(todayDate),
    tracks,
  };
}

/** Puts each clip on the first lane that's free when it starts (longest first on ties). */
function track(id: TrackId, label: string, clips: Omit<Clip, "lane">[]): Track {
  const sorted = [...clips].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
  const laneEnds: string[] = [];
  const placed = sorted.map((clip) => {
    let lane = laneEnds.findIndex((end) => end <= clip.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = clip.end;
    return { ...clip, lane };
  });
  return { id, label, lanes: laneEnds.length, clips: placed };
}

// ─── /compare (Part 13) ──────────────────────────────────────────────────────

export type CompareRowId = "studying" | "internships" | "papers" | "honors" | "stack";

/**
 * Year columns from the first timeline year to this year, built only from dated entries.
 * Undated projects stay out until they have a year, and nothing is estimated.
 */
export function compareTable(content: Content, now: Date) {
  const today = todayFor(content, now);
  const firstYear = Number(timeline(content, now).start.slice(0, 4));
  const years = range(firstYear, today.year);
  const conferences = new Map(content.conferences.map((conference) => [conference.id, conference]));
  const internships = content.experience
    .filter((role) => role.kind === "internship")
    .sort((a, b) => a.start.localeCompare(b.start));
  const evidence = skillEvidence(content);

  const row = (id: CompareRowId, label: string, cell: (year: number) => string[]) => ({
    id,
    label,
    cells: Object.fromEntries(years.map((year) => [year, cell(year)])) as Record<number, string[]>,
  });

  return {
    years,
    rows: [
      row("studying", "Studying", (year) =>
        content.education.flatMap((entry) =>
          entry.kind === "degree"
            ? parseYearMonth(entry.start).year <= year && year <= parseYearMonth(entry.end).year
              ? [`${entry.degree}, ${entry.field} · ${entry.institution}`]
              : []
            : entry.year === year
              ? [`${entry.level} (${entry.board})`]
              : [],
        ),
      ),
      row("internships", "Internships to date", (year) =>
        internships.filter((role) => parseYearMonth(role.start).year <= year).map((role) => role.org),
      ),
      row("papers", "Papers", (year) =>
        content.publications
          .filter((paper) => {
            const conference = conferences.get(paper.presentedAt);
            return conference ? parseIsoDate(conference.start).year === year : false;
          })
          .map((paper) => paper.title),
      ),
      row("honors", "Honors", (year) =>
        content.achievements.filter((achievement) => achievement.years.includes(year)).map((a) => a.title),
      ),
      row("stack", "Joined the stack", (year) =>
        evidence.filter((skill) => skill.firstYear === year).map((skill) => skill.label),
      ),
    ],
  };
}

// ─── The hero (Part 5) ───────────────────────────────────────────────────────

/** "Computer Science and Engineering" → "CSE": the initials, without the small words. */
export function initialism(field: string): string {
  return field
    .split(/\s+/)
    .filter((word) => !/^(and|of|the|in|&)$/i.test(word))
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export interface HeroChip {
  label: string;
  /** The home section that tells the rest. */
  section: SectionId;
}

/**
 * The hero's context chips (DESIGN.md §7): where Akshat works now, the degree, and the
 * conference. Each is derived; a chip whose facts are missing is left out.
 */
export function heroChips(content: Content): HeroChip[] {
  const chips: HeroChip[] = [];
  const now = content.experience.find((role) => role.id === content.profile.now);
  if (now) chips.push({ label: `Now at ${now.org}`, section: "experience" });
  const degree = content.education.find((entry) => entry.kind === "degree");
  if (degree?.kind === "degree") {
    const year = degree.end.slice(2, 4);
    chips.push({
      label: `${degree.degree} ${initialism(degree.field)} \u2019${year} \u00b7 ${degree.institution}`,
      section: "credentials",
    });
  }
  const paper = content.publications[0];
  const conference = paper && content.conferences.find((entry) => entry.id === paper.presentedAt);
  if (conference) chips.push({ label: `${conference.name} \u00b7 ${conference.proceedings}`, section: "research" });
  return chips;
}

/**
 * How the date line names Akshat's clock: the city once it's confirmed ("in Jaipur"),
 * the time zone until then ("IST").
 */
export function clockPlace(content: Content): { label: string; timeZone: string } {
  const location = publicLocation(content);
  return { label: location.city ? `in ${location.city}` : location.timeZoneLabel, timeZone: location.timeZone };
}

// ─── Search index (Part 4) ───────────────────────────────────────────────────

export type SearchKind = "section" | "role" | "work" | "paper" | "skill" | "education" | "honor" | "certificate";

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** Words that should find the entry even though its title doesn't say them. */
  keywords: string[];
  /** The rest of its text, for fuzzy matching. */
  body: string;
}

/** The build-time search index. Part 4 adds fuzzy matching and the actions. */
export function searchIndex(content: Content): SearchEntry[] {
  const evidence = skillEvidence(content);
  const skillsUsedBy = (kind: EvidenceKind, id: string) =>
    evidence
      .filter((skill) => [...skill.roles, ...skill.projects, ...skill.papers].some((h) => h.kind === kind && h.id === id))
      .flatMap((skill) => [skill.name, ...skill.aliases]);
  const conferences = new Map(content.conferences.map((conference) => [conference.id, conference]));
  const sectionCopy: Partial<Record<SectionId, { headline: string; sub?: string }>> = {
    about: content.copy.about,
    experience: content.copy.experience,
    research: content.copy.research,
    work: content.copy.work,
    skills: content.copy.skills,
    credentials: content.copy.credentials,
    contact: content.copy.contact,
  };

  const entries: SearchEntry[] = [
    ...SECTIONS.map((section) => {
      const copy = sectionCopy[section.id];
      return {
        id: `section:${section.id}`,
        kind: "section" as const,
        title: section.name,
        subtitle: copy?.headline ?? "",
        href: `/#${section.id}`,
        keywords: [],
        body: copy?.sub ?? "",
      };
    }),
    ...content.experience.map((role) => ({
      id: `role:${role.id}`,
      kind: "role" as const,
      title: role.org,
      subtitle: `${role.role} · ${formatYearMonth(role.start)} – ${
        role.end === "present" ? "present" : formatYearMonth(role.end)
      }`,
      href: "/#experience",
      keywords: unique([...role.stack, ...skillsUsedBy("role", role.id)]),
      body: [role.summary.text, ...role.bullets.map((b) => b.text)].join(" "),
    })),
    ...(() => {
      const { building } = content.currentFocus;
      const role = content.experience.find((entry) => entry.id === building.experience);
      return [
        {
          id: `role:${slugify(building.name)}`,
          kind: "role" as const,
          title: building.name,
          subtitle: building.detail,
          href: "/#experience",
          keywords: role ? unique([...role.stack, ...skillsUsedBy("role", role.id)]) : [],
          body: role ? role.bullets.map((b) => b.text).join(" ") : "",
        },
      ];
    })(),
    ...content.projects.map((project) => ({
      id: `work:${project.slug}`,
      kind: "work" as const,
      title: project.name,
      subtitle: project.tagline.text,
      href: `/work/${project.slug}`,
      keywords: unique([project.category, ...(project.stack ?? []), ...skillsUsedBy("project", project.slug)]),
      body: project.summary.text,
    })),
    ...content.publications.map((paper) => {
      const conference = conferences.get(paper.presentedAt);
      return {
        id: `paper:${paper.slug}`,
        kind: "paper" as const,
        title: paper.title,
        subtitle: conference ? `${conference.name} · ${conference.proceedings}` : "",
        href: `/research/${paper.slug}`,
        keywords: unique([...paper.keywords, ...skillsUsedBy("paper", paper.slug)]),
        body: paper.tldr,
      };
    }),
    ...allSkills(content).map((skill) => ({
      id: `skill:${skill.id}`,
      kind: "skill" as const,
      title: skill.label,
      subtitle: skill.category,
      href: "/#skills",
      keywords: skill.aliases,
      body: "",
    })),
    ...content.education.map((entry) => ({
      id: `education:${entry.id}`,
      kind: "education" as const,
      title: entry.kind === "degree" ? entry.institution : `${entry.level} (${entry.board})`,
      subtitle: entry.kind === "degree" ? `${entry.degree}, ${entry.field}` : String(entry.year),
      href: "/#credentials",
      keywords: entry.kind === "degree" ? entry.coursework : [],
      body: "",
    })),
    ...content.achievements.map((achievement) => ({
      id: `honor:${achievement.id}`,
      kind: "honor" as const,
      title: achievement.title,
      subtitle: [achievement.org, achievement.years.join(" · ")].filter(Boolean).join(" · "),
      href: "/#credentials",
      keywords: [],
      body: achievement.detail?.text ?? "",
    })),
    ...content.certificates.map((certificate) => ({
      id: `certificate:${certificate.id}`,
      kind: "certificate" as const,
      title: certificate.title,
      subtitle: certificate.issuer,
      href: "/#credentials",
      keywords: certificate.skills,
      body: certificate.proves ?? "",
    })),
  ];
  return entries;
}

// ─── Warnings, gaps and drafts ───────────────────────────────────────────────

export type WarningKind = "number-without-footnote" | "paper-without-doi" | "project-without-year";

export interface ContentWarning {
  kind: WarningKind;
  path: string;
  message: string;
}

/**
 * Names and versions that contain digits but state no claim. A new one shows up as a
 * "number without a footnote" warning; add it here if it isn't a claim.
 */
export const NAMES_WITH_DIGITS = [
  "GPT-4.1",
  "Claude Sonnet 4.5",
  "Gemini 1.5",
  "Next.js 16",
  "SHA-256",
  "WCAG 2.1",
  "PM2.5",
  "SCI-2026",
  "Fortune 500",
  "HTML5",
  "A2A",
];

/** The numbers in a text that need a footnote: everything except names, versions and years. */
export function numbersIn(text: string): string[] {
  let rest = text;
  for (const name of NAMES_WITH_DIGITS) rest = rest.split(name).join(" ");
  // Years and year ranges ("2027", "2025–26"), but not "2,500" or "2025.5".
  rest = rest.replace(/(?<!\d|\d[.,])(?:19|20)\d{2}(?:–\d{2})?(?!\d|[.,]\d|[%+])/g, " ");
  return (rest.match(/[$~]?\d[\d.,/–-]*[%+]?/g) ?? []).map((n) => n.replace(/[.,–-]+$/, ""));
}

/** Warnings don't fail the build. They list what Akshat should look at. */
export function warnings(content: Content): ContentWarning[] {
  const list: ContentWarning[] = [];
  for (const claim of claimsOf(content)) {
    if (claim.footnotes.length > 0) continue;
    const numbers = numbersIn(claim.text);
    if (numbers.length > 0) {
      list.push({
        kind: "number-without-footnote",
        path: formatPath(claim.path, content),
        message: `${numbers.map((n) => `"${n}"`).join(", ")} ${numbers.length === 1 ? "has" : "have"} no footnote`,
      });
    }
  }
  content.publications.forEach((paper, i) => {
    if (!paper.doi) {
      list.push({
        kind: "paper-without-doi",
        path: formatPath(["publications", i, "doi"], content),
        message: "no DOI yet, so it reads as accepted and presented",
      });
    }
  });
  content.projects.forEach((project, i) => {
    if (project.year === null) {
      list.push({
        kind: "project-without-year",
        path: formatPath(["projects", i, "year"], content),
        message: "no year yet, so it stays off the timeline and /compare",
      });
    }
  });
  return list;
}

/** Every null field: the gaps only Akshat can fill. */
export function gaps(content: Content): string[] {
  const found: string[] = [];
  const visit = (value: unknown, path: Path) => {
    if (value === null) found.push(formatPath(path, content));
    else if (Array.isArray(value)) value.forEach((item, i) => visit(item, [...path, i]));
    else if (typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) visit(child, [...path, key]);
    }
  };
  visit(content, []);
  return found;
}

/** Copy still awaiting approval, expanded to the fields each pattern covers. */
export function drafts(content: Content) {
  return content.drafts.map((pattern) => ({
    pattern,
    paths: resolvePattern(content, pattern).map((match) => formatPath(match.path, content)),
  }));
}

// ─── Everything at once ──────────────────────────────────────────────────────

/** All derived values, for /dev/content and the build-time check. */
export function derive(content: Content, now: Date) {
  const today = todayFor(content, now);
  return {
    today: toIsoDate(utcDate(today.year, today.month, today.day)),
    counts: counts(content),
    now: nowRole(content),
    location: publicLocation(content),
    credentialsHeadline: credentialsHeadline(content),
    publications: content.publications.map((paper) => ({ slug: paper.slug, ...publicationStatus(paper) })),
    durations: roleDurations(content, now),
    graduation: graduation(content, now),
    skillEvidence: skillEvidence(content),
    timeline: timeline(content, now),
    compare: compareTable(content, now),
    searchIndex: searchIndex(content),
    warnings: warnings(content),
    gaps: gaps(content),
    drafts: drafts(content),
  };
}

export type Derived = ReturnType<typeof derive>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDegree(entry: Education): entry is Degree {
  return entry.kind === "degree";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

function minOrNull(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length > 0 ? Math.min(...known) : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\+/g, "p")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
