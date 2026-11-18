import { encodeEvent } from "@/lib/ask/protocol";
import { ASK, questionOf } from "@/lib/ask/question";
import { answer, askDepsFromEnv, gate } from "@/lib/ask/server";
import { clientIp, json, readJson } from "@/lib/request-guard";

/**
 * POST /api/ask (DESIGN.md §6.3, Part 14): a question about Akshat, answered from the site's
 * own content and streamed back as server-sent events (lib/ask/protocol.ts). It runs on the
 * default Node.js runtime: with Cache Components on, a route can't declare `runtime`, not
 * even "nodejs" (Next 16, route-segment-config/runtime), and POST handlers are never cached.
 *
 * Refused before anything streams: a request that isn't the site's own JSON (lib/request-guard.ts),
 * a question that's missing, empty or over 500 characters (400), generation that's off or
 * unconfigured (503) and a spent rate limit (429). The page answers the last two from its
 * own text, and says so.
 */

/** A 500-character question is at most 2,000 bytes of UTF-8, and JSON escaping can double that. */
const MAX_BODY = 4 * ASK.maxQuestion * 2 + 64;

export async function POST(request: Request): Promise<Response> {
  const read = await readJson(request, MAX_BODY);
  if ("refused" in read) return read.refused;
  const raw = (read.body as { question?: unknown } | null)?.question;
  if (typeof raw !== "string") return json({ error: "question" }, 400);
  const question = questionOf(raw);
  if (!question) return json({ error: "question" }, 400);
  if (question.length > ASK.maxQuestion) return json({ error: "long" }, 400);

  const deps = askDepsFromEnv();
  const verdict = await gate(clientIp(request), deps);
  if (!verdict.ok) return json({ reason: verdict.reason }, verdict.status);

  const events = answer(question, verdict.client, deps.model, request.signal);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(encodeEvent(value)));
    },
    async cancel() {
      await events.return(undefined);
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Proxies that buffer would hold the answer back until it's whole.
      "X-Accel-Buffering": "no",
    },
  });
}
