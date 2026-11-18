import { CONTACT, handleContact } from "@/lib/contact";
import { contactDeps } from "@/lib/contact-server";
import { clientIp, json, readJson } from "@/lib/request-guard";

/**
 * POST /api/contact: the composer's endpoint (DESIGN.md §7.9). The rules are lib/contact.ts's
 * and the connections lib/contact-server.ts's; lib/request-guard.ts checks the request
 * itself: JSON only, from this site's own pages, up to CONTACT.maxBody bytes. POST handlers
 * are never cached (Next 16, getting-started/route-handlers), so it needs no segment config.
 */
export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request, CONTACT.maxBody);
  if ("refused" in read) return read.refused;
  const result = await handleContact(read.body, clientIp(request), contactDeps());
  return json(result, result.status);
}
