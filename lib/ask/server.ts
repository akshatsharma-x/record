import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { content } from "@/content";
import { memoryLimiter } from "@/lib/contact";
import { askDocuments } from "./documents";
import { ASK_MODEL, askParams, documentBlocks } from "./prompt";
import type { AskEvent, AskUnavailable, AskUsage } from "./protocol";

/**
 * Ask's server side (DESIGN.md §6.3, Part 14), from server-only environment variables:
 *
 *   ASK_ENABLED=true     generate answers; anything else (or nothing) is the kill switch,
 *                        and Search answers from the site's own text instead
 *   ANTHROPIC_API_KEY    the key; without it, the same
 *   ASK_MODEL            the model (default claude-opus-5-5)
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN   the rate limits (shared with Contact)
 *   ASK_LIMIT=memory     the limits in memory in a production build too (local evaluation)
 *
 * Ten questions a minute per IP and two hundred a day in all, both in a sliding window.
 * In development the limits live in memory; in production without Upstash, nothing is
 * generated: it fails closed, and the page answers from its own text. Nothing logged holds
 * a question: only counts, timings and token usage.
 */

export const ASK_RATE = {
  perIp: { requests: 10, window: "1 m", windowMs: 60_000 },
  global: { requests: 200, window: "1 d", windowMs: 86_400_000 },
} as const;

// Built once, so every request sends the same bytes ahead of its question and the prefix caches.
const DOCS = askDocuments(content);
const BLOCKS = documentBlocks(DOCS);

/** The part of the client Ask uses, so the tests can stand in for it. */
export type AskClient = { beta: { messages: Pick<Anthropic["beta"]["messages"], "stream"> } };

export interface AskDeps {
  /** null when generation is off: the kill switch, or no key. */
  client: AskClient | null;
  model: string;
  /** Takes one question from the visitor's and the day's allowance; false when either is spent. null: no limiter. */
  limit: ((ip: string) => Promise<boolean>) | null;
}

let cached: { key: string; client: Anthropic } | null = null;
let upstash: { key: string; perIp: Ratelimit; global: Ratelimit } | null = null;
let memory: { perIp: (key: string) => Promise<boolean>; global: (key: string) => Promise<boolean> } | null = null;

function limiterFromEnv(env: NodeJS.ProcessEnv): AskDeps["limit"] {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    if (upstash?.key !== `${url}|${token}`) {
      const redis = new Redis({ url, token });
      upstash = {
        key: `${url}|${token}`,
        perIp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(ASK_RATE.perIp.requests, ASK_RATE.perIp.window), prefix: "classyfolio:ask:ip" }),
        global: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(ASK_RATE.global.requests, ASK_RATE.global.window), prefix: "classyfolio:ask:all" }),
      };
    }
    const { perIp, global } = upstash;
    return async (ip) => (await perIp.limit(ip)).success && (await global.limit("all")).success;
  }
  if (env.NODE_ENV === "production" && env.ASK_LIMIT !== "memory") return null;
  memory ??= {
    perIp: memoryLimiter(ASK_RATE.perIp.requests, ASK_RATE.perIp.windowMs),
    global: memoryLimiter(ASK_RATE.global.requests, ASK_RATE.global.windowMs),
  };
  const { perIp, global } = memory;
  return async (ip) => (await perIp(ip)) && (await global("all"));
}

export function askDepsFromEnv(env: NodeJS.ProcessEnv = process.env): AskDeps {
  const enabled = env.ASK_ENABLED === "true";
  const key = env.ANTHROPIC_API_KEY;
  let client: Anthropic | null = null;
  if (enabled && key) {
    // One retry at most: a visitor is waiting, and the page has its own text to fall back on.
    if (cached?.key !== key) cached = { key, client: new Anthropic({ apiKey: key, maxRetries: 1, timeout: 20_000 }) };
    client = cached.client;
  }
  return { client, model: env.ASK_MODEL || ASK_MODEL, limit: limiterFromEnv(env) };
}

/** Whether a question may be generated now, before anything streams; else why not, as a status. */
export async function gate(ip: string, deps: AskDeps): Promise<{ ok: true; client: AskClient } | { ok: false; status: 429 | 503; reason: AskUnavailable }> {
  if (!deps.client || !deps.limit) return { ok: false, status: 503, reason: "unavailable" };
  try {
    if (!(await deps.limit(ip))) return { ok: false, status: 429, reason: "rate" };
  } catch {
    // A limiter that can't answer is closed, not open.
    return { ok: false, status: 503, reason: "unavailable" };
  }
  return { ok: true, client: deps.client };
}

function usageOf(message: BetaMessage): AskUsage {
  const { usage } = message;
  return {
    model: message.model,
    input: usage.input_tokens,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    output: usage.output_tokens,
    fellBack: (usage.iterations ?? []).some((entry) => entry.type === "fallback_message"),
  };
}

const counts = { answered: 0, declined: 0, failed: 0 };

/** One line per answer: counts, timing and tokens, never the question. */
function note(kind: keyof typeof counts, detail = "") {
  counts[kind] += 1;
  console.info(`ask: ${kind}${detail} (answered ${counts.answered}, declined ${counts.declined}, failed ${counts.failed})`);
}

/**
 * One answer, as events: `start` at once, then the answer's text as it streams, each block's
 * sources as they're cited, and `done` with the stop reason. The stop reason is checked
 * before the answer counts as one: a refusal (after the server-side fallback, too) is
 * `declined`, and the page drops what streamed. A failure is `unavailable`: the page
 * answers from its own text instead.
 */
export async function* answer(question: string, client: AskClient, model: string, signal?: AbortSignal): AsyncGenerator<AskEvent> {
  const started = performance.now();
  let first = 0;
  // The request goes out before anything is yielded: a generator runs only as it's read.
  const stream = client.beta.messages.stream(askParams(BLOCKS, question, model), { signal });
  yield { type: "start" };
  const sources = new Map<number, number>();
  try {
    for await (const event of stream) {
      if (event.type !== "content_block_delta") continue;
      const { delta } = event;
      if (delta.type === "text_delta") {
        first ||= performance.now();
        yield { type: "text", block: event.index, text: delta.text };
      } else if (delta.type === "citations_delta" && delta.citation.type === "char_location") {
        const index = delta.citation.document_index;
        const doc = DOCS[index];
        if (!doc) continue;
        let source = sources.get(index);
        if (source === undefined) {
          source = sources.size;
          sources.set(index, source);
          yield { type: "source", index: source, label: doc.label, target: doc.target, href: doc.href };
        }
        yield { type: "cite", block: event.index, source };
      }
    }
    const message = await stream.finalMessage();
    const usage = usageOf(message);
    const timing = ` in ${Math.round((first || performance.now()) - started)}ms to first text`;
    const tokens = `, tokens in ${usage.input} + cache write ${usage.cacheWrite} + cache read ${usage.cacheRead}, out ${usage.output}${usage.fellBack ? `, served by ${usage.model}` : ""}`;
    if (message.stop_reason === "refusal") {
      note("declined", tokens);
      yield { type: "declined" };
      return;
    }
    note("answered", timing + tokens);
    yield { type: "done", stop: message.stop_reason ?? "end_turn", usage };
  } catch (error) {
    if (signal?.aborted) return;
    // The class and the status only: never the question, the key or the body.
    note("failed", ` (${error instanceof Anthropic.APIError ? `status ${error.status ?? "none"}` : (error as Error).name})`);
    yield { type: "unavailable", reason: "unavailable" };
  }
}
