/**
 * Everything computed from content. Each function is pure: the same content and the same
 * `now` always give the same answer, so tests pin `now` and pages pass the real time.
 * "Today" is the calendar date in Akshat's time zone (profile.location.timeZone).
 *
 * Runs under plain Node for the prebuild content check: relative imports with .ts
 * extensions, `import type` for types, no path aliases.
 */
import type { Claim, Conference, Content, Degree, Education, Illustration, Path, Project, ProjectPreview, Publication, RoleVisual } from "./schema.ts";
import { claimsOf, formatPath, resolvePattern } from "./schema.ts";
import type { CalendarDate } from "../lib/dates.ts";
import {
  calendarDateIn,
  endOfMonthExclusive,
  formatDayRange,
  formatMonthRange,
  formatYearMonth,
  monthsInclusive,
  parseIsoDate,
  parseYearMonth,
  toIsoDate,
  utcDate,
} from "../lib/dates.ts";
import { apart, type DiagramLayout, type DiagramNode, layout } from "../lib/architecture.ts";
import { type Place, pack, sizes } from "../lib/bento.ts";
import { type EvidenceKind, evidenceHref, evidenceTarget } from "../lib/evidence.ts";
import { type Citations, cite, splitName } from "../lib/cite.ts";
import { MONTH_NAMES } from "../lib/dates.ts";
import { degreeProgress, monthsLabel } from "../lib/glance.ts";
import type { SectionId } from "../lib/sections.ts";
import { SECTIONS } from "../lib/sections.ts";
import { numbersIn, valuesIn } from "./numbers.ts";

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

