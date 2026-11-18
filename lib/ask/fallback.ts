import { expansions } from "@/lib/search/vocabulary";
import type { SearchEntry } from "@/lib/search/types";
import type { AskSource } from "./documents";

/**
 * Ask without a model (DESIGN.md §6.3, Part 14): with no key, a spent rate limit or no
 * connection, the same panel answers from Search's own index, already in the page. It
 * ranks the entries by the question's words and quotes the best few, each with its source
 * chip. Nothing is generated, and the panel says so.
 */

export interface Snippet {
  text: string;
  source: AskSource | null;
}

/** Words that say nothing about what's asked. */
const STOP = new Set(
  "a about all am an and any anything are as at be been but by can could did do does doing for from get got had has have how i if in into is it its just know like me more most much my of on or please say should so some tell than that the their them then there these they this those to up us use used uses using was we were what whats when where which who whom whose why will with would you your akshat akshats sharma sharmas".split(
    " ",
  ),
);

/** What a question's other words point at: the kind of entry they mean. */
const HINTS: [RegExp, SearchEntry["kind"] | `section:${string}`][] = [
  [/^(?:projects?|built|builds?|apps?|portfolio)$/, "work"],
  [/^(?:research|papers?|publications?|published|studies)$/, "paper"],
  [/^(?:research|papers?|publications?)$/, "section:research"],
  [/^(?:skills?|stack|languages?|tools?|frameworks?)$/, "skill"],
  [/^(?:skills?|stack)$/, "section:skills"],
  [/^(?:intern|internships?|experience|jobs?|works?|worked|working|employers?|companies)$/, "role"],
  [/^(?:education|degree|university|college|cgpa|grades?|studying|study|school)$/, "education"],
  [/^(?:honors?|honours?|awards?|achievements?|hackathons?)$/, "honor"],
  [/^(?:contact|touch|email|reach|hire|hiring|phone|call|message|linkedin|github)$/, "section:contact"],
];

/** Lowercase words, singular where a plain "s" made them plural. */
export function wordsOf(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      // A possessive is the word itself: "Akshat's" is "akshat".
      .replace(/['’]s\b/g, "")
      .match(/[\p{L}\p{N}][\p{L}\p{N}.+#]*/gu) ?? []
  )
    .map((word) => word.replace(/[.]+$/, ""))
    .filter((word) => word.length > 1)
    .map((word) => (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word));
}

const has = (words: Set<string>, term: string) => words.has(term) || (term.length >= 4 && [...words].some((word) => word.startsWith(term)));

function scoreOf(entry: SearchEntry, terms: string[], hints: Set<string>): number {
  const fields: [Set<string>, number][] = [
    [new Set(wordsOf(entry.title)), 3],
    [new Set(entry.keywords.flatMap(wordsOf)), 2],
    [new Set(wordsOf(entry.subtitle)), 1.5],
    [new Set(wordsOf(entry.body)), 1],
  ];
  let score = 0;
  for (const term of terms) for (const [words, weight] of fields) if (has(words, term)) score += weight;
  if (hints.has(entry.kind)) score += 3;
  if (hints.has(entry.id)) score += 5;
  return score;
}

/** Up to `max` characters, ending at a sentence or, failing that, a word. */
function clip(text: string, max = 240): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > max / 2) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

const sentence = (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`);

function snippetOf(entry: SearchEntry, profile: { email: string } | null): string {
  if (entry.id === "section:contact" && profile) return sentence(`${entry.subtitle} Email ${profile.email}, or write from the form in Contact`);
  const head = entry.subtitle ? `${entry.title}: ${entry.subtitle}` : entry.title;
  return clip([sentence(head), entry.body].filter(Boolean).join(" "));
}

/** The site's own best answer to a question: its closest entries, one per source chip. */
export function localAnswer(
  question: string,
  entries: readonly SearchEntry[],
  sources: Readonly<Record<string, AskSource>>,
  profile: { email: string } | null,
  max = 3,
): Snippet[] {
  const words = wordsOf(question).filter((word) => !STOP.has(word));
  const terms = [...new Set(words.flatMap((word) => [word, ...expansions(word).flatMap(wordsOf)]))];
  const hints = new Set(words.flatMap((word) => HINTS.filter(([pattern]) => pattern.test(word)).map(([, kind]) => kind)));
  if (terms.length === 0 && hints.size === 0) return [];
  const ranked = entries
    .map((entry) => ({ entry, score: scoreOf(entry, terms, hints) }))
    .filter((hit) => hit.score >= 3)
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: Snippet[] = [];
  for (const { entry } of ranked) {
    const source = sources[entry.id] ?? null;
    const key = source?.label ?? entry.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text: snippetOf(entry, profile), source });
    if (out.length === max) break;
  }
  return out;
}
