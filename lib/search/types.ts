import type { SearchEntry } from "../../content/derive.ts";

/** What /search-index.json serves: the index, and the profile links the actions open. */
export interface SearchPayload {
  entries: SearchEntry[];
  profile: { email: string; linkedin: string; github: string };
}

export type { SearchEntry };
