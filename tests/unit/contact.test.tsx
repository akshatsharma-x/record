// @vitest-environment jsdom
/**
 * The close (DESIGN.md §7.9, Part 12): the composer's rules and every path through
 * POST /api/contact (the honeypot, the words, the rate limit of five an hour, the
 * transports and what happens without keys), the dock's magnification, the live lines,
 * and the footer's notes and settings.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { rangeEnds } from "@/components/contact/contact-clock";
import { Dock } from "@/components/contact/dock";
import { Footer } from "@/components/footer/footer";
import { content } from "@/content";
import { data } from "@/content/data";
import { ContentError, parseContent } from "@/content/schema";
import { CONTACT, checkField, ContactSchema, type ContactDeps, handleContact, type Mail, mailtoFor, memoryLimiter, trapped } from "@/lib/contact";
import { consoleTransport, contactDeps, resendTransport } from "@/lib/contact-server";
import { DOCK, magnify, swell } from "@/lib/dock";
import { workingOverlap } from "@/lib/glance";
import { findPhoneNumbers } from "@/lib/privacy";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const HOUR = 60 * 60 * 1000;
const good = { name: "Ada Lovelace", email: "Ada@Example.com", message: "Interpretable models for logistics?" };
const post = (over: Record<string, unknown> = {}) => ({ ...good, website: "", ...over });

function world(over: Partial<ContactDeps> = {}) {
  let now = Date.UTC(2026, 10, 17, 12);
  const sent: Mail[] = [];
  const limit = vi.fn(memoryLimiter(CONTACT.rate.sends, CONTACT.rate.windowMs, () => now));
  const send = vi.fn(async (mail: Mail) => {
    sent.push(mail);
    return { id: `re_${sent.length}` };
  });
  const deps: ContactDeps = { limit, send, to: "owner@example.com", subject: (input) => `Hello from your site · ${input.name}`, ...over };
  return { deps, sent, limit, send, advance: (ms: number) => (now += ms) };
}

describe("the composer's rules (lib/contact.ts)", () => {
  it("are the brief's: five sends an hour, per IP", () => {
    expect(CONTACT.rate).toMatchObject({ sends: 5, window: "1 h", windowMs: HOUR });
  });

  it("say what's wrong with each field as a code, on the trimmed words", () => {
    const codes = (input: Record<string, unknown>) => {
      const result = ContactSchema.safeParse(input);
      return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]).reverse());
    };
    expect(codes({ name: "", email: "", message: "" })).toEqual({ name: "required", email: "required", message: "required" });
    expect(codes({ ...good, email: "ada@" })).toEqual({ email: "email" });
    expect(codes({ ...good, name: "x".repeat(CONTACT.limits.name + 1) })).toEqual({ name: "long" });
    expect(codes({ ...good, message: "x".repeat(CONTACT.limits.message + 1) })).toEqual({ message: "long" });
    expect(codes({ ...good, name: "   ", message: "  " })).toEqual({ name: "required", message: "required" });
    expect(ContactSchema.parse({ ...good, name: "  Ada  " }).name).toBe("Ada");
    expect(checkField("email", "ada@example.com")).toBeNull();
    expect(checkField("email", "ada@example")).toBe("email");
    expect(checkField("message", "")).toBe("required");
  });

  it("have friendly words in content for every code", () => {
    const errors = content.copy.contact.thread.errors;
    for (const words of Object.values(errors)) expect(words).toMatch(/\S/);
    expect(Object.values(errors).join(" ")).not.toMatch(/!/);
  });
});

describe("POST /api/contact's paths (handleContact, with fakes)", () => {
  it("delivers a message to Akshat, with the reply-to set to the visitor", async () => {
    const w = world();
    expect(await handleContact(post(), "203.0.113.7", w.deps)).toEqual({ status: 202, id: "re_1" });
    expect(w.limit.mock.calls.map(([key]) => key)).toEqual(["ip:203.0.113.7", "mail:ada@example.com"]);
    expect(w.sent).toEqual([
      {
        to: "owner@example.com",
        replyTo: "Ada@Example.com",
        subject: "Hello from your site · Ada Lovelace",
        text: `${good.message}\n\n— Ada Lovelace <Ada@Example.com>`,
      },
    ]);
  });

  it("names the fields a visitor got wrong (400), and never sends", async () => {
    const w = world();
    expect(await handleContact(post({ email: "nope", message: "" }), "ip", w.deps)).toEqual({ status: 400, fields: { email: "email", message: "required" } });
    expect(await handleContact(null, "ip", w.deps)).toMatchObject({ status: 400 });
    expect(w.limit).not.toHaveBeenCalled();
    expect(w.send).not.toHaveBeenCalled();
  });

  it("answers a filled honeypot with a quiet 202, and sends nothing, whatever else came", async () => {
    const w = world();
    for (const website of ["https://spam.example", { a: 1 }, 42]) expect(await handleContact(post({ website, email: "bad" }), "ip", w.deps)).toEqual({ status: 202, id: null });
    expect(w.limit).not.toHaveBeenCalled();
    expect(w.send).not.toHaveBeenCalled();
    expect(trapped({ website: "   " })).toBe(false);
    expect(trapped({ website: null })).toBe(false);
  });

  it("holds an IP to five sends an hour, and lets it send again as the hour slides by", async () => {
    const w = world();
    for (let i = 0; i < 5; i++) expect(await handleContact(post({ email: `p${i}@example.com` }), "198.51.100.1", w.deps)).toMatchObject({ status: 202 });
    expect(await handleContact(post({ email: "p9@example.com" }), "198.51.100.1", w.deps)).toEqual({ status: 429, error: "rate" });
    expect(w.sent).toHaveLength(5);
    // Another IP isn't held.
    expect(await handleContact(post({ email: "q@example.com" }), "198.51.100.2", w.deps)).toMatchObject({ status: 202 });
    w.advance(HOUR);
    expect(await handleContact(post({ email: "p9@example.com" }), "198.51.100.1", w.deps)).toMatchObject({ status: 202 });
  });

  it("holds an address to five an hour from any number of IPs (a forwarded-for can lie)", async () => {
    const w = world();
    for (let i = 0; i < 5; i++) expect(await handleContact(post(), `192.0.2.${i}`, w.deps)).toMatchObject({ status: 202 });
    expect(await handleContact(post({ email: "ADA@example.com" }), "192.0.2.99", w.deps)).toEqual({ status: 429, error: "rate" });
  });

  it("fails closed: no limiter, no transport, or a limiter that can't answer is a 503, and nothing is sent", async () => {
    const w = world();
    expect(await handleContact(post(), "ip", { ...w.deps, limit: null })).toEqual({ status: 503, error: "unavailable" });
    expect(await handleContact(post(), "ip", { ...w.deps, send: null })).toEqual({ status: 503, error: "unavailable" });
    const down = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await handleContact(post(), "ip", { ...w.deps, limit: down })).toEqual({ status: 503, error: "unavailable" });
    expect(w.send).not.toHaveBeenCalled();
  });

  it("says when the send itself fails (502)", async () => {
    const w = world({
      send: async () => {
        throw new Error("resend 500");
      },
    });
    expect(await handleContact(post(), "ip", w.deps)).toEqual({ status: 502, error: "failed" });
  });
});

describe("the way out: mailtoFor keeps the visitor's words", () => {
  it("carries the message and who wrote it, encoded, to Akshat", () => {
    const url = new URL(mailtoFor("owner@example.com", "Hello from your site", { ...good, message: "Rates & dates? #1\nThanks" }));
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("owner@example.com");
    expect(url.searchParams.get("subject")).toBe("Hello from your site");
    expect(url.searchParams.get("body")).toBe("Rates & dates? #1\nThanks\n\n— Ada Lovelace <Ada@Example.com>");
    expect(mailtoFor("owner@example.com", "Hi", {})).toBe("mailto:owner@example.com?subject=Hi");
  });
});

describe("the endpoint itself (app/api/contact/route.ts)", () => {
  const request = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost", origin: "http://localhost", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("fails gracefully in production without keys: 503, and the page offers the mail app", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("CONTACT_TRANSPORT", "");
    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(request(post()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 503, error: "unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("delivers through the console transport locally, and limits an IP to five an hour", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const { POST } = await import("@/app/api/contact/route");
    const ip = { "x-forwarded-for": "203.0.113.50, 10.0.0.1" };
    for (let i = 0; i < 5; i++) {
      const response = await POST(request(post({ email: `ada${i}@example.com` }), ip));
      expect(response.status).toBe(202);
    }
    const sixth = await POST(request(post({ email: "ada9@example.com" }), ip));
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toEqual({ status: 429, error: "rate" });
  });

  it("takes JSON only, from this site only, up to its size, and well formed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await import("@/app/api/contact/route");
    expect((await POST(request(post(), { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request(post(), { origin: "https://elsewhere.example" }))).status).toBe(403);
    expect((await POST(request(post({ message: "x".repeat(CONTACT.maxBody) })))).status).toBe(413);
    expect((await POST(request("{not json"))).status).toBe(400);
  });

  it("logs no personal data: no name, address, words or IP", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { POST } = await import("@/app/api/contact/route");
    await POST(request(post({ email: "private@example.com" }), { "x-forwarded-for": "203.0.113.77" }));
    const logged = info.mock.calls.flat().join(" ");
    expect(logged).toMatch(/console transport/);
    for (const secret of ["Ada", "private@example.com", "logistics", "203.0.113.77"]) expect(logged).not.toContain(secret);
  });
});

describe("the transports (lib/contact-server.ts)", () => {
  it("send through Resend's API with the reply-to set to the visitor, and fail on its errors, logging only the status", async () => {
    const fetcher = vi.fn(async () => Response.json({ id: "re_123" }));
    const send = resendTransport("re_test_key", "Site <onboarding@resend.dev>", fetcher as unknown as typeof fetch);
    expect(await send({ to: "owner@example.com", replyTo: "ada@example.com", subject: "Hello", text: "Hi" })).toEqual({ id: "re_123" });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    expect(JSON.parse(init.body as string)).toEqual({ from: "Site <onboarding@resend.dev>", to: ["owner@example.com"], reply_to: "ada@example.com", subject: "Hello", text: "Hi" });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const refused = resendTransport("re_test_key", "x", (async () => Response.json({ message: "nope" }, { status: 403 })) as unknown as typeof fetch);
    await expect(refused({ to: "owner@example.com", replyTo: "ada@example.com", subject: "Hello", text: "Hi" })).rejects.toThrow("resend 403");
    expect(error.mock.calls.flat().join(" ")).toBe("contact: Resend answered 403");
  });

  it("pick Resend and Upstash with keys, the console and memory locally, and nothing in production without keys", () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const production = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
    expect(contactDeps(production)).toMatchObject({ limit: null, send: null, to: content.profile.email });
    const keyed = contactDeps({ ...production, RESEND_API_KEY: "re_x", UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" } as NodeJS.ProcessEnv);
    expect(typeof keyed.limit).toBe("function");
    expect(typeof keyed.send).toBe("function");
    expect(keyed.send).not.toBe(consoleTransport);
    const local = contactDeps({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    expect(local.send).toBe(consoleTransport);
    expect(typeof local.limit).toBe("function");
    // The e2e tests' production server: the console, on purpose.
    expect(contactDeps({ ...production, CONTACT_TRANSPORT: "console" } as NodeJS.ProcessEnv).send).toBe(consoleTransport);
  });

  it("keep control characters out of the subject", () => {
    const deps = contactDeps({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    expect(deps.subject({ ...good, name: "Ada\r\nBcc: x@example.com" })).toBe(`${content.copy.contact.thread.subject} · Ada Bcc: x@example.com`);
  });
});

describe("the dock's magnification (lib/dock.ts)", () => {
  it("falls off on a cosine: whole under the pointer, nothing at its reach, symmetric", () => {
    expect(swell(0)).toBeCloseTo(DOCK.grow, 6);
    expect(swell(DOCK.reach)).toBe(1);
    expect(swell(DOCK.reach + 1)).toBe(1);
    expect(swell(0.8)).toBeCloseTo(swell(-0.8), 9);
    for (let d = 0; d < DOCK.reach; d += 0.1) expect(swell(d + 0.1)).toBeLessThanOrEqual(swell(d) + 1e-12);
    // Its slope is flat at the top and at the edge.
    expect(swell(0.01)).toBeCloseTo(DOCK.grow, 3);
  });

  it("rests, all at 1, with the pointer away", () => {
    expect(magnify(3, 60, 12, null)).toEqual({ scales: [1, 1, 1], shifts: [0, 0, 0], left: 0, right: 204 });
  });

  it("spreads the row so no two icons overlap, and keeps the spot under the pointer under it", () => {
    const size = 60;
    const gap = 12;
    for (let pointer = -20; pointer <= 224; pointer += 4) {
      const { scales, shifts, left, right } = magnify(3, size, gap, pointer);
      const centers = [30, 102, 174].map((c, i) => c + shifts[i]);
      for (let i = 0; i < 2; i++) {
        const end = centers[i] + (size * scales[i]) / 2;
        const start = centers[i + 1] - (size * scales[i + 1]) / 2;
        expect(start - end).toBeGreaterThanOrEqual(gap - 1e-6);
      }
      expect(left).toBeLessThanOrEqual(centers[0] - (size * scales[0]) / 2 + 1e-6);
      expect(right).toBeGreaterThanOrEqual(centers[2] + (size * scales[2]) / 2 - 1e-6);
    }
    // Right over the middle icon, it stays put and is the biggest.
    const middle = magnify(3, size, gap, 102);
    expect(middle.shifts[1]).toBeCloseTo(0, 6);
    expect(Math.max(...middle.scales)).toBe(middle.scales[1]);
  });
});

describe("the live lines", () => {
  const at = new Date(Date.UTC(2026, 10, 17, 16, 11));
  const mine = { start: "10:00", end: "18:00", timeZone: "Asia/Kolkata" };
  const day = content.copy.about.visitorDay;

  it("write a stretch of the day as the visitor's locale does, with the dash closed up", () => {
    // The locale's own space before the meridiem: a narrow no-break space, in current ICU.
    const plain = (ends: { from: string; to: string }) => ({ from: ends.from.replace(/\s/g, " "), to: ends.to.replace(/\s/g, " ") });
    expect(plain(rangeEnds(15 * 60 + 30, 18 * 60 + 30, true, "en-US"))).toEqual({ from: "3:30", to: "6:30 PM" });
    expect(plain(rangeEnds(9 * 60, 13 * 60 + 30, true, "en-US"))).toEqual({ from: "9:00 AM", to: "1:30 PM" });
    expect(rangeEnds(15 * 60 + 30, 18 * 60 + 30, false, "en-GB")).toEqual({ from: "15:30", to: "18:30" });
  });

  it("find the overlap on the visitor's clock, or none", () => {
    expect(workingOverlap(mine, { ...day, timeZone: "Europe/Berlin" }, at).shared).toEqual([9 * 60, 13 * 60 + 30]);
    expect(workingOverlap(mine, { ...day, timeZone: "America/New_York" }, at).shared).toBeNull();
  });

  it("are content's, with their slots", () => {
    const { contact } = content.copy;
    expect(contact.clock).toContain("{time}");
    expect(contact.overlap).toContain("{from}");
    const broken = structuredClone(data);
    (broken.copy.contact as { clock: string }).clock = "It's late";
    expect(() => parseContent(broken)).toThrow(ContentError);
  });
});

describe("the dock (components/contact/dock.tsx)", () => {
  it("holds Email, LinkedIn and GitHub, each a link that works without JavaScript, and the résumé", () => {
    const { container } = render(<Dock />);
    const items = Array.from(container.querySelectorAll<HTMLAnchorElement>(".dock-item"));
    expect(items.map((item) => [item.dataset.app, item.querySelector(".dock-label")?.textContent, item.getAttribute("href")])).toEqual([
      ["email", "Email", `mailto:${content.profile.email}`],
      ["linkedin", "LinkedIn", content.profile.links.linkedin],
      ["github", "GitHub", content.profile.links.github],
      ["resume", "Résumé", "#contact"],
    ]);
    expect(items[1].target).toBe("_blank");
    expect(items[1].rel).toBe("noopener");
    // Until there's a phone-free PDF the résumé is the print edition: it needs JavaScript to
    // print, so without it, it isn't offered (Part 17).
    expect(items[3].hasAttribute("data-print")).toBe(true);
    expect(items[3].hasAttribute("download")).toBe(false);
    expect(items[3].closest(".dock-slot")?.classList.contains("needs-js")).toBe(true);
  });

  it("makes the résumé a download once there's a phone-free PDF", async () => {
    expect(content.profile.resumePdf).toBeNull();
    vi.resetModules();
    vi.doMock("@/content", async () => {
      const real = await vi.importActual<typeof import("@/content")>("@/content");
      return { content: { ...real.content, profile: { ...real.content.profile, resumePdf: "/resume.pdf" } } };
    });
    const { Dock: WithResume } = await import("@/components/contact/dock");
    const { container } = render(<WithResume />);
    const resume = container.querySelector<HTMLAnchorElement>('.dock-item[data-app="resume"]');
    expect(resume?.getAttribute("href")).toBe("/resume.pdf");
    expect(resume?.hasAttribute("download")).toBe(true);
    vi.doUnmock("@/content");
  });
});

describe("the footer (components/footer/footer.tsx)", () => {
  it("numbers the notes and gives each mention its own way back", () => {
    const { container } = render(<Footer notes={[{ id: 1, note: "A note.", source: "A source.", mentions: 3 }, { id: 4, note: "Another.", source: null, mentions: 1 }]} />);
    const notes = Array.from(container.querySelectorAll(".footer-note"));
    expect(notes.map((note) => note.id)).toEqual(["fn-1", "fn-4"]);
    expect(Array.from(notes[0].querySelectorAll('a[role="doc-backlink"]'), (a) => a.getAttribute("href"))).toEqual(["#fnref-1", "#fnref-1-2", "#fnref-1-3"]);
    expect(Array.from(notes[1].querySelectorAll('a[role="doc-backlink"]'), (a) => a.getAttribute("href"))).toEqual(["#fnref-4"]);
  });

  it("maps the site, says it has no cookies, and credits Akshat, with no phone number anywhere", () => {
    const { container } = render(<Footer notes={[]} />);
    expect(Array.from(container.querySelectorAll(".footer-link"), (a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Overview", "/#top"],
      ["Work", "/#work"],
      ["Research", "/#research"],
      ["Specs", "/specs"],
      ["Colophon", "/colophon"],
    ]);
    expect(container.textContent).toContain(content.copy.footer.cookies);
    expect(container.textContent).toContain(content.copy.footer.credit);
    expect(findPhoneNumbers(container.innerHTML)).toEqual([]);
  });
});
