/**
 * The composer's rules (DESIGN.md §7.9), shared by the page (its lazy behavior, so zod/mini,
 * a fraction of classic zod's bytes) and POST /api/contact. Pure: the endpoint passes in the
 * rate limiter and the transport, so tests drive every path with fakes. Errors are codes;
 * the page says them in content's words (copy.contact.thread.errors).
 *
 * Adapted from the reference implementation in ~/Downloads/port (lib/contact.ts), without
 * its intents and its time trap: here, the honeypot and the rate limit guard the door.
 */
import * as z from "zod/mini";

export const CONTACT = {
  limits: { name: 100, email: 254, message: 5000 },
  /** Five sends an hour, per IP and per sender's address, in a sliding window. */
  rate: { sends: 5, window: "1 h", windowMs: 60 * 60 * 1000 },
  /** The request body's ceiling, in bytes: the message's limit and its envelope. */
  maxBody: 24_000,
  /** The field a person never sees, and a script fills in. */
  honeypot: "website",
} as const;

export type Field = "name" | "email" | "message";
export type FieldCode = "required" | "long" | "email";
export type ErrorCode = "rate" | "unavailable" | "failed";

const L = CONTACT.limits;

/** The visitor's words, each checked in order on the trimmed text; an issue's message is its code. */
export const ContactSchema = z.object({
  name: z.string({ error: "required" }).check(z.trim(), z.minLength(1, { error: "required" }), z.maxLength(L.name, { error: "long" })),
  email: z
    .string({ error: "required" })
    .check(z.trim(), z.minLength(1, { error: "required" }), z.maxLength(L.email, { error: "long" }), z.email({ error: "email" })),
  message: z.string({ error: "required" }).check(z.trim(), z.minLength(1, { error: "required" }), z.maxLength(L.message, { error: "long" })),
});
export type ContactInput = z.infer<typeof ContactSchema>;

const FIELDS: readonly Field[] = ["name", "email", "message"];
const CODES: readonly FieldCode[] = ["required", "long", "email"];

/** The first problem with each field, as a code; nothing hidden is ever named. */
export function fieldErrors(error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] }): Partial<Record<Field, FieldCode>> {
  const out: Partial<Record<Field, FieldCode>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as Field;
    if (!FIELDS.includes(field) || out[field]) continue;
    out[field] = CODES.includes(issue.message as FieldCode) ? (issue.message as FieldCode) : "required";
  }
  return out;
}

/** What the page shows for one field, as the visitor leaves it: its code, or null. */
export function checkField(field: Field, value: string): FieldCode | null {
  const result = ContactSchema.shape[field].safeParse(value);
  return result.success ? null : (fieldErrors({ issues: result.error.issues.map((issue) => ({ ...issue, path: [field] })) })[field] ?? "required");
}

/** Anything at all in the honeypot: a script filled it in, whatever else it sent. */
export function trapped(body: unknown): boolean {
  const trap = typeof body === "object" && body !== null ? (body as Record<string, unknown>)[CONTACT.honeypot] : undefined;
  return trap !== undefined && trap !== null && String(trap).trim() !== "";
}

export interface Mail {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

/** What the endpoint needs from the world. A null limiter or transport is one that isn't configured. */
export interface ContactDeps {
  /** Takes one send from `key`'s allowance; false when it's spent. null: no limiter, so the endpoint refuses. */
  limit: ((key: string) => Promise<boolean>) | null;
  /** Delivers the mail and returns its id. null: no transport, so the endpoint refuses too. */
  send: ((mail: Mail) => Promise<{ id: string }>) | null;
  to: string;
  subject: (input: ContactInput) => string;
}

export type ContactResult =
  | { status: 202; id: string | null }
  | { status: 400; fields: Partial<Record<Field, FieldCode>> }
  | { status: 429 | 502 | 503; error: ErrorCode };

/**
 * One submission, in order: the honeypot (a quiet 202 that sends nothing, before anything
 * could tell a script what's wrong), the words (400), the rate limit, per IP and per sender
 * (429), then the send (502 if it fails). No limiter or no transport is a 503: the form is
 * never an open relay, and the page offers the visitor's mail app instead.
 */
export async function handleContact(body: unknown, ip: string, deps: ContactDeps): Promise<ContactResult> {
  if (trapped(body)) return { status: 202, id: null };
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) return { status: 400, fields: fieldErrors(parsed.error) };
  const input = parsed.data;
  if (!deps.limit || !deps.send) return { status: 503, error: "unavailable" };
  // An address's own window too: a forwarded-for header is only as true as its proxy.
  let allowed = true;
  try {
    for (const key of [`ip:${ip}`, `mail:${input.email.toLowerCase()}`]) if (!(await deps.limit(key))) allowed = false;
  } catch {
    // A limiter that can't answer is closed, not open.
    return { status: 503, error: "unavailable" };
  }
  if (!allowed) return { status: 429, error: "rate" };
  try {
    const { id } = await deps.send({
      to: deps.to,
      replyTo: input.email,
      subject: deps.subject(input),
      text: `${input.message}\n\n— ${input.name} <${input.email}>`,
    });
    return { status: 202, id };
  } catch {
    return { status: 502, error: "failed" };
  }
}

/** The way out when the form can't send: the visitor's mail app, with their words already in it. */
export function mailtoFor(to: string, subject: string, input: Partial<ContactInput>): string {
  const signature = [input.name?.trim(), input.email?.trim() ? `<${input.email.trim()}>` : ""].filter(Boolean).join(" ");
  const body = [input.message?.trim(), signature ? `— ${signature}` : ""].filter(Boolean).join("\n\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
}

/**
 * A sliding window in memory, the stand-in for Upstash where there are no keys (locally,
 * and in the tests): `sends` per `windowMs` per key, and a refused send isn't counted.
 */
export function memoryLimiter(sends: number, windowMs: number, now: () => number = Date.now): (key: string) => Promise<boolean> {
  const hits = new Map<string, number[]>();
  return async (key) => {
    const at = now();
    const recent = (hits.get(key) ?? []).filter((t) => at - t < windowMs);
    const ok = recent.length < sends;
    if (ok) recent.push(at);
    if (recent.length > 0) hits.set(key, recent);
    else hits.delete(key);
    return ok;
  };
}
