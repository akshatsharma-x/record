import type { SearchEntry } from "../../content/derive.ts";
import type { AskSource } from "../ask/documents.ts";
import type { Content } from "../../content/schema.ts";

/** One of Search's secret commands (DESIGN.md §8): it shows only when typed exactly. */
export interface SecretCommand {
  id: "command-hello" | "command-941" | "command-sudo" | "command-compare" | "command-retro" | "command-clarity";
  phrase: string;
  label: string;
  /** What the Island answers. */
  answer?: string;
  /** Where it goes. */
  href?: string;
}

/** What /search-index.json serves: the index, the profile links the actions open, and the secret commands that are on. */
export interface SearchPayload {
  entries: SearchEntry[];
  profile: { email: string; linkedin: string; github: string; timeZone: string };
  secrets: SecretCommand[];
  /** Each entry's source chip, for Ask's answers from the site's own text (lib/ask/fallback.ts). */
  askSources: Record<string, AskSource>;
  /** Ask's words in Search (content.copy.ask). */
  ask: AskCopy;
}

/** Ask's words, as content has them. */
export type AskCopy = Content["copy"]["ask"];

export type { SearchEntry };
