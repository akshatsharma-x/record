import { CONTACT, handleContact } from "@/lib/contact";
import { contactDeps } from "@/lib/contact-server";

/**
 * POST /api/contact: the composer's endpoint (DESIGN.md §7.9). The rules are lib/contact.ts's
 * and the connections lib/contact-server.ts's; this checks the request itself. It takes JSON
 * only, from this site's own pages, up to CONTACT.maxBody bytes. POST handlers are never
 * cached (Next 16, getting-started/route-handlers), so it needs no segment config.
 */

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const hostOf = (origin: string): string | null => {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
};

/** The visitor's address, as the platform's proxy reports it, for the rate limit only: never logged. */
function clientIp(request: Request): string {
  return (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim() || "local";
}

export async function POST(request: Request): Promise<Response> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "json" }, 415);
  // This site's own pages only: a page elsewhere can't post here ("null" included).
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && hostOf(origin) !== host) return json({ error: "origin" }, 403);
  // The declared size before reading a byte, then the true size (a body can understate it).
  if (Number(request.headers.get("content-length") ?? 0) > CONTACT.maxBody) return json({ error: "size" }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > CONTACT.maxBody) return json({ error: "size" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "json" }, 400);
  }
  const result = await handleContact(body, clientIp(request), contactDeps());
  return json(result, result.status);
}
