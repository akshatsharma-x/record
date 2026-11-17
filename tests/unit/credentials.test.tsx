// @vitest-environment jsdom
/**
 * Credentials (DESIGN.md §7.8): the wallet's passes come from content alone, so a
 * certificate added to content is a pass with no code change (proved with the fixtures in
 * content/fixtures.ts); the heading derives from data and never counts; the QR codes scan
 * back to their verify URLs; the medals are minted, ordered and engraved from content; and
 * they turn and come to rest as lib/medal-motion.ts says.
 */
import { cleanup, render } from "@testing-library/react";
import jsQR from "jsqr";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "@/components/credentials/wallet";
import { content } from "@/content";
import { data } from "@/content/data";
import { credentialsHeadline, expiryOf, medals, wallet } from "@/content/derive";
import { FIXTURE_CERTIFICATES, withCertificates } from "@/content/fixtures";
import { ContentError, parseContent } from "@/content/schema";
import { atRest, createMotion, drag, faceAt, flip, MEDAL_MOTION, release, step } from "@/lib/medal-motion";
import { backEngraving, faceEngraving, inset, MEDAL, MEDAL_SHAPES, outline, signedArea, svgPath, widthAt } from "@/lib/medals";
import { findPhoneNumbers } from "@/lib/privacy";
import { qrCode, qrModules } from "@/lib/qr";
import { QUIET, quietTurn } from "@/lib/quiet";
import { byPlace, hasExpired, moveFocus, slots } from "@/lib/wallet";

afterEach(cleanup);

function problemsOf(input: unknown): string[] {
  try {
    parseContent(input);
  } catch (error) {
    if (error instanceof ContentError) return error.problems;
    throw error;
  }
  throw new Error("expected the content to fail validation");
}

describe("the heading", () => {
  it('reads "Education." while content has no certificates', () => {
    expect(content.certificates).toEqual([]);
    expect(credentialsHeadline(content)).toBe("Education.");
    expect(wallet(content).headline).toBe("Education.");
  });

  it('reads "Credentials." with one certificate, and with several', () => {
    expect(wallet(withCertificates(FIXTURE_CERTIFICATES.slice(0, 1))).headline).toBe("Credentials.");
    expect(wallet(withCertificates()).headline).toBe("Credentials.");
  });

  it("never counts, so it can never say 0 certificates", () => {
    for (const certificates of [[], FIXTURE_CERTIFICATES.slice(0, 1), FIXTURE_CERTIFICATES]) {
      expect(wallet(withCertificates(certificates)).headline).not.toMatch(/\d/);
    }
    const { container } = render(<Wallet passes={wallet(content).passes} />);
    expect(container.textContent).not.toMatch(/0 certificates?/i);
  });
});

