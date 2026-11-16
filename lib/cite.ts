/**
 * Citations for a paper (DESIGN.md §7.5): APA 7, IEEE and BibTeX, from content fields
 * only. Until a paper has a DOI it's cited as what it is, a paper presented at a
 * conference; with one, as part of its proceedings. Pure, so tests pin every format.
 *
 * Runs under plain Node for content/derive.ts: relative .ts imports, no path aliases.
 */
import { MONTH_NAMES, parseIsoDate } from "./dates.ts";

export interface CiteAuthor {
  given: string;
  family: string;
}

export interface CiteSource {
  title: string;
  authors: readonly CiteAuthor[];
  conference: { name: string; host: string; city: string; country: string; start: string; end: string; proceedings: string };
  keywords: readonly string[];
  doi: string | null;
  /** When the proceedings came out; without it, a citation dates the paper by its presentation. */
  published?: string;
}

/** A run of citation text, italic where the style sets it so. */
export interface CiteRun {
  text: string;
  italic?: boolean;
}

export interface Citations {
  apa: CiteRun[];
  ieee: CiteRun[];
  bibtex: string;
}

const IEEE_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
const BIBTEX_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const STOPWORDS = new Set(["a", "an", "the", "on", "of", "for", "in", "and", "to", "using"]);

/** "Akshat Sharma" as given and family names: the last word is the family name. */
export function splitName(name: string): CiteAuthor {
  const words = name.trim().split(/\s+/);
  const family = words.pop() ?? "";
  return { given: words.join(" "), family };
}

/** "Akshat" → "A.", "Jean-Paul" → "J.-P.", "Mary Ann" → "M. A." */
export function initials(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((name) =>
      name
        .split("-")
        .map((part) => `${part[0]?.toUpperCase() ?? ""}.`)
        .join("-"),
    )
    .join(" ");
}

/** A word to keep as written: an acronym or anything with a digit or a capital inside it. */
const keepsCase = (word: string) => /\d/.test(word) || (word.match(/\p{Lu}/gu)?.length ?? 0) > 1 || /^\p{Ll}/u.test(word);

/**
 * A title in sentence case, as APA sets titles: the first word and the first after a colon
 * capitalized, acronyms kept ("PM2.5", "ML", "AI"), every other word lowercased. A proper
 * noun inside a title would need writing out; neither paper has one.
 */
export function sentenceCase(title: string): string {
  let capitalize = true;
  return title
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      const cased = token
        .split("-")
        .map((part) => (keepsCase(part) ? part : part.toLowerCase()))
        .join("-");
      const out = capitalize ? cased.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase()) : cased;
      capitalize = token.endsWith(":");
      return out;
    })
    .join("");
}

/** "April 28–29" for APA, "Apr. 28–29" for IEEE, across months and years too. */
function dayRange(start: string, end: string, months: readonly string[]): string {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (start === end) return `${months[from.month - 1]} ${from.day}`;
  if (from.month === to.month && from.year === to.year) return `${months[from.month - 1]} ${from.day}–${to.day}`;
  return `${months[from.month - 1]} ${from.day}–${months[to.month - 1]} ${to.day}`;
}

/** The list joined as each style joins names: "A, B, & C" (APA) or "A, B, and C" (IEEE). */
function joinNames(names: readonly string[], conjunction: string, serialComma: boolean): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]}${serialComma && conjunction === "&" ? "," : ""} ${conjunction} ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, ${conjunction} ${names.at(-1)}`;
}

const doiUrl = (doi: string) => `https://doi.org/${doi}`;

