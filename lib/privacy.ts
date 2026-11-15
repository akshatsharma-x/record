/**
 * The phone number is never published (DESIGN.md §2 rule 2). These patterns describe the
 * *shape* of an Indian phone number, so the privacy test can fail on anything that looks
 * like one. The real number is written nowhere in this repo, not even here.
 *
 * Runs under plain Node for the prebuild content check: no path aliases.
 */

/** One optional space, dot or hyphen between digits. */
const SEP = "[\\s.-]?";

export const PHONE_PATTERNS: readonly RegExp[] = [
  // +91 (or 0091) followed by 10 digits, with optional single separators: +91 98xxx xxxxx
  new RegExp(`(?<![\\w+/=])(?:\\+|00)\\s?91${SEP}(?:\\d${SEP}){9}\\d(?!\\d)`, "g"),
  // A bare 10-digit mobile number starting with 6–9, optionally with a trunk 0,
  // written solid, 5-5 or 3-3-4. It can't be part of a longer number, a decimal or a word.
  new RegExp(`(?<![\\w.])0?[6-9]\\d{9}(?!\\w|\\.\\d)`, "g"),
  new RegExp(`(?<![\\w.])0?[6-9]\\d{4}[\\s-]\\d{5}(?!\\w|\\.\\d)`, "g"),
  new RegExp(`(?<![\\w.])0?[6-9]\\d{2}[\\s-]\\d{3}[\\s-]\\d{4}(?!\\w|\\.\\d)`, "g"),
];

export interface PhoneHit {
  /** Offset of the match in the scanned text. */
  index: number;
  length: number;
}

/**
 * Finds phone-shaped numbers. It reports positions only, never the digits, so a leak
 * can't be repeated in test output or CI logs.
 */
export function findPhoneNumbers(text: string): PhoneHit[] {
  const hits: PhoneHit[] = [];
  for (const pattern of PHONE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      hits.push({ index: match.index, length: match[0].length });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** 1-based line and column of an offset, for pointing at a hit without printing it. */
export function lineAndColumn(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  const column = index - before.lastIndexOf("\n");
  return { line, column };
}