describe("the wallet", () => {
  it("opens with Education: the university, the degree, the class and the grade", () => {
    const [education] = wallet(content).passes;
    expect(education.kind).toBe("education");
    expect([education.title, education.subtitle, ...education.fields.map((field) => `${field.label} ${field.value}`)]).toEqual([
      "Manipal University Jaipur",
      "B.Tech, Computer Science and Engineering",
      "Class of 2027",
      "Grade CGPA 8.79/10",
    ]);
  });

  it("lists the coursework, Class XII and Class X on Education's back", () => {
    const [education] = wallet(content).passes;
    expect(education.back).toEqual([
      expect.objectContaining({ kind: "list", label: "Coursework", items: content.education[0].kind === "degree" ? content.education[0].coursework : [] }),
      expect.objectContaining({ kind: "text", label: "Class XII", text: "95.4%, 2022" }),
      expect.objectContaining({ kind: "text", label: "Class X", text: "93.8%, 2020" }),
    ]);
  });

  it("adds a pass for each certificate added to content, in its order, with no code change", () => {
    const passes = wallet(withCertificates()).passes;
    expect(passes.map((pass) => pass.id)).toEqual(["manipal-university-jaipur", ...FIXTURE_CERTIFICATES.map((certificate) => certificate.id)]);
    const { container } = render(<Wallet passes={passes} />);
    const rendered = Array.from(container.querySelectorAll(".pass"));
    expect(rendered.map((pass) => pass.getAttribute("data-pass"))).toEqual(passes.map((pass) => pass.id));
    // Each certificate's own words, on its own pass.
    FIXTURE_CERTIFICATES.forEach((certificate, i) => {
      const pass = rendered[i + 1];
      expect(pass.querySelector(".pass-title")?.textContent).toBe(certificate.title);
      expect(pass.querySelector(".pass-subtitle")?.textContent).toBe(certificate.issuer);
      if (certificate.credentialId) expect(pass.querySelector(".pass-mono")?.textContent).toBe(certificate.credentialId);
      expect(pass.querySelector(".pass-qr") !== null).toBe(certificate.verifyUrl !== null);
      if (certificate.verifyUrl) expect(pass.querySelector<HTMLAnchorElement>(".pass-link")?.href).toBe(certificate.verifyUrl);
    });
  });

  it("gives each pass its own color: an issuer's tone, else the finish's in turn", () => {
    const { container } = render(<Wallet passes={wallet(withCertificates()).passes} />);
    const tones = Array.from(container.querySelectorAll<HTMLElement>(".pass"), (pass) => [pass.dataset.tone, pass.style.getPropertyValue("--pass-tone")]);
    expect(tones).toEqual([
      ["0", ""],
      ["1", ""],
      ["issuer", "#1f4f7a"],
      ["issuer", "#6b3f1d"],
    ]);
  });

  it("says a pass has expired only once its month has certainly passed", () => {
    // Content's latest known month is the edit's: here, when the latest role ended.
    expect(expiryOf(content, "2025-01")).toEqual({ label: "Expired", value: "Jan 2025", expires: "2025-01", expired: true });
    expect(expiryOf(content, "2029-03")).toEqual({ label: "Expires", value: "Mar 2029", expires: "2029-03", expired: false });
    expect(expiryOf(content, "never")).toEqual({ label: "Expires", value: "Never", expires: null, expired: false });
    expect(expiryOf(content, null)).toBeNull();
    const { container } = render(<Wallet passes={wallet(withCertificates()).passes} />);
    // A badge waits on each pass with an expiry date, shown only where it has passed.
    const badges = Array.from(container.querySelectorAll<HTMLElement>("[data-expiry-badge]"), (badge) => [badge.closest(".pass")?.getAttribute("data-pass"), badge.hidden]);
    expect(badges).toEqual([
      ["fixture-cloud", true],
      ["fixture-expired", false],
    ]);
  });

  it("lets the browser say Expired after the build, by the visitor's calendar", () => {
    expect(hasExpired("2026-10", new Date(2026, 10, 17))).toBe(true);
    expect(hasExpired("2026-11", new Date(2026, 10, 17))).toBe(false);
    expect(hasExpired("2026-12", new Date(2026, 10, 17))).toBe(false);
  });

  it("checks an issuer's tone carries white type", () => {
    const certificate = { ...FIXTURE_CERTIFICATES[1], tone: "#ffd60a" };
    expect(problemsOf({ ...structuredClone(data), certificates: [certificate] })).toEqual([
      expect.stringMatching(/^certificates\[fixture-ml\]\.tone: white text on #ffd60a is 1\.\d+:1, under 4\.5:1/),
    ]);
  });
});

describe("the QR codes", () => {
  /** What a phone's camera would see: the modules at 4px each, black on white. */
  function scan(url: string) {
    const code = qrCode(url);
    const grid = qrModules(code);
    const scale = 4;
    const size = code.size * scale;
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = grid[Math.floor(y / scale)][Math.floor(x / scale)] ? 0 : 255;
        pixels.set([v, v, v, 255], (y * size + x) * 4);
      }
    }
    return jsQR(pixels, size, size)?.data;
  }

  it.each(FIXTURE_CERTIFICATES.filter((certificate) => certificate.verifyUrl))("scan back to $id's verify URL", ({ verifyUrl }) => {
    expect(scan(verifyUrl!)).toBe(verifyUrl);
  });

  it("scan a long verify URL too", () => {
    const url = "https://www.credly.com/badges/0f3c5a8e-1b2d-4e6f-9a7b-3c4d5e6f7a8b/public_url";
    expect(scan(url)).toBe(url);
  });

  it("keep a quiet zone and write no phone-shaped run of digits", () => {
    const { size, d } = qrCode("https://example.com/verify/EX-CLD-7Q4K");
    const grid = qrModules({ size, d });
    for (const i of [0, 1, 2, 3]) {
      expect(grid[i].some(Boolean)).toBe(false);
      expect(grid.map((row) => row[i]).some(Boolean)).toBe(false);
    }
    expect(findPhoneNumbers(d)).toEqual([]);
  });
});

