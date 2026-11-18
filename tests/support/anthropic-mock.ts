/**
 * A stand-in for the Messages API, for Ask's tests and for trying Ask locally without a key
 * (DESIGN.md §6.3, Part 14). It answers POST /v1/messages with a streamed message in the
 * documented shape: a thinking block, then text blocks, each cited sentence carrying a
 * `citations_delta` with a `char_location` into the document it came from, then the stop
 * reason and the usage, with a cache write on the first request and a cache read after.
 * It picks the documents that share the most words with the question, so its answers
 * point where a real one would. It records every request, for the tests to inspect.
 *
 * Special questions: one containing "__refuse__" is declined (stop_reason "refusal"), and
 * one containing "__fail__" gets a 500.
 *
 *   node tests/support/anthropic-mock.ts      # listens on ANTHROPIC_MOCK_PORT, default 3299
 *
 * Plain Node too: erasable TypeScript only.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { pathToFileURL } from "node:url";

interface DocumentBlock {
  type: "document";
  title?: string;
  source: { type: "text"; data: string };
  cache_control?: unknown;
  citations?: { enabled: boolean };
}

export interface MockRequest {
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown> & { messages: { role: string; content: (DocumentBlock | { type: "text"; text: string })[] }[] };
}

export interface AnthropicMock {
  url: string;
  requests: MockRequest[];
  close: () => Promise<void>;
}

const STOP = new Set(
  "a an and are at be by can do does for from how i in is it me of on or tell the to was what when where which who why with akshat akshat's sharma about".split(" "),
);
const wordsOf = (text: string) =>
  (text.toLowerCase().match(/[\p{L}\p{N}.]+/gu) ?? [])
    .map((w) => w.replace(/\.$/, ""))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .filter((w) => w.length > 1 && !STOP.has(w));

/** How long between words, in milliseconds: ANTHROPIC_MOCK_DELAY slows it down to watch it stream. */
const WORD_MS = Number(process.env.ANTHROPIC_MOCK_DELAY ?? 8);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function send(res: ServerResponse, type: string, data: unknown) {
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function answer(req: IncomingMessage, res: ServerResponse, seen: number, requests: MockRequest[]) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw) as MockRequest["body"];
  requests.push({ headers: req.headers, body });
  const content = body.messages[0]?.content ?? [];
  const docs = content.filter((block): block is DocumentBlock => block.type === "document");
  const question = content.filter((block): block is { type: "text"; text: string } => block.type === "text").map((block) => block.text).join(" ");
  if (question.includes("__fail__")) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "Internal server error" } }));
    return;
  }

  // The documents that share the most words with the question, and their first lines.
  const asked = new Set(wordsOf(question));
  const ranked = docs
    // Each word once, and a word in the title five times over: a document about the thing, not one that lists it.
    .map((doc, index) => ({
      index,
      doc,
      score: [...new Set(wordsOf(doc.source.data))].filter((w) => asked.has(w)).length + 5 * [...new Set(wordsOf(doc.title ?? ""))].filter((w) => asked.has(w)).length,
    }))
    .filter((hit) => hit.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  const cachedTokens = 3400;
  res.writeHead(200, { "content-type": "text/event-stream", "request-id": `req_mock_${seen}` });
  send(res, "message_start", {
    type: "message_start",
    message: {
      id: `msg_mock_${seen}`,
      type: "message",
      role: "assistant",
      model: body.model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 24, cache_creation_input_tokens: seen === 1 ? cachedTokens : 0, cache_read_input_tokens: seen === 1 ? 0 : cachedTokens, output_tokens: 1 },
    },
  });
  // A short think first, as a low-effort answer has: an empty block under the default display.
  send(res, "content_block_start", { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "", signature: "" } });
  send(res, "content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "mock" } });
  send(res, "content_block_stop", { type: "content_block_stop", index: 0 });
  await wait(40);

  let index = 1;
  const block = async (text: string, citation?: { doc: number; start: number; end: number }) => {
    send(res, "content_block_start", { type: "content_block_start", index, content_block: { type: "text", text: "", ...(citation ? { citations: [] } : {}) } });
    for (const piece of text.match(/\S+\s*/g) ?? [text]) {
      send(res, "content_block_delta", { type: "content_block_delta", index, delta: { type: "text_delta", text: piece } });
      await wait(WORD_MS);
    }
    if (citation) {
      const doc = docs[citation.doc]!;
      send(res, "content_block_delta", {
        type: "content_block_delta",
        index,
        delta: {
          type: "citations_delta",
          citation: {
            type: "char_location",
            cited_text: doc.source.data.slice(citation.start, citation.end),
            document_index: citation.doc,
            document_title: doc.title ?? null,
            start_char_index: citation.start,
            end_char_index: citation.end,
            file_id: null,
          },
        },
      });
    }
    send(res, "content_block_stop", { type: "content_block_stop", index });
    index += 1;
  };

  let stop = "end_turn";
  if (question.includes("__refuse__")) {
    await block("Here is the start of an answer that ");
    stop = "refusal";
  } else if (ranked.length === 0) {
    await block("That isn't in the portfolio. Akshat can answer it through Contact.");
  } else {
    await block("From the portfolio: ");
    for (const { index: doc, doc: { source } } of ranked) {
      // The second line, or the first: past the line that names the document.
      const lines = source.data.split("\n");
      const line = lines[Math.min(2, lines.length - 1)]!;
      const start = source.data.indexOf(line);
      await block(`${line.replace(/\.$/, "")}. `, { doc, start, end: start + line.length });
    }
  }
  send(res, "message_delta", {
    type: "message_delta",
    delta: { stop_reason: stop, stop_sequence: null, ...(stop === "refusal" ? { stop_details: { type: "refusal", category: null, explanation: null } } : {}) },
    usage: { output_tokens: 72 },
  });
  send(res, "message_stop", { type: "message_stop" });
  res.end();
}

export async function startAnthropicMock(port = 0): Promise<AnthropicMock> {
  const requests: MockRequest[] = [];
  let seen = 0;
  const server: Server = createServer((req, res) => {
    if (req.method === "POST" && req.url?.startsWith("/v1/messages")) {
      seen += 1;
      answer(req, res, seen, requests).catch(() => res.destroy());
      return;
    }
    // Something to say it's up, for Playwright's webServer.
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/plain" }).end("anthropic mock");
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const { port: bound } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${bound}`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mock = await startAnthropicMock(Number(process.env.ANTHROPIC_MOCK_PORT ?? 3299));
  console.log(`anthropic mock on ${mock.url}`);
}
