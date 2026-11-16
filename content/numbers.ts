/**
 * Finding the numbers in content text. The schema uses it to check that every figure a
 * highlight's film draws is stated by the notes it cites; derive.ts uses it to warn about
 * numbers without footnotes (DESIGN.md §9).
 *
 * Runs under plain Node for the prebuild content check: no path aliases.
 */

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
  // A figure keeps its qualifiers: "90%+", "2,500+".
  return (rest.match(/[$~]?\d[\d.,/–-]*[%+]{0,2}/g) ?? []).map((n) => n.replace(/[.,–-]+$/, ""));
}

/**
 * The values those numbers state: "$0.08–0.11" is 0.08 and 0.11, "2,500+" is 2500 and
 * "~30%" is 30. Ranges give both ends.
 */
export function valuesIn(text: string): number[] {
  return numbersIn(text).flatMap((token) =>
    token
      .replace(/^[$~]+|[%+]+$/g, "")
      .split("–")
      .map((part) => Number(part.replace(/,/g, "")))
      .filter((value) => Number.isFinite(value)),
  );
}
