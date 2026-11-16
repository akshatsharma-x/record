import { content } from "@/content";
import { searchIndex } from "@/content/derive";
import type { SearchPayload } from "@/lib/search/types";

/**
 * The build-time search index (DESIGN.md §6.3), prerendered as a static file. Search
 * fetches it the first time a visitor shows intent, so it never weighs on first load.
 */
export function GET() {
  const { email, links } = content.profile;
  const payload: SearchPayload = {
    entries: searchIndex(content),
    profile: { email, linkedin: links.linkedin, github: links.github },
  };
  return Response.json(payload);
}
