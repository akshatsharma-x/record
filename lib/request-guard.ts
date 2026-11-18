/**
 * Checks the site's POST endpoints share (DESIGN.md §7.9, §6.3): /api/contact and /api/ask.
 * Each takes JSON only, from this site's own pages, and knows the visitor's address only
 * for its rate limit; none of it is ever logged.
 */

export const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const hostOf = (origin: string): string | null => {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
};

/** The visitor's address, as the platform's proxy reports it, for the rate limit only: never logged. */
export function clientIp(request: Request): string {
  return (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim() || "local";
}

/**
 * The request's JSON body, or the response that refuses it: not JSON (415), from a page
 * elsewhere (403, "null" included), over `maxBody` bytes (413, the declared size before a
 * byte is read, then the true size) or not parseable (400).
 */
export async function readJson(request: Request, maxBody: number): Promise<{ body: unknown } | { refused: Response }> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return { refused: json({ error: "json" }, 415) };
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && hostOf(origin) !== host) return { refused: json({ error: "origin" }, 403) };
  if (Number(request.headers.get("content-length") ?? 0) > maxBody) return { refused: json({ error: "size" }, 413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBody) return { refused: json({ error: "size" }, 413) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { refused: json({ error: "json" }, 400) };
  }
}
