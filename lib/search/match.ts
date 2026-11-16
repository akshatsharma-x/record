import { expansions } from "./vocabulary.ts";

/**
 * Fuzzy matching for Search (DESIGN.md §6.3). Pure and synchronous: the whole index is
 * about a hundred entries, so every keystroke scores all of them.
 *
 * - Every typed word must match something (AND), in the title, keywords, subtitle or body,
 *   weighted in that order.
 * - A word matches exactly, as a prefix, inside a longer word, or with a typo: one edit
 *   for words of 4 letters or more, two from 8 (transpositions count as one).
 * - The vocabulary (vocabulary.ts) and skill aliases let a word match what it means.
 */
export interface Searchable {
  id: string;
  title: string;
  subtitle: string;
  keywords: readonly string[];
  body: string;
}

interface Field {
  tokens: string[];
  weight: number;
}

export interface Prepared<T extends Searchable> {
  item: T;
  title: string;
  fields: Field[];
}

export interface Hit<T extends Searchable> {
  item: T;
  score: number;
}

const WEIGHTS = { title: 1, keywords: 0.85, subtitle: 0.7, body: 0.45 } as const;

/** Words too common to be a typo's target: "theme" shouldn't find "them". */
const STOPWORDS = new Set(
  "a an and are as at be but by for from has have in into is it its of on or that the their them then there these they this to was were with".split(" "),
);
/** A word reached through the vocabulary counts for a little less than the word itself. */
const EXPANDED = 0.8;

/** Lowercase, without accents, punctuation as spaces. "Résumé" is "resume"; "C/C++" is "c c++". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

export function words(text: string): string[] {
  const normal = normalize(text);
  return normal ? normal.split(" ") : [];
}

function field(text: string, weight: number): Field {
  return { tokens: words(text), weight };
}

export function prepare<T extends Searchable>(item: T): Prepared<T> {
  return {
    item,
    title: normalize(item.title),
    fields: [
      field(item.title, WEIGHTS.title),
      field(item.keywords.join(" "), WEIGHTS.keywords),
      field(item.subtitle, WEIGHTS.subtitle),
      field(item.body, WEIGHTS.body),
    ],
  };
}

/** Optimal string alignment distance, giving up once it passes `limit`. */
export function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) rows.push([i]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, rows[i - 2][j - 2] + 1);
      rows[i][j] = value;
      best = Math.min(best, value);
    }
    if (best > limit) return limit + 1;
  }
  return rows[a.length][b.length];
}

/** Words typed together that line up with the field's words: "nextjs" is "next" + "js". */
function joined(word: string, tokens: string[]): number {
  for (let i = 0; i < tokens.length - 1; i++) {
    let text = tokens[i];
    for (let j = i + 1; j < tokens.length && text.length < word.length; j++) {
      text += tokens[j];
      if (text === word) return 0.8;
      if (text.startsWith(word)) return 0.6;
    }
  }
  return 0;
}

/** How well one typed word matches a field, from 0 to 1. */
function wordScore(word: string, target: Field): number {
  let best = 0;
  const limit = word.length >= 8 ? 2 : 1;
  for (const token of target.tokens) {
    if (token === word) return 1;
    if (STOPWORDS.has(token)) continue;
    if (word.length >= 2 && token.startsWith(word)) best = Math.max(best, 0.85);
    else if (word.length >= 4) {
      // Inside a longer word ("graph" in "langgraph"), but only for words long enough
      // that it isn't chance: "rag" isn't in "coverage".
      if (token.includes(word)) best = Math.max(best, 0.6);
      const edits = distance(word, token, limit);
      if (edits <= limit) best = Math.max(best, 0.7 - 0.15 * edits);
      // A word still being typed, with a typo in it.
      else if (word.length >= 5 && token.length > word.length && distance(word, token.slice(0, word.length), 1) <= 1) {
        best = Math.max(best, 0.45);
      }
    }
  }
  if (best < 0.8 && word.length >= 4) best = Math.max(best, joined(word, target.tokens));
  return best;
}

function bestField(word: string, fields: Field[]): number {
  let best = 0;
  for (const target of fields) best = Math.max(best, target.weight * wordScore(word, target));
  return best;
}

/** A phrase from the vocabulary matches when each of its words does. */
function phraseScore(phrase: string, fields: Field[]): number {
  let worst = 1;
  for (const word of words(phrase)) {
    worst = Math.min(worst, bestField(word, fields));
    if (worst === 0) return 0;
  }
  return worst;
}

export function score<T extends Searchable>(prepared: Prepared<T>, query: string): number {
  const typed = words(query);
  if (typed.length === 0) return 0;
  let total = 0;
  for (const word of typed) {
    let best = bestField(word, prepared.fields);
    for (const phrase of expansions(word)) best = Math.max(best, EXPANDED * phraseScore(phrase, prepared.fields));
    if (best === 0) return 0;
    total += best;
  }
  let result = total / typed.length;
  const normal = typed.join(" ");
  if (prepared.title === normal) result += 0.4;
  else if (prepared.title.startsWith(normal)) result += 0.2;
  return result;
}

/** Every entry that matches, best first. Ties keep their order in the index. */
export function rank<T extends Searchable>(items: readonly Prepared<T>[], query: string): Hit<T>[] {
  const hits: (Hit<T> & { order: number })[] = [];
  items.forEach((prepared, order) => {
    const value = score(prepared, query);
    if (value > 0) hits.push({ item: prepared.item, score: value, order });
  });
  hits.sort((a, b) => b.score - a.score || a.order - b.order);
  return hits.map(({ item, score: value }) => ({ item, score: value }));
}