describe("the medals", () => {
  it("are one per honor, in the order they were won, each engraved as content says", () => {
    expect(medals(content).map((medal) => `${medal.face} — ${medal.line}`)).toEqual([
      "Dean's List — 2024",
      "Smart India Hackathon — 2024 · 2025 · top 50 of 300+",
      "Student Excellence Award — 2026",
    ]);
  });

  it("each have their own minted shape", () => {
    const shapes = medals(content).map((medal) => medal.shape);
    expect(new Set(shapes).size).toBe(shapes.length);
    expect(problemsOf({ ...structuredClone(data), achievements: data.achievements.map((a) => ({ ...a, medal: { ...a.medal, shape: "circle" } })) })).toEqual([
      expect.stringMatching(/medal shape/),
      expect.stringMatching(/medal shape/),
    ]);
  });

  it("engrave only what their honor's detail states", () => {
    const sih = data.achievements.find((a) => a.id === "smart-india-hackathon")!;
    const edited = data.achievements.map((a) => (a === sih ? { ...a, medal: { ...a.medal, line: "top 10 of 300+" } } : a));
    expect(problemsOf({ ...structuredClone(data), achievements: edited })).toEqual([expect.stringMatching(/10 isn't in this achievement's detail/)]);
  });

  it("carry their description on the back: the detail, else who gave it and when", () => {
    expect(medals(content).map((medal) => medal.back)).toEqual([
      "Manipal University Jaipur · 2024",
      "Qualified at the college level in 2024 and 2025, among the top 50 of 300+ teams.",
      "Manipal University Jaipur · 2026",
    ]);
  });

  describe.each(MEDAL_SHAPES)("the %s", (shape) => {
    const edge = outline(shape);

    it("is a closed outline, counterclockwise, about the size of the others", () => {
      expect(signedArea(edge)).toBeGreaterThan(0);
      expect(signedArea(edge) / 2).toBeGreaterThan(2.5);
      expect(signedArea(edge) / 2).toBeLessThan(3.3);
      for (const [x, y] of edge) {
        expect(Math.abs(x)).toBeLessThanOrEqual(1.06);
        expect(Math.abs(y)).toBeLessThanOrEqual(1.06);
      }
    });

    it("insets evenly, so its rim is the same width all the way round", () => {
      for (const distance of [MEDAL.bevel, MEDAL.rim, MEDAL.field]) {
        const inner = inset(edge, distance);
        let nearest = Number.POSITIVE_INFINITY;
        for (const p of inner) for (const q of edge) nearest = Math.min(nearest, Math.hypot(p[0] - q[0], p[1] - q[1]));
        expect(nearest).toBeGreaterThanOrEqual(distance - 1e-6);
        expect(signedArea(inner)).toBeGreaterThan(0);
      }
    });

    it("fits every engraved letter inside its field, face and back", () => {
      const field = inset(edge, MEDAL.field);
      for (const engraving of [faceEngraving(shape, "Student Excellence Award", "2024 · 2025 · top 50 of 300+"), backEngraving(shape, medals(content)[1].back)]) {
        for (const run of engraving.runs) {
          const room = Math.min(widthAt(field, run.y + run.size / 2), widthAt(field, run.y - run.size / 2));
          expect(run.text.length * (run.caps ? 0.7 : 0.56) * run.size).toBeLessThanOrEqual(room);
          expect(run.size).toBeGreaterThan(0.07);
        }
      }
    });

    it("draws its still with commas between coordinates, never a phone-shaped run", () => {
      expect(findPhoneNumbers(svgPath(edge, 240, 100))).toEqual([]);
    });
  });
});

