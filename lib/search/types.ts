import type { SearchEntry } from "../../content/derive.ts";

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
}

export type { SearchEntry };
