import type { AskSource } from "./documents";

/**
 * What POST /api/ask streams back (DESIGN.md §6.3, Part 14), as server-sent events: one
 * `event:` line naming the type and one `data:` line of JSON each. Text arrives in blocks;
 * a block that a document supports gets `cite` events naming its sources, which arrive
 * first as `source` events, in the order the answer first cites them.
 */

export type AskUnavailable = "unavailable" | "rate" | "offline";

export interface AskUsage {
  model: string;
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
  /** Whether a fallback model answered, after the requested one declined. */
  fellBack: boolean;
}

export type AskEvent =
  | { type: "start" }
  | { type: "text"; block: number; text: string }
  | ({ type: "source"; index: number } & AskSource)
  | { type: "cite"; block: number; source: number }
  /** The whole answer is here; `stop` is the model's stop reason. */
  | { type: "done"; stop: string; usage: AskUsage | null }
  /** The model declined the question: drop what streamed and say so. */
  | { type: "declined" }
  /** Nothing can be generated now: answer from the site's own text instead. */
  | { type: "unavailable"; reason: AskUnavailable };

export function encodeEvent(event: AskEvent): string {
  const { type, ...data } = event;
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Parses one server-sent event; null for anything that isn't one of ours. */
export function decodeEvent(raw: string): AskEvent | null {
  let type = "";
  const data: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) type = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!type) return null;
  try {
    const body = data.length > 0 ? (JSON.parse(data.join("\n")) as object) : {};
    return { type, ...body } as AskEvent;
  } catch {
    return null;
  }
}

/** The events in a streamed body, as they arrive. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AskEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let end = buffer.indexOf("\n\n");
      while (end !== -1) {
        const event = decodeEvent(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (event) yield event;
        end = buffer.indexOf("\n\n");
      }
    }
    const last = decodeEvent(buffer);
    if (last) yield last;
  } finally {
    reader.releaseLock();
  }
}