/** APA 7: a conference presentation until it's published, then a paper in the proceedings. */
export function apa(source: CiteSource): CiteRun[] {
  const { conference } = source;
  const names = source.authors.map((author) => `${author.family}, ${initials(author.given)}`);
  // APA lists up to 20 authors, joining the last with an ampersand.
  const authors = joinNames(names, "&", true);
  const title = sentenceCase(source.title);
  const place = `${conference.city}, ${conference.country}`;
  if (source.doi) {
    const year = parseIsoDate(source.published ?? conference.start).year;
    return [
      { text: `${authors} (${year}). ${title}. In ` },
      { text: conference.name, italic: true },
      { text: ` (${conference.proceedings}). ${doiUrl(source.doi)}` },
    ];
  }
  const year = parseIsoDate(conference.start).year;
  const days = dayRange(conference.start, conference.end, MONTH_NAMES);
  return [
    { text: `${authors} (${year}, ${days}). ` },
    { text: title, italic: true },
    { text: ` [Paper presentation]. ${conference.name}, ${place}.` },
  ];
}

/** IEEE: "presented at" until it's published, then "in" the proceedings, with the DOI. */
export function ieee(source: CiteSource): CiteRun[] {
  const { conference } = source;
  const names = source.authors.map((author) => `${initials(author.given)} ${author.family}`);
  // IEEE names up to six authors; past that, the first and "et al."
  const authors = names.length > 6 ? `${names[0]} et al.` : joinNames(names, "and", false);
  const place = `${conference.city}, ${conference.country}`;
  if (source.doi) {
    const year = parseIsoDate(source.published ?? conference.start).year;
    return [
      { text: `${authors}, “${source.title},” in ` },
      { text: conference.name, italic: true },
      { text: `, ${conference.proceedings}, ${place}, ${year}, doi: ${source.doi}.` },
    ];
  }
  const year = parseIsoDate(conference.start).year;
  const days = dayRange(conference.start, conference.end, IEEE_MONTHS);
  return [{ text: `${authors}, “${source.title},” presented at ${conference.name}, ${place}, ${days}, ${year}.` }];
}

/** A title with its acronyms braced, so a BibTeX style that lowercases titles keeps them. */
export function protect(title: string): string {
  return title
    .split(/(\s+)/)
    .map((token) =>
      /^\s+$/.test(token)
        ? token
        : token
            .split("-")
            .map((part) => (/\d/.test(part) || (part.match(/\p{Lu}/gu)?.length ?? 0) > 1 ? `{${part}}` : part))
            .join("-"),
    )
    .join("");
}

/** The entry's key: the first author's family name, the year and the title's first real word. */
export function bibtexKey(source: CiteSource): string {
  const year = parseIsoDate(source.published ?? source.conference.start).year;
  const word = source.title
    .split(/[^\p{L}\p{N}]+/u)
    .find((part) => part && !STOPWORDS.has(part.toLowerCase()))
    ?.toLowerCase();
  const family = (source.authors[0]?.family ?? "anon").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return `${family}${year}${word ?? ""}`;
}

/** BibTeX, every field a content field. */
export function bibtex(source: CiteSource): string {
  const { conference } = source;
  const date = parseIsoDate(source.published ?? conference.start);
  const fields: [string, string][] = [
    ["author", `{${source.authors.map((author) => `${author.family}, ${author.given}`).join(" and ")}}`],
    ["title", `{${protect(source.title)}}`],
    ["booktitle", `{${conference.name}}`],
    ["series", `{${conference.proceedings}}`],
    ["organization", `{${conference.host}}`],
    ["address", `{${conference.city}, ${conference.country}}`],
    ["month", BIBTEX_MONTHS[date.month - 1]],
    ["year", `{${date.year}}`],
    ["keywords", `{${source.keywords.join(", ")}}`],
    ...(source.doi ? ([["doi", `{${source.doi}}`]] as [string, string][]) : []),
  ];
  const width = Math.max(...fields.map(([name]) => name.length));
  const lines = fields.map(([name, value]) => `  ${name.padEnd(width)} = ${value},`);
  return `@inproceedings{${bibtexKey(source)},\n${lines.join("\n")}\n}`;
}

export function cite(source: CiteSource): Citations {
  return { apa: apa(source), ieee: ieee(source), bibtex: bibtex(source) };
}

/** A citation's plain text, as it's copied. */
export const plain = (runs: readonly CiteRun[]) => runs.map((run) => run.text).join("");
