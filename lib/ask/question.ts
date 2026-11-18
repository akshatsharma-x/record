/**
 * Ask (DESIGN.md §6.3, Part 14): when a query reads like a question, Search offers to
 * answer it from the site's own content. Shared by Search and POST /api/ask.
 */

export const ASK = {
  /** The longest question the endpoint takes, in characters. */
  maxQuestion: 500,
  /** The longest answer, in words. */
  maxWords: 90,
} as const;

/** The words a question starts with, as the brief lists them; "what's" and "how's" count too. */
const STARTERS = /^(?:what|how|why|who|which|does|is|can|tell)\b/i;

/** The question as it's sent and compared: trimmed, with single spaces. */
export function questionOf(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Whether a query reads like a question: it ends with "?", or it starts with what, how,
 * why, who, which, does, is, can or tell and has a word after it. "is" alone, "how" alone
 * and "isolation forests" don't; "Is Akshat available" and "tell me about the research" do.
 */
export function isQuestion(text: string): boolean {
  const question = questionOf(text);
  if (question.length < 3 || question.length > ASK.maxQuestion) return false;
  if (question.endsWith("?")) return /\p{L}/u.test(question);
  return STARTERS.test(question) && question.split(" ").length >= 2;
}
