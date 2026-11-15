import { readFileSync } from "node:fs";
import path from "node:path";
import { spring } from "motion";
import { describe, expect, it } from "vitest";
import { parseCss, rootTokens } from "@/lib/css-tokens";
import {
  cubicBezier,
  curves,
  durations,
  gsapEase,
  gsapSpring,
  scrub,
  scrubStep,
  springAt,
  springLinear,
  springs,
  springSettle,
  stagger,
} from "@/lib/motion";

const tokens = rootTokens(parseCss(readFileSync(path.join(process.cwd(), "styles", "tokens.css"), "utf8")));

describe("springs", () => {
  it.each(Object.entries(springs))("%s matches Motion's own spring", (_, config) => {
    const generator = spring({ keyframes: [0, 1], visualDuration: config.visualDuration, bounce: config.bounce });
    // Compare until Motion comes to rest: from then on it snaps exactly to the target.
    for (let ms = 0; ms <= 2000; ms += 20) {
      const state = generator.next(ms);
      if (state.done) break;
      expect(springAt(config, ms / 1000)).toBeCloseTo(state.value as number, 3);
    }
  });

  it("snappy overshoots slightly on release (§6.5), smooth never does", () => {
    const peak = (name: keyof typeof springs) =>
      Math.max(...Array.from({ length: 200 }, (_, i) => springAt(springs[name], i / 200)));
    expect(peak("snappy")).toBeGreaterThan(1);
    expect(peak("snappy")).toBeLessThan(1.01);
    expect(peak("smooth")).toBeLessThanOrEqual(1);
  });

  it.each(Object.entries(springs))("the CSS easing for %s is generated from the same spring", (name, config) => {
    expect(tokens.get(`--ease-spring-${name}`)).toBe(springLinear(config));
    expect(tokens.get(`--duration-spring-${name}`)).toBe(`${Math.round(springSettle(config) * 1000)}ms`);
  });

  it("gives GSAP the same spring over its settle time", () => {
    const { duration, ease } = gsapSpring("bouncy");
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(springAt(springs.bouncy, duration / 2), 10);
  });
});

describe("curves", () => {
  it("match their CSS tokens", () => {
    expect(tokens.get("--ease-out")).toBe(`cubic-bezier(${curves.out.join(", ")})`);
    expect(tokens.get("--ease-in-out")).toBe(`cubic-bezier(${curves.inOut.join(", ")})`);
    expect(tokens.get("--ease-emphasized")).toBe(`cubic-bezier(${curves.emphasized.join(", ")})`);
  });

  it("solve cubic-bezier like a browser", () => {
    const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);
    for (const x of [0, 0.1, 0.5, 0.9, 1]) expect(linear(x)).toBeCloseTo(x, 6);
    const out = gsapEase("out");
    expect(out(0)).toBe(0);
    expect(out(1)).toBe(1);
    expect(out(0.5)).toBeGreaterThan(0.9);
    let last = 0;
    for (let x = 0; x <= 1; x += 0.01) {
      expect(out(x)).toBeGreaterThanOrEqual(last - 1e-9);
      last = out(x);
    }
  });
});

describe("durations", () => {
  it.each([
    ["--duration-micro-short", durations.microShort],
    ["--duration-micro", durations.micro],
    ["--duration-ui", durations.ui],
    ["--duration-ui-long", durations.uiLong],
    ["--duration-reveal-short", durations.revealShort],
    ["--duration-reveal", durations.reveal],
    ["--duration-reveal-long", durations.revealLong],
    ["--duration-count", durations.count],
    ["--stagger-lines", stagger.lines],
  ])("%s matches lib/motion.ts", (token, ms) => {
    expect(tokens.get(token)).toBe(`${ms}ms`);
  });

  it("stay inside DESIGN.md's ranges (§5.3)", () => {
    expect(durations.microShort).toBeGreaterThanOrEqual(150);
    expect(durations.micro).toBeLessThanOrEqual(200);
    expect(durations.ui).toBeGreaterThanOrEqual(300);
    expect(durations.uiLong).toBeLessThanOrEqual(400);
    expect(durations.revealShort).toBeGreaterThanOrEqual(600);
    expect(durations.revealLong).toBeLessThanOrEqual(900);
    expect(durations.reveal).toBe(700);
    expect(durations.count).toBeLessThanOrEqual(1200);
  });

  it("scrub matches its token", () => {
    expect(tokens.get("--scrub")).toBe(`${scrub}s`);
  });
});

describe("scroll smoothing", () => {
  it("is frame-rate independent: two 120 Hz frames move as far as one 60 Hz frame", () => {
    const at60 = scrubStep(1 / 60);
    const at120 = scrubStep(1 / 120);
    const twoFrames = 1 - (1 - at120) * (1 - at120);
    expect(twoFrames).toBeCloseTo(at60, 12);
  });

  it("catches up within 5% after the scrub time (§5.5)", () => {
    expect(scrubStep(scrub)).toBeGreaterThanOrEqual(0.95);
  });
});
