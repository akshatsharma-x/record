import type { SearchPayload } from "./types.ts";

let request: Promise<SearchPayload> | null = null;

/** The build-time index, fetched once per visit (and again only if that failed). */
export function loadSearchIndex(): Promise<SearchPayload> {
  request ??= fetch("/search-index.json")
    .then((response) => {
      if (!response.ok) throw new Error(`The search index answered ${response.status}`);
      return response.json() as Promise<SearchPayload>;
    })
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}