/** "Accepted · Presented April 2026", until a DOI makes it "Published". */
export function publicationStatus(paper: Publication, conference: Conference | undefined) {
  if (paper.doi) return { status: "published", label: "Published" } as const;
  const presented = conference ? parseIsoDate(conference.start) : null;
  const when = presented ? ` ${MONTH_NAMES[presented.month - 1]} ${presented.year}` : "";
  return { status: "accepted-presented", label: `Accepted · Presented${when}` } as const;
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

/**
 * Degree progress from the first day of the start month to the first day of the
 * graduation month, measured against today. Content knows the month, not the day.
 * The At-a-glance tile computes the same thing in the browser (lib/glance.ts).
 */
export function graduation(content: Content, now: Date) {
  const degree = content.education.find(isDegree);
  if (!degree) return null;
  return {
    id: degree.id,
    institution: degree.institution,
    start: degree.start,
    end: degree.end,
    ...degreeProgress(degree.start, degree.end, content.profile.location.timeZone, now),
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

// ─── The edit (Part 7) ───────────────────────────────────────────────────────

/** A metric's digits and the text around them, so a counter can count just the digits. */
export type MetricPart = { kind: "text"; text: string } | { kind: "number"; value: number; decimals: number; group: boolean };

export interface EditMetric {
  /** The figure as the role's text or its note states it: "$0.08–0.11", "90%+". */
  token: string;
  label: string;
  parts: MetricPart[];
}

/** Metrics that share their footnotes, so each note is cited once per panel. */
export interface EditMetricGroup {
  footnotes: number[];
  metrics: EditMetric[];
}

/** A role's visual, with its figures labeled as the role's text or notes word them. */
export type EditVisual =
  | { kind: "tangle-to-map"; calls: number; documents: number; cents: [number, number]; costLabel: string }
  | { kind: "route-segments" }
  | { kind: "module-blocks"; modules: number; modulesLabel: string; coverage: number; coverageLabel: string; defects: number; defectsLabel: string }
  | { kind: "dashboard"; users: number; usersLabel: string };

function visualOf(visual: RoleVisual, stated: string): EditVisual {
  switch (visual.kind) {
    case "tangle-to-map":
      return {
        kind: visual.kind,
        calls: visual.calls,
        documents: visual.documents,
        cents: [Math.round(visual.cost[0] * 100), Math.round(visual.cost[1] * 100)],
        costLabel: statedAs(stated, visual.cost),
      };
    case "module-blocks":
      return {
        kind: visual.kind,
        modules: visual.modules,
        modulesLabel: statedAs(stated, [visual.modules]),
        coverage: visual.coverage,
        coverageLabel: statedAs(stated, [visual.coverage]),
        defects: visual.defects,
        defectsLabel: statedAs(stated, [visual.defects]),
      };
    case "dashboard":
      return { kind: visual.kind, users: visual.users, usersLabel: statedAs(stated, [visual.users]) };
    case "route-segments":
      return { kind: visual.kind };
  }
}

export type EditPanel =
  | {
      kind: "role";
      id: string;
      org: string;
      role: string;
      dates: string;
      location: string | null;
      summary: string;
      /** Its first three bullets. Their numbers are all metrics, footnoted there. */
      highlights: string[];
      groups: EditMetricGroup[];
      stack: string[];
      visual: EditVisual | null;
    }
  | { kind: "research"; id: string; name: string; type: string; place: string; dates: string; proceedings: string; papers: { title: string; status: string }[] }
  | { kind: "education"; id: string; institution: string; degree: string; dates: string; grade: string; coursework: string[] }
  | { kind: "honor"; id: string; title: string; org: string | null; years: string; detail: { text: string; footnotes: number[] } | null };

export interface EditClip {
  id: string;
  track: TrackId;
  lane: number;
  title: string;
  /** The name on the clip itself: a role's short name, when it has one. */
  label: string;
  subtitle: string | null;
  /** The clip's dates as a résumé writes them. */
  dates: string;
  /** Inclusive start, "YYYY-MM-DD". */
  start: string;
  /** Exclusive end, "YYYY-MM-DD"; null while it's ongoing, so the browser ends it at today. */
  end: string | null;
  precision: "day" | "month" | "year";
  /** The viewer panel it shows: a honor's two years share one. */
  panel: string;
}

export interface EditTrack {
  id: TrackId;
  label: string;
  lanes: number;
  clips: EditClip[];
}

/** A figure's digits and the text around them: "$0.08–0.11" is "$", 0.08, "–", 0.11. */
export function partsOf(token: string): MetricPart[] {
  const parts: MetricPart[] = [];
  let last = 0;
  for (const match of token.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    if (match.index > last) parts.push({ kind: "text", text: token.slice(last, match.index) });
    const digits = match[0];
    parts.push({ kind: "number", value: Number(digits.replace(/,/g, "")), decimals: digits.split(".")[1]?.length ?? 0, group: digits.includes(",") });
    last = match.index + digits.length;
  }
  if (last < token.length) parts.push({ kind: "text", text: token.slice(last) });
  return parts;
}

/** Puts each clip on the first free lane when it starts, longest first on ties; ongoing clips never end. */
function lanes(id: TrackId, label: string, clips: Omit<EditClip, "lane" | "track">[]): EditTrack {
  const endOf = (clip: { end: string | null }) => clip.end ?? "9999-12-31";
  const sorted = [...clips].sort((a, b) => a.start.localeCompare(b.start) || endOf(b).localeCompare(endOf(a)));
  const laneEnds: string[] = [];
  const placed = sorted.map((clip) => {
    let lane = laneEnds.findIndex((end) => end <= clip.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endOf(clip);
    return { ...clip, track: id, lane };
  });
  // Tab order runs through a track in time, earliest end first where clips start together.
  placed.sort((a, b) => a.start.localeCompare(b.start) || endOf(a).localeCompare(endOf(b)));
  return { id, label, lanes: laneEnds.length, clips: placed };
}

/**
 * "The edit" (DESIGN.md §7.4): the career as tracks of clips on a real time scale, and a
 * viewer panel for each. Nothing here depends on today: an ongoing clip's end is null and
 * the browser ends it at today (lib/edit.ts), so the page stays static.
 */
export function edit(content: Content) {
  const notes = new Map(content.footnotes.map((footnote) => [footnote.id, footnote]));
  const panels: EditPanel[] = [];

  const work = content.experience.map((role) => {
    const start = parseYearMonth(role.start);
    const claims = [role.summary, ...role.bullets];
    const cited = [...new Set([...claims.flatMap((claim) => claim.footnotes), ...role.metrics.flatMap((metric) => metric.footnotes)])];
    const stated = [...claims.map((claim) => claim.text), ...cited.flatMap((id) => [notes.get(id)?.note ?? "", notes.get(id)?.source ?? ""])].join(" ");
    const groups: EditMetricGroup[] = [];
    for (const metric of role.metrics) {
      const values = Array.isArray(metric.value) ? metric.value : [metric.value];
      const token = statedAs(stated, values);
      const entry = { token, label: metric.label, parts: partsOf(token) };
      const previous = groups.at(-1);
      if (previous && previous.footnotes.join() === metric.footnotes.join()) previous.metrics.push(entry);
      else groups.push({ footnotes: metric.footnotes, metrics: [entry] });
    }
    panels.push({
      kind: "role",
      id: role.id,
      org: role.org,
      role: role.role,
      dates: formatMonthRange(role.start, role.end),
      location: role.location,
      summary: role.summary.text,
      highlights: role.bullets.slice(0, 3).map((bullet) => bullet.text),
      groups,
      stack: role.stack,
      visual: role.visual ? visualOf(role.visual, stated) : null,
    });
    return {
      id: role.id,
      title: role.org,
      label: role.short ?? role.org,
      subtitle: role.role,
      dates: formatMonthRange(role.start, role.end),
      start: toIsoDate(utcDate(start.year, start.month)),
      end: role.end === "present" ? null : toIsoDate(endOfMonthExclusive(parseYearMonth(role.end))),
      precision: "month" as const,
      panel: role.id,
    };
  });

  const research = content.conferences.map((conference) => {
    const papers = content.publications.filter((paper) => paper.presentedAt === conference.id);
    const last = parseIsoDate(conference.end);
    const dates = formatDayRange(conference.start, conference.end);
    panels.push({
      kind: "research",
      id: conference.id,
      name: conference.name,
      type: conference.kind,
      place: `${conference.host}, ${conference.city}`,
      dates,
      proceedings: conference.proceedings,
      papers: papers.map((paper) => ({ title: paper.title, status: publicationStatus(paper, conference).label })),
    });
    return {
      id: conference.id,
      title: conference.name,
      label: conference.name,
      subtitle: `${papers.length} ${papers.length === 1 ? "paper" : "papers"}`,
      dates,
      start: conference.start,
      end: toIsoDate(utcDate(last.year, last.month, last.day + 1)),
      precision: "day" as const,
      panel: conference.id,
    };
  });

  const education = content.education.filter(isDegree).map((degree) => {
    const start = parseYearMonth(degree.start);
    const dates = formatMonthRange(degree.start, degree.end);
    panels.push({
      kind: "education",
      id: degree.id,
      institution: degree.institution,
      degree: `${degree.degree}, ${degree.field}`,
      dates,
      grade: degree.grade.text,
      coursework: degree.coursework,
    });
    return {
      id: degree.id,
      title: degree.institution,
      label: degree.institution,
      subtitle: `${degree.degree} ${initialism(degree.field)}`,
      dates,
      start: toIsoDate(utcDate(start.year, start.month)),
      end: toIsoDate(endOfMonthExclusive(parseYearMonth(degree.end))),
      precision: "month" as const,
      panel: degree.id,
    };
  });

  const honors = content.achievements.flatMap((achievement) => {
    panels.push({
      kind: "honor",
      id: achievement.id,
      title: achievement.title,
      org: achievement.org ?? null,
      years: achievement.years.join(" and "),
      detail: achievement.detail ? { text: achievement.detail.text, footnotes: achievement.detail.footnotes } : null,
    });
    // Content knows the year, not the month: each is a year bracket, never an invented date.
    return achievement.years.map((year) => ({
      id: achievement.years.length > 1 ? `${achievement.id}-${year}` : achievement.id,
      title: achievement.title,
      label: achievement.title,
      subtitle: achievement.org ?? null,
      dates: String(year),
      start: `${year}-01-01`,
      end: `${year + 1}-01-01`,
      precision: "year" as const,
      panel: achievement.id,
    }));
  });

  const tracks = [
    lanes("work", "Work", work),
    lanes("research", "Research", research),
    lanes("education", "Education", education),
    lanes("honors", "Honors", honors),
  ];
  const clips = tracks.flatMap((track) => track.clips);
  // The latest date content knows has passed: where the scale ends until the browser knows today.
  const known = [...work.flatMap((clip) => [clip.start, clip.end]), ...research.map((clip) => clip.end)]
    .filter((date): date is string => date !== null)
    .sort()
    .at(-1)!;
  return {
    start: clips.map((clip) => clip.start).sort()[0],
    known,
    tracks,
    panels,
  };
}

export type Edit = ReturnType<typeof edit>;

// ─── /compare (Part 13) ──────────────────────────────────────────────────────

export type CompareRowId = "studying" | "internships" | "papers" | "honors" | "stack";

/**
 * Year columns from the first timeline year to this year (or, without `now`, to the latest
 * year content dates anything in, so the page can be built ahead), built only from dated
 * entries. Undated projects stay out until they have a year, and nothing is estimated.
 */
export function compareTable(content: Content, now?: Date) {
  const firstYear = Number(edit(content).start.slice(0, 4));
  const lastYear = now ? todayFor(content, now).year : Number(edit(content).known.slice(0, 4));
  const years = range(firstYear, lastYear);
  const labels = content.copy.surprises.compare.rows;
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
      row("studying", labels.studying, (year) =>
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
      row("internships", labels.internships, (year) =>
        internships.filter((role) => parseYearMonth(role.start).year <= year).map((role) => role.org),
      ),
      row("papers", labels.papers, (year) =>
        content.publications
          .filter((paper) => {
            const conference = conferences.get(paper.presentedAt);
            return conference ? parseIsoDate(conference.start).year === year : false;
          })
          .map((paper) => paper.title),
      ),
      row("honors", labels.honors, (year) =>
        content.achievements.filter((achievement) => achievement.years.includes(year)).map((a) => a.title),
      ),
      row("stack", labels.stack, (year) =>
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

export interface HeroFact {
  id: "now" | "studying" | "presented";
  /** Its label, over it: "Now", "Studying", "Presented". */
  label: string;
  value: string;
  /** The home section that tells the rest. */
  section: SectionId;
  /**
   * Where in it, when that's one thing in particular: the current role's panel, which the
   * edit's playhead jumps to, rather than the timeline's start in 2023 (Part 17).
   */
  target?: string;
}

/**
 * The hero's key facts (DESIGN.md §7.1, Part 18): the role Akshat holds now and where, the
 * degree, and the conference, each under its label. Each is derived; a fact whose facts are
 * missing is left out. No place among them: the first screen says nothing about where.
 */
export function heroFacts(content: Content): HeroFact[] {
  const words = content.copy.hero.facts;
  const facts: HeroFact[] = [];
  const now = content.experience.find((role) => role.id === content.profile.now);
  // The role itself, not only the company (Part 17); the parenthesis is its detail, for Experience.
  if (now) facts.push({ id: "now", label: words.now, value: `${now.role.replace(/\s*\([^)]*\)$/, "")}, ${now.org}`, section: "experience", target: `${now.id}-title` });
  const degree = content.education.find((entry) => entry.kind === "degree");
  if (degree?.kind === "degree") {
    const year = degree.end.slice(2, 4);
    facts.push({ id: "studying", label: words.studying, value: `${degree.degree} ${initialism(degree.field)} \u2019${year}, ${degree.institution}`, section: "credentials" });
  }
  const paper = content.publications[0];
  const conference = paper && content.conferences.find((entry) => entry.id === paper.presentedAt);
  if (conference) facts.push({ id: "presented", label: words.presented, value: `${conference.name}, ${conference.proceedings}`, section: "research" });
  return facts;
}

/**
 * How the date line names Akshat's clock: the city once it's confirmed ("in Jaipur"),
 * the time zone until then ("IST").
 */
export function clockPlace(content: Content): { label: string; timeZone: string } {
  const location = publicLocation(content);
  return { label: location.city ? `in ${location.city}` : location.timeZoneLabel, timeZone: location.timeZone };
}

// ─── The statement, About and the highlights (Part 6) ────────────────────────

export interface StatementWord {
  text: string;
  /** Part of the gradient phrase. */
  emphasis: boolean;
  /** Whether a space comes before it. A word the phrase's edge splits ("kind.") has none. */
  space: boolean;
}

/** The statement in reading order, a word at a time, with its gradient phrase marked. */
export function statementWords(content: Content): StatementWord[] {
  const { headline, emphasis } = content.copy.statement;
  const from = headline.indexOf(emphasis);
  const to = from + emphasis.length;
  const words: StatementWord[] = [];
  for (const match of headline.matchAll(/\S+/g)) {
    const start = match.index;
    const end = start + match[0].length;
    // Split a word where the phrase begins or ends inside it.
    const cuts = [start, ...[from, to].filter((cut) => cut > start && cut < end), end];
    for (let i = 0; i < cuts.length - 1; i++) {
      words.push({
        text: headline.slice(cuts[i], cuts[i + 1]),
        emphasis: cuts[i] >= from && cuts[i + 1] <= to,
        space: i === 0 && start > 0,
      });
    }
  }
  return words;
}

/** Lowercases a phrase's first letter to follow a verb, unless it starts with an acronym ("ML"). */
function afterVerb(text: string): string {
  const first = text.split(/\s/, 1)[0];
  return /^[A-Z][a-z]/.test(first) ? text[0].toLowerCase() + text.slice(1) : text;
}

export interface CurrentItem {
  kind: "building" | "researching" | "reading";
  text: string;
  /** Where to read more, for what Akshat is building. */
  href?: string;
}

/** The quiet "Currently" line: building, researching, reading. Empty items stay hidden. */
export function currently(content: Content): CurrentItem[] {
  const { building, researching, reading } = content.currentFocus;
  const items: CurrentItem[] = [{ kind: "building", text: building.name, href: "#experience" }];
  if (researching) items.push({ kind: "researching", text: afterVerb(researching) });
  if (reading) items.push({ kind: "reading", text: afterVerb(reading) });
  return items;
}

/**
 * The At-a-glance bento's facts. What depends on today (the role's length, degree
 * progress, Akshat's clock and its overlap with the visitor's day) is computed in the
 * browser from these, with lib/glance.ts.
 */
export function glance(content: Content) {
  const role = nowRole(content);
  const degree = content.education.find(isDegree) ?? null;
  const total = counts(content);
  const venues = [...new Set(content.publications.map((paper) => paper.presentedAt))]
    .map((id) => content.conferences.find((conference) => conference.id === id))
    .filter((conference) => conference !== undefined)
    .map((conference) => ({ name: conference.name, proceedings: conference.proceedings }));
  const location = publicLocation(content);
  return {
    now: { org: role.org, role: role.role, since: role.since, sinceLabel: formatYearMonth(role.since, "en-US", "long") },
    studying: degree && {
      degree: degree.degree,
      field: initialism(degree.field),
      institution: degree.institution,
      start: degree.start,
      end: degree.end,
      endLabel: formatYearMonth(degree.end, "en-US", "long"),
    },
    research: { papers: total.papers, venues },
    experience: { internships: total.internships },
    work: { projects: total.projects },
    time: {
      timeZone: location.timeZone,
      zoneLabel: location.timeZoneLabel,
      hours: content.profile.workingHours,
      visitorDay: content.copy.about.visitorDay,
    },
  };
}

export type Glance = ReturnType<typeof glance>;

/**
 * The exact words a note uses for a figure ("300+", "2,500+", "$0.08–0.11"), so a film
 * labels it the way the footnote states it.
 */
function statedAs(cited: string, values: readonly number[]): string {
  const token = numbersIn(cited).find((candidate) => values.every((value) => valuesIn(candidate).includes(value)));
  if (!token) throw new Error(`no note states ${values.join(" and ")}`);
  return token;
}

export type ReelFilm =
  | { kind: "fan-out"; from: number; to: number; fromLabel: string; toLabel: string }
  | { kind: "cost"; cents: [number, number]; costLabel: string; compression: [number, number]; compressionLabel: string }
  | { kind: "papers"; count: number; venue: string }
  | { kind: "roc"; auc: number; aucLabel: string }
  | { kind: "condense"; from: number; to: number; fromLabel: string; toLabel: string }
  | { kind: "ring"; percent: number; label: string }
  | { kind: "bars"; value: number; label: string };

export interface ReelItem {
  id: string;
  /**
   * Whose fact it is, over the card's words (Part 17): the company for a role's, the
   * project's or the honor's name, or the section's. "97% accurate." alone said of what.
   */
  subject: string;
  text: string;
  footnotes: number[];
  /** The full fact, for the card's sheet: the notes it cites, or the papers it counts. */
  fact: string[];
  /** Where the fact comes from: each footnote's source, or the highlight's own. */
  sources: string[];
  section: SectionId;
  sectionName: string;
  film: ReelFilm;
}

/** The highlights reel (DESIGN.md §7): each card's fact, its sources, its section and its film. */
export function reel(content: Content): ReelItem[] {
  const notes = new Map(content.footnotes.map((footnote) => [footnote.id, footnote]));
  return content.highlights.map((highlight) => {
    const cited = highlight.footnotes.map((n) => notes.get(n)).filter((note) => note !== undefined);
    const stated = [highlight.text, highlight.source ?? "", ...cited.flatMap((note) => [note.note, note.source ?? ""])].join(" ");
    const sources = [...cited.map((note) => note.source).filter((source): source is string => Boolean(source)), ...(highlight.source ? [highlight.source] : [])];
    const section = SECTIONS.find((entry) => entry.id === highlight.ref.section)!;
    const { film } = highlight;
    let fact = cited.map((note) => note.note);
    let resolved: ReelFilm;
    switch (film.kind) {
      case "fan-out":
      case "condense":
        resolved = { kind: film.kind, from: film.from, to: film.to, fromLabel: statedAs(stated, [film.from]), toLabel: statedAs(stated, [film.to]) };
        break;
      case "cost":
        resolved = {
          kind: "cost",
          cents: [Math.round(film.cost[0] * 100), Math.round(film.cost[1] * 100)],
          costLabel: statedAs(stated, film.cost),
          compression: film.compression,
          compressionLabel: statedAs(stated, film.compression),
        };
        break;
      case "papers": {
        const papers = content.publications.filter((paper) => paper.presentedAt === film.conference);
        const venue = content.conferences.find((conference) => conference.id === film.conference)!;
        resolved = { kind: "papers", count: papers.length, venue: venue.name };
        if (fact.length === 0) fact = papers.map((paper) => paper.title);
        break;
      }
      case "roc":
        resolved = { kind: "roc", auc: film.auc, aucLabel: statedAs(stated, [film.auc]) };
        break;
      case "ring":
        resolved = { kind: "ring", percent: film.percent, label: statedAs(stated, [film.percent]) };
        break;
      case "bars":
        resolved = { kind: "bars", value: film.value, label: statedAs(stated, [film.value]) };
        break;
    }
    const { id } = highlight.ref;
    const role = id ? content.experience.find((entry) => entry.id === id) : undefined;
    const subject =
      (role && (role.short ?? role.org)) ??
      content.projects.find((project) => project.slug === id)?.name ??
      content.achievements.find((achievement) => achievement.id === id)?.title ??
      section.name;
    return {
      id: highlight.id,
      subject,
      text: highlight.text,
      footnotes: highlight.footnotes,
      fact,
      sources,
      section: section.id,
      sectionName: section.name,
      film: resolved,
    };
  });
}

// ─── Work (Part 9) ───────────────────────────────────────────────────────────

/** A figure as the project's text states it, with its digits apart for a counter. */
export interface WorkMetric {
  token: string;
  label: string;
  footnotes: number[];
  parts: MetricPart[];
}

/** A tile's living preview, its figures labeled as the project's text states them. */
export type WorkPreview =
  | Exclude<ProjectPreview, { kind: "roc" }>
  | { kind: "roc"; auc: number; aucLabel: string; aucName: string; accuracy: number; accuracyLabel: string; accuracyName: string };

export interface WorkTile {
  slug: string;
  href: string;
  name: string;
  category: string;
  tagline: { text: string; footnotes: number[] };
  /** Its first metric, if it has one. */
  metric: WorkMetric | null;
  /** The filters it shows under. */
  filters: string[];
  preview: WorkPreview;
  /** Once content has screenshots, the first one is the cover. */
  screenshot: { src: string; alt: string } | null;
  /** Where it sits on desktop (lg) and tablets (md) under each filter it shows under. */
  places: Record<string, { lg: Place; md: Place }>;
}

export interface CaseStudy {
  slug: string;
  href: string;
  name: string;
  category: string;
  tagline: { text: string; footnotes: number[] };
  summary: { text: string; footnotes: number[] };
  problem: { text: string; footnotes: number[] } | null;
  outcome: { text: string; footnotes: number[] } | null;
  year: number | null;
  role: string | null;
  /** Each item of its stack, and whether it's one of the skills (a chip that links there). */
  stack: { name: string; skill: boolean }[];
  /** Metrics in runs that share their footnotes, so each note is cited once. */
  metrics: { footnotes: number[]; metrics: WorkMetric[] }[];
  /** Its architecture, drawn top to bottom (lib/architecture.ts), and the boxes with no arrows. */
  diagram: { down: DiagramLayout; apart: DiagramNode[]; footnotes: number[] };
  links: { repo: string | null; live: string | null };
  preview: WorkPreview;
  screenshot: { src: string; alt: string } | null;
  /** The next project, for the peek card that ends a case study. */
  next: Pick<WorkTile, "slug" | "href" | "name" | "category" | "tagline" | "preview" | "screenshot">;
}

/** What a project's claims and the notes they cite state, for labeling its figures. */
function statedBy(content: Content, project: Project): string {
  const notes = new Map(content.footnotes.map((footnote) => [footnote.id, footnote]));
  const claims: Claim[] = [project.tagline, project.summary];
  const cited = [...new Set([...claims.flatMap((claim) => claim.footnotes), ...project.metrics.flatMap((metric) => metric.footnotes)])];
  return [...claims.map((claim) => claim.text), ...cited.flatMap((id) => [notes.get(id)?.note ?? "", notes.get(id)?.source ?? ""])].join(" ");
}

function metricsOf(content: Content, project: Project): WorkMetric[] {
  const stated = statedBy(content, project);
  return project.metrics.map((metric) => {
    const token = statedAs(stated, Array.isArray(metric.value) ? metric.value : [metric.value]);
    return { token, label: metric.label, footnotes: metric.footnotes, parts: partsOf(token) };
  });
}

function previewOf(content: Content, project: Project): WorkPreview {
  const { preview } = project;
  if (preview.kind !== "roc") return preview;
  const stated = statedBy(content, project);
  // The schema checks that both figures are the project's metrics; they're named as those are.
  const name = (value: number) => project.metrics.find((metric) => metric.value === value)?.label ?? "";
  return {
    ...preview,
    aucLabel: statedAs(stated, [preview.auc]),
    aucName: name(preview.auc),
    accuracyLabel: statedAs(stated, [preview.accuracy]),
    accuracyName: name(preview.accuracy),
  };
}

const claimOf = (claim: Claim) => ({ text: claim.text, footnotes: claim.footnotes });
const screenshotOf = (project: Project) => (project.screenshots?.[0] ? { src: project.screenshots[0].src, alt: project.screenshots[0].alt } : null);

/**
 * The work bento (DESIGN.md §7.6): a tile per project and, for each filter, where every
 * tile it shows sits. The first project in content is the flagship: under any filter that
 * shows it, it takes the large square.
 */
export function work(content: Content): { filters: { id: string; label: string }[]; tiles: WorkTile[] } {
  const { filters } = content.copy.work;
  const flagship = content.projects[0]?.slug;
  const tiles: WorkTile[] = content.projects.map((project) => ({
    slug: project.slug,
    href: `/work/${project.slug}`,
    name: project.name,
    category: project.category,
    tagline: claimOf(project.tagline),
    metric: metricsOf(content, project)[0] ?? null,
    filters: filters.filter((filter) => filter.categories.includes(project.category)).map((filter) => filter.id),
    preview: previewOf(content, project),
    screenshot: screenshotOf(project),
    places: {},
  }));
  for (const filter of filters) {
    const shown = tiles.filter((tile) => tile.filters.includes(filter.id));
    const lead = shown[0]?.slug === flagship;
    const lg = pack(sizes(shown.length, lead, "lg"));
    const md = pack(sizes(shown.length, lead, "md"));
    shown.forEach((tile, i) => {
      tile.places[filter.id] = { lg: lg[i], md: md[i] };
    });
  }
  return { filters: filters.map(({ id, label }) => ({ id, label })), tiles };
}

/** Each project's case study (DESIGN.md §7.6), in content's order. */
export function caseStudies(content: Content): CaseStudy[] {
  const skills = allSkills(content);
  const tiles = work(content).tiles;
  return content.projects.map((project, i) => {
    const metrics = metricsOf(content, project);
    const groups: CaseStudy["metrics"] = [];
    for (const metric of metrics) {
      const previous = groups.at(-1);
      if (previous && previous.footnotes.join() === metric.footnotes.join()) previous.metrics.push(metric);
      else groups.push({ footnotes: metric.footnotes, metrics: [metric] });
    }
    const { nodes, edges } = project.architecture;
    const boxes = nodes.map(({ id, label, detail }) => ({ id, label, ...(detail ? { detail } : {}) }));
    const next = tiles[(i + 1) % tiles.length];
    return {
      slug: project.slug,
      href: `/work/${project.slug}`,
      name: project.name,
      category: project.category,
      tagline: claimOf(project.tagline),
      summary: claimOf(project.summary),
      problem: project.problem ? claimOf(project.problem) : null,
      outcome: project.outcome ? claimOf(project.outcome) : null,
      year: project.year,
      role: project.role,
      stack: (project.stack ?? []).map((name) => ({
        name,
        skill: skills.some((skill) => [skill.name, ...skill.aliases].some((term) => mentions(name, term) || mentions(term, name))),
      })),
      metrics: groups,
      diagram: {
        down: layout(boxes, edges, "down"),
        apart: apart(boxes, edges),
        footnotes: [...new Set(nodes.flatMap((node) => node.footnotes))],
      },
      links: { repo: project.links?.repo ?? null, live: project.links?.live ?? null },
      preview: previewOf(content, project),
      screenshot: screenshotOf(project),
      next: { slug: next.slug, href: next.href, name: next.name, category: next.category, tagline: next.tagline, preview: next.preview, screenshot: next.screenshot },
    };
  });
}

// ─── Skills (Part 10) ────────────────────────────────────────────────────────

export { type EvidenceKind, evidenceHref, evidenceTarget };

/** A role, project or paper that names a skill, with where to read it and where it is on the home page. */
export interface Evidence {
  kind: EvidenceKind;
  id: string;
  title: string;
  /** Where "Used in" links: the role in the edit, the case study, the paper's page. */
  href: string;
  /** The element on the home page that "Show me where" lights up and jumps to. */
  target: string;
}

export interface SkillItem {
  id: string;
  name: string;
  /** With its detail: "Next.js (App Router)". */
  label: string;
  detail: string | null;
  category: string;
  core: boolean;
  /** Its Simple Icons slug, or null for a monogram. */
  icon: string | null;
  monogram: string;
  /** Roles first (in content's order), then projects, then papers. */
  evidence: Evidence[];
}

export interface SkillLayer {
  id: string;
  category: string;
  skills: SkillItem[];
  /** "19 skills". */
  count: string;
}

/**
 * A skill's monogram, for the cloud when Simple Icons has no logo: a short name as it is
 * ("SQL", "HyDE"), else a short alias ("DSA"), else a leading acronym ("REST", "AWS"), else
 * the initials of its words, else its first two letters.
 */
export function monogram(name: string, aliases: readonly string[]): string {
  if (name.length <= (name.includes("-") ? 6 : 5) && !name.includes(" ")) return name;
  const short = aliases.find((alias) => alias.length <= 5 && !alias.includes(" "));
  if (short) return short;
  const words = name.split(/[\s&]+/).filter(Boolean);
  if (/^[A-Z0-9]{2,4}$/.test(words[0])) return words[0];
  if (words.length > 1) return words.slice(0, 3).map((word) => word[0].toUpperCase()).join("");
  const capitals = name.match(/[A-Z]/g);
  if (capitals && capitals.length > 1) return capitals.slice(0, 3).join("");
  return name[0].toUpperCase() + name.slice(1, 2);
}

/**
 * The skills section (DESIGN.md §7.7): every skill with the roles, projects and papers that
 * name it; the chip's layers, top to bottom, as copy.skills.chip orders them; the core six;
 * and the categories in content's order, for the specs.
 */
export function skillsSection(content: Content) {
  const evidence = skillEvidence(content);
  const iconOf = new Map(content.skills.flatMap((category) => category.skills.map((skill) => [skill.name, skill.icon ?? null])));
  const detailOf = new Map(content.skills.flatMap((category) => category.skills.map((skill) => [skill.name, skill.detail ?? null])));
  const items: SkillItem[] = evidence.map((skill) => ({
    id: skill.id,
    name: skill.name,
    label: skill.label,
    detail: detailOf.get(skill.name) ?? null,
    category: skill.category,
    core: skill.core,
    icon: iconOf.get(skill.name) ?? null,
    monogram: monogram(skill.name, skill.aliases),
    evidence: [...skill.roles, ...skill.projects, ...skill.papers].map((hit) => ({
      kind: hit.kind,
      id: hit.id,
      title: hit.title,
      href: evidenceHref(hit.kind, hit.id),
      target: evidenceTarget(hit.kind, hit.id),
    })),
  }));
  const { unit } = content.copy.skills.chip;
  const inCategory = (name: string) => items.filter((item) => item.category === name);
  const layers: SkillLayer[] = content.copy.skills.chip.layers.map((category) => {
    const skills = inCategory(category);
    return { id: slugify(category), category, skills, count: `${skills.length} ${skills.length === 1 ? unit.one : unit.other}` };
  });
  return {
    items,
    layers,
    core: items.filter((item) => item.core),
    categories: content.skills.map((category) => ({ id: slugify(category.name), name: category.name, skills: inCategory(category.name) })),
  };
}

/** The skills a role, project or paper names, by id, for "Show me where" to find it. */
export function skillsOf(content: Content, kind: EvidenceKind, id: string): string[] {
  return skillEvidence(content)
    .filter((skill) => (kind === "role" ? skill.roles : kind === "project" ? skill.projects : skill.papers).some((hit) => hit.id === id))
    .map((skill) => skill.id);
}

// ─── Credentials (Part 11) ───────────────────────────────────────────────────

/** A field on a pass's face, as a wallet pass sets it: a small label over its value. */
export interface PassField {
  label: string;
  value: string;
  /** IDs are set in mono. */
  mono: boolean;
  footnotes: number[];
}

/** When a certificate expires, as far as content knows; the browser can only make it "Expired". */
export interface PassExpiry {
  /** "Expires", or "Expired" once its month has passed. */
  label: string;
  /** "Mar 2029", or "Never". */
  value: string;
  /** Its month, for the browser to check against today; null when it never expires. */
  expires: string | null;
  expired: boolean;
}

/** What a pass's back shows, in order. */
export type PassSection =
  | { kind: "list"; label: string; items: string[] }
  | { kind: "text"; label: string; text: string; footnotes: number[] }
  | { kind: "link"; label: string; href: string; text: string }
  | { kind: "expiry"; expiry: PassExpiry };

export interface Pass {
  id: string;
  kind: "education" | "certificate";
  /** "Education" or "Certificate". */
  label: string;
  title: string;
  subtitle: string;
  fields: PassField[];
  /** The public page that verifies it: its QR code points here. */
  verifyUrl: string | null;
  /** Its color: the issuer's tone from content, else one of the finish's. */
  tone: string | null;
  expiry: PassExpiry | null;
  back: PassSection[];
}

/**
 * The latest month content knows has begun (as the edit's scale does): the roles' starts
 * and ends and the conferences'. An expiry before it has certainly passed.
 */
function knownMonth(content: Content): string {
  const months = [
    ...content.experience.flatMap((role) => [role.start, ...(role.end === "present" ? [] : [role.end])]),
    ...content.conferences.map((conference) => conference.end.slice(0, 7)),
  ];
  return months.sort().at(-1) ?? "0000-01";
}

/** A certificate's expiry, honestly: "Expired" only once content knows its month has passed. */
export function expiryOf(content: Content, expires: string | "never" | null): PassExpiry | null {
  const words = content.copy.credentials.wallet;
  if (expires === null) return null;
  if (expires === "never") return { label: words.expires, value: words.never, expires: null, expired: false };
  const expired = expires < knownMonth(content);
  return { label: expired ? words.expired : words.expires, value: formatYearMonth(expires), expires, expired };
}

/**
 * The wallet (DESIGN.md §7.8): Education first, always, then a pass per certificate, in
 * content's order. A certificate added to content is a pass, with no code change.
 */
export function wallet(content: Content): { headline: string; passes: Pass[] } {
  const words = content.copy.credentials.wallet;
  const degree = content.education.find((entry): entry is Degree => entry.kind === "degree");
  const schools = content.education.filter((entry) => entry.kind === "school");
  const passes: Pass[] = [];
  if (degree) {
    passes.push({
      id: degree.id,
      kind: "education",
      label: words.education,
      title: degree.institution,
      subtitle: `${degree.degree}, ${degree.field}`,
      fields: [
        { label: words.classOf, value: String(parseYearMonth(degree.end).year), mono: false, footnotes: [] },
        { label: words.grade, value: degree.grade.text, mono: false, footnotes: degree.grade.footnotes },
      ],
      verifyUrl: null,
      tone: null,
      expiry: null,
      back: [
        ...(degree.coursework.length > 0 ? [{ kind: "list" as const, label: words.coursework, items: degree.coursework }] : []),
        ...schools.map((school) => ({
          kind: "text" as const,
          label: school.level,
          text: `${school.grade.text}, ${school.year}`,
          footnotes: school.grade.footnotes,
        })),
      ],
    });
  }
  const skills = allSkills(content);
  for (const certificate of content.certificates) {
    const expiry = expiryOf(content, certificate.expires);
    // Skills covered, named as the skills list names them.
    const covered = certificate.skills.map(
      (name) =>
        skills.find((skill) => [skill.name, ...skill.aliases].some((term) => term.toLowerCase() === name.toLowerCase()))?.name ?? name,
    );
    passes.push({
      id: certificate.id,
      kind: "certificate",
      label: words.certificate,
      title: certificate.title,
      subtitle: certificate.issuer,
      fields: [
        { label: words.issued, value: formatYearMonth(certificate.issued), mono: false, footnotes: [] },
        ...(certificate.credentialId ? [{ label: words.credentialId, value: certificate.credentialId, mono: true, footnotes: [] }] : []),
      ],
      verifyUrl: certificate.verifyUrl,
      tone: certificate.tone ?? null,
      expiry,
      back: [
        ...(covered.length > 0 ? [{ kind: "list" as const, label: words.skills, items: covered }] : []),
        ...(certificate.proves ? [{ kind: "text" as const, label: words.proves, text: certificate.proves, footnotes: [] }] : []),
        ...(certificate.verifyUrl
          ? [{ kind: "link" as const, label: words.verify, href: certificate.verifyUrl, text: verifyText(certificate.verifyUrl) }]
          : []),
        ...(expiry ? [{ kind: "expiry" as const, expiry }] : []),
      ],
    });
  }
  return { headline: credentialsHeadline(content), passes };
}

/** A verify link's words: its host and path, without the scheme or a trailing slash. */
function verifyText(url: string): string {
  const { host, pathname } = new URL(url);
  return `${host.replace(/^www\./, "")}${pathname === "/" ? "" : pathname.replace(/\/$/, "")}`;
}

export interface Medal {
  id: string;
  shape: "circle" | "hexagon" | "rounded-square" | "shield";
  title: string;
  org: string | null;
  /** "2024 · 2025". */
  years: string;
  /** Engraved on its face: its name ("Smart India Hackathon"), then its line ("2024 · 2025 · top 50 of 300+"). */
  face: string;
  line: string;
  /** Engraved on its back: its detail, else who gave it and when. */
  back: string;
  /** Under it, in words: its detail with its notes, else who gave it. */
  description: { text: string; footnotes: number[] } | null;
}

/**
 * The medals (DESIGN.md §7.8): one per achievement, in the order they were won (by their
 * latest year), each engraved with its face, its years and its line.
 */
export function medals(content: Content): Medal[] {
  return [...content.achievements]
    .sort((a, b) => Math.max(...a.years) - Math.max(...b.years) || Math.min(...a.years) - Math.min(...b.years))
    .map((achievement) => {
      const years = achievement.years.join(" · ");
      const org = achievement.org ?? null;
      const detail = achievement.detail ? { text: achievement.detail.text, footnotes: achievement.detail.footnotes } : null;
      return {
        id: achievement.id,
        shape: achievement.medal.shape,
        title: achievement.title,
        org,
        years,
        face: achievement.medal.face,
        line: [years, achievement.medal.line].filter(Boolean).join(" · "),
        back: detail?.text ?? [org, years].filter(Boolean).join(" · "),
        description: detail ?? (org ? { text: org, footnotes: [] } : null),
      };
    });
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

export { NAMES_WITH_DIGITS, numbersIn } from "./numbers.ts";

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

// ─── Research (Part 8) ───────────────────────────────────────────────────────

/**
 * Ideas content names in different words, for relating a paper to projects. Like the
 * search vocabulary (lib/search/vocabulary.ts), it adds no facts: it only says which terms
 * mean the same idea.
 */
const THEMES: readonly { name: string; terms: readonly string[] }[] = [
  { name: "explainable AI", terms: ["XAI", "explainable", "explainability", "interpretable", "interpretability"] },
];

export interface RelatedProject {
  slug: string;
  name: string;
  /** With its footnotes: a page that shows it cites them. */
  tagline: { text: string; footnotes: number[] };
  /** The skills and ideas the paper and the project share: why it's related. */
  shares: string[];
}

export interface ResearchPaper {
  slug: string;
  href: string;
  title: string;
  tldr: string;
  abstract: string | null;
  keywords: string[];
  status: "accepted-presented" | "published";
  statusLabel: string;
  /** Akshat, then the co-authors content names. */
  authors: { name: string; self: boolean }[];
  /** Whether content knows the co-authors; until it does, the authors are Akshat alone only as far as content knows. */
  authorsKnown: boolean;
  /** "SCI-2026 · Swinburne Vietnam, Hanoi · 28–29 April 2026 · Springer LNNS" */
  venue: string;
  conference: Conference;
  doi: string | null;
  doiUrl: string | null;
  /** When the proceedings came out; null until content records it. */
  published: string | null;
  /** APA, IEEE and BibTeX, or null until content knows every author. */
  citations: Citations | null;
  related: RelatedProject[];
  illustration: Illustration | null;
}

/** "SCI-2026 · Swinburne Vietnam, Hanoi · 28–29 April 2026 · Springer LNNS" */
export function venueLine(conference: Conference): string {
  return [
    conference.name,
    `${conference.host}, ${conference.city}`,
    formatDayRange(conference.start, conference.end, "long"),
    conference.proceedings,
  ].join(" · ");
}

/** The projects a paper shares skills or ideas with, most shared first. */
export function relatedProjects(content: Content, paper: Publication): RelatedProject[] {
  const evidence = skillEvidence(content);
  const paperText = [paper.title, paper.tldr, ...paper.keywords].join("\n");
  const paperSkills = evidence.filter((skill) => skill.papers.some((hit) => hit.id === paper.slug));
  const paperThemes = THEMES.filter((theme) => theme.terms.some((term) => mentions(paperText, term)));
  return content.projects
    .map((project, order) => {
      const text = [project.name, project.tagline.text, project.category, project.summary.text, ...(project.stack ?? [])].join("\n");
      const shares = [
        ...paperSkills.filter((skill) => skill.projects.some((hit) => hit.id === project.slug)).map((skill) => skill.name),
        ...paperThemes.filter((theme) => theme.terms.some((term) => mentions(text, term))).map((theme) => theme.name),
      ];
      return { project: { slug: project.slug, name: project.name, tagline: { text: project.tagline.text, footnotes: project.tagline.footnotes }, shares }, order };
    })
    .filter(({ project }) => project.shares.length > 0)
    .sort((a, b) => b.project.shares.length - a.project.shares.length || a.order - b.order)
    .map(({ project }) => project);
}

/** Each paper as #research and its page show it. Papers without their conference are left out. */
export function research(content: Content): ResearchPaper[] {
  const conferences = new Map(content.conferences.map((conference) => [conference.id, conference]));
  return content.publications.flatMap((paper) => {
    const conference = conferences.get(paper.presentedAt);
    if (!conference) return [];
    const status = publicationStatus(paper, conference);
    const names = [content.profile.name, ...(paper.coAuthors ?? [])];
    return [
      {
        slug: paper.slug,
        href: `/research/${paper.slug}`,
        title: paper.title,
        tldr: paper.tldr,
        abstract: paper.abstract,
        keywords: paper.keywords,
        status: status.status,
        statusLabel: status.label,
        authors: names.map((name, i) => ({ name, self: i === 0 })),
        authorsKnown: paper.coAuthors !== null,
        venue: venueLine(conference),
        conference,
        doi: paper.doi,
        doiUrl: paper.doi ? `https://doi.org/${paper.doi}` : null,
        published: paper.published ?? null,
        // A citation names every author, so there's none until content knows them all (Part 17).
        citations:
          paper.coAuthors === null
            ? null
            : cite({
                title: paper.title,
                authors: names.map(splitName),
                conference,
                keywords: paper.keywords,
                doi: paper.doi,
                published: paper.published,
              }),
        related: relatedProjects(content, paper),
        illustration: paper.illustration ?? null,
      },
    ];
  });
}

/** "2026/04/28": Google Scholar's date format. */
const scholarDate = (iso: string) => iso.replaceAll("-", "/");

/**
 * Google Scholar's tags for a paper page. Until the proceedings are out, the date it's
 * cited by is its presentation's.
 */
export function scholarMeta(paper: ResearchPaper): Record<string, string | string[]> {
  return {
    citation_title: paper.title,
    // Scholar takes its author list as the whole list: none until content knows it (Part 17).
    ...(paper.authorsKnown
      ? {
          citation_author: paper.authors.map(({ name }) => {
            const { given, family } = splitName(name);
            return given ? `${family}, ${given}` : family;
          }),
        }
      : {}),
    citation_conference_title: paper.conference.name,
    citation_publication_date: scholarDate(paper.published ?? paper.conference.start),
    ...(paper.doi ? { citation_doi: paper.doi } : {}),
  };
}

/** The paper as a schema.org ScholarlyArticle, for its page's JSON-LD. */
export function scholarlyArticle(content: Content, paper: ResearchPaper) {
  const { conference } = paper;
  const sameAs = [content.profile.links.linkedin, content.profile.links.github, content.profile.links.scholar, content.profile.links.orcid].filter(
    (link): link is string => Boolean(link),
  );
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    name: paper.title,
    description: paper.tldr,
    ...(paper.abstract ? { abstract: paper.abstract } : {}),
    keywords: paper.keywords,
    inLanguage: "en",
    creativeWorkStatus: paper.statusLabel,
    author: paper.authors.map((author) => ({
      "@type": "Person",
      name: author.name,
      ...(author.self && sameAs.length > 0 ? { sameAs } : {}),
    })),
    // Presenting it at the conference made it public; the proceedings come with the DOI.
    publication: {
      "@type": "PublicationEvent",
      name: conference.name,
      description: conference.kind,
      startDate: conference.start,
      endDate: conference.end,
      location: {
        "@type": "Place",
        name: conference.host,
        address: { "@type": "PostalAddress", addressLocality: conference.city, addressCountry: conference.country },
      },
    },
    ...(paper.doi
      ? {
          identifier: { "@type": "PropertyValue", propertyID: "DOI", value: paper.doi },
          sameAs: paper.doiUrl,
          isPartOf: { "@type": "CreativeWorkSeries", name: conference.proceedings },
          ...(paper.published ? { datePublished: paper.published } : {}),
        }
      : {}),
  };
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
    publications: content.publications.map((paper) => ({
      slug: paper.slug,
      ...publicationStatus(paper, content.conferences.find((conference) => conference.id === paper.presentedAt)),
    })),
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
