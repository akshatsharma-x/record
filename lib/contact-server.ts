import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { content } from "@/content";
import { CONTACT, type ContactDeps, type ContactInput, type Mail, memoryLimiter } from "./contact";

/**
 * The composer's connections to the world (DESIGN.md §7.9), from server-only environment
 * variables; none reaches the browser:
 *
 *   RESEND_API_KEY                                     delivery, through Resend's REST API
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN   the rate limit, with Upstash Ratelimit
 *   CONTACT_TO      where messages go (default: the profile's email)
 *   CONTACT_FROM    who they're from (default: Resend's onboarding sender, which can write
 *                   only to the account's own address until a domain is verified)
 *   CONTACT_TRANSPORT=console   use the console transport and an in-memory limit in a
 *                   production build too (the end-to-end tests do)
 *
 * In development, the console transport stands in for Resend and memory for Upstash. In
 * production, a missing key means no transport or no limiter, so the endpoint answers 503
 * and the page offers the visitor's mail app: it fails closed, and gracefully.
 *
 * Nothing logged holds personal data: no names, addresses, words or IPs; only statuses and lengths.
 */

const local = (env: NodeJS.ProcessEnv) => env.NODE_ENV !== "production" || env.CONTACT_TRANSPORT === "console";

let upstash: { key: string; limiter: Ratelimit } | null = null;
let memory: ((key: string) => Promise<boolean>) | null = null;

/** The rate limit: Upstash with keys; memory, locally; else none. */
export function limiterFromEnv(env: NodeJS.ProcessEnv = process.env): ContactDeps["limit"] {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    if (upstash?.key !== `${url}|${token}`) {
      upstash = {
        key: `${url}|${token}`,
        limiter: new Ratelimit({
          redis: new Redis({ url, token }),
          limiter: Ratelimit.slidingWindow(CONTACT.rate.sends, CONTACT.rate.window),
          prefix: "classyfolio:contact",
        }),
      };
    }
    const { limiter } = upstash;
    return async (key) => {
      try {
        return (await limiter.limit(key)).success;
      } catch (error) {
        console.error(`contact: the rate limit didn't answer (${(error as Error).name})`);
        throw error;
      }
    };
  }
  if (!local(env)) return null;
  memory ??= memoryLimiter(CONTACT.rate.sends, CONTACT.rate.windowMs);
  return memory;
}

/** Delivery through Resend's REST API, reply-to set to the visitor. */
export function resendTransport(key: string, from: string, fetcher: typeof fetch = fetch): NonNullable<ContactDeps["send"]> {
  return async (mail: Mail) => {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!response.ok || !body?.id) {
      // The status alone: never the words, the addresses or the key.
      console.error(`contact: Resend answered ${response.status}`);
      throw new Error(`resend ${response.status}`);
    }
    return { id: body.id };
  };
}

let delivered = 0;

/** The local stand-in for Resend: it says a message arrived, and how long it was, nothing more. */
export const consoleTransport: NonNullable<ContactDeps["send"]> = async (mail) => {
  delivered += 1;
  const id = `console-${delivered}`;
  console.info(`contact: the console transport took message ${id} (${mail.text.length} characters, with a reply-to)`);
  return { id };
};

/** The transport: Resend with a key; the console, locally; else none. */
export function transportFromEnv(env: NodeJS.ProcessEnv = process.env): ContactDeps["send"] {
  const key = env.RESEND_API_KEY;
  if (key) return resendTransport(key, env.CONTACT_FROM ?? "Akshat Sharma's site <onboarding@resend.dev>");
  return local(env) ? consoleTransport : null;
}

/** Everything handleContact needs, as configured right now. */
export function contactDeps(env: NodeJS.ProcessEnv = process.env): ContactDeps {
  const words = content.copy.contact.thread;
  return {
    limit: limiterFromEnv(env),
    send: transportFromEnv(env),
    to: env.CONTACT_TO ?? content.profile.email,
    // A crafted request's control characters stay out of the subject header.
    subject: (input: ContactInput) => `${words.subject} · ${input.name.replace(/\p{Cc}+/gu, " ")}`,
  };
}