describe("a medal's motion", () => {
  const settle = (motion = createMotion(), dt = 1 / 60) => {
    let t = 0;
    while (step(motion, dt)) {
      t += dt;
      if (t > 10) throw new Error("never came to rest");
    }
    return t;
  };

  it("is perfectly still at rest: on a face, with nothing moving", () => {
    const motion = createMotion();
    expect(atRest(motion)).toBe(true);
    expect(step(motion, 1 / 60)).toBe(false);
    expect(motion).toEqual(createMotion());
  });

  it("turns over on a click and comes to rest exactly on its back", () => {
    const motion = createMotion();
    flip(motion);
    expect(faceAt(motion.target!)).toBe("back");
    settle(motion);
    expect(motion.angle).toBe(Math.PI);
    expect(atRest(motion)).toBe(true);
  });

  it("follows a drag, then keeps spinning with inertia and lands on a face", () => {
    const motion = createMotion();
    drag(motion, 60, 0, 120);
    expect(motion.angle).toBeCloseTo(Math.PI / 2, 6);
    expect(release(motion, 6)).toBe(false);
    settle(motion);
    expect(atRest(motion)).toBe(true);
    expect([0, Math.PI]).toContain(Math.abs(motion.angle));
  });

  it("calls a hard flick a flick, spins it fast and still lets it rest", () => {
    const motion = createMotion();
    expect(release(motion, MEDAL_MOTION.flick + 4)).toBe(true);
    expect(release(createMotion(), MEDAL_MOTION.flick - 4)).toBe(false);
    const seconds = settle(motion);
    expect(seconds).toBeGreaterThan(0.5);
    expect(atRest(motion)).toBe(true);
  });

  it("is driven by time, not frames: the same flick lands the same way at 60 and 120 Hz", () => {
    const at60 = createMotion();
    const at120 = createMotion();
    release(at60, 22);
    release(at120, 22);
    const t60 = settle(at60, 1 / 60);
    const t120 = settle(at120, 1 / 120);
    expect(faceAt(at60.angle)).toBe(faceAt(at120.angle));
    expect(Math.abs(t60 - t120)).toBeLessThan(0.05);
  });
});

describe("the stack", () => {
  it("puts the pass in front first and the rest beneath it in content's order", () => {
    expect(slots(4, 0)).toEqual([0, 1, 2, 3]);
    expect(slots(4, 2)).toEqual([1, 2, 0, 3]);
    expect(byPlace(4, 2)).toEqual([2, 0, 1, 3]);
    expect(slots(1, 0)).toEqual([0]);
  });

  it("moves focus through it as it's seen, stopping at the ends", () => {
    // Front is pass 2: seen in the order 2, 0, 1, 3.
    expect(moveFocus("ArrowDown", 2, 4, 2)).toBe(0);
    expect(moveFocus("ArrowRight", 0, 4, 2)).toBe(1);
    expect(moveFocus("ArrowUp", 0, 4, 2)).toBe(2);
    expect(moveFocus("ArrowUp", 2, 4, 2)).toBe(2);
    expect(moveFocus("ArrowDown", 3, 4, 2)).toBe(3);
    expect(moveFocus("Home", 3, 4, 2)).toBe(2);
    expect(moveFocus("End", 2, 4, 2)).toBe(3);
    expect(moveFocus("Enter", 2, 4, 2)).toBeNull();
  });
});

describe("quiet moments, for building a medal's scene", () => {
  it("wait until the page has stopped scrolling, and take turns, one moment each", async () => {
    vi.useFakeTimers();
    const done: string[] = [];
    void quietTurn().then(() => done.push("first"));
    void quietTurn().then(() => done.push("second"));
    await vi.advanceTimersByTimeAsync(QUIET - 20);
    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(QUIET - 20);
    // Still scrolling a moment ago: nothing yet.
    expect(done).toEqual([]);
    await vi.advanceTimersByTimeAsync(40);
    expect(done).toEqual(["first"]);
    await vi.advanceTimersByTimeAsync(QUIET);
    expect(done).toEqual(["first", "second"]);
    vi.useRealTimers();
  });
});
