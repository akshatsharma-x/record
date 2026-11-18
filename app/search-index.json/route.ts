import { content } from "@/content";
import { searchIndex } from "@/content/derive";
import { entrySource } from "@/lib/ask/documents";
import type { SearchPayload } from "@/lib/search/types";
import { secretCommands } from "@/lib/search/secrets";

/**
 * The build-time search index (DESIGN.md §6.3), prerendered as a static file. Search
 * fetches it the first time a visitor shows intent, so it never weighs on first load.
 */
export function GET() {
  const { email, links } = content.profile;
  const entries = searchIndex(content);
  const askSources = Object.fromEntries(
    entries.flatMap((entry) => {
      const source = entrySource(content, entry.id);
      return source ? [[entry.id, source] as const] : [];
    }),
  );
  const payload: SearchPayload = {
    entries,
    profile: { email, linkedin: links.linkedin, github: links.github, timeZone: content.profile.location.timeZone },
    secrets: secretCommands(content),
    askSources,
    ask: content.copy.ask,
  };
  return Response.json(payload);
}
