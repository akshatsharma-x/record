/**
 * The hero's logic (lib/hero.ts, DESIGN.md §7): the aperture's stops, the Lock Screen
 * date line, the light's warmth through the day, and the CSS twins in styles/tokens.css
 * that must agree with the brief's numbers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCss, rootTokens } from "@/lib/css-tokens";
import { APERTURE, apertureBlur, apertureIndex, dateLine, formatStop, type Light, untilNextMinute, warmthAt } from "@/lib/hero";

const tokens = rootTokens(parseCss(readFileSync(path.join(process.cwd(), "styles", "tokens.css"), "utf8")));

function token(name: string): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`${name} isn't in tokens.css`);
  return value;
}

function px(name: string): number {
  const match = /^(-?[\d.]+)px$/.exec(token(name));
  if (!match) throw new Error(`${name} isn't in px: ${token(name)}`);
  return Number(match[1]);
}

describe("the aperture dial", () => {
  it("runs in full stops from ƒ1.4 to ƒ16, written as a camera writes them", () => {
    expect(APERTURE.stops[0]).toBe(1.4);
    expect(APERTURE.stops.at(-1)).toBe(16);
    expect(APERTURE.stops.map((_, index) => formatStop(index))).toEqual(["ƒ1.4", "ƒ2", "ƒ2.8", "ƒ4", "ƒ5.6", "ƒ8", "ƒ11", "ƒ16"]);
  });

  it("blurs the background less as the aperture closes, like Portrait mode's depth control", () => {
    expect(APERTURE.blur).toHaveLength(APERTURE.stops.length);
    for (let i = 1; i < APERTURE.blur.length; i++) expect(APERTURE.blur[i]).toBeLessThan(APERTURE.blur[i - 1]);
  });

  it("starts where the focus pull settles, and opens to where it began", () => {
    expect(apertureBlur(APERTURE.initial)).toBe(px("--portrait-blur-near"));
    expect(apertureBlur(0)).toBe(px("--portrait-blur-far"));
  });

  it("falls back to the first setting for anything it can't read", () => {
    for (const value of [null, undefined, "", "x", -1, 8, 2.5, Number.NaN]) {
      expect(apertureIndex(value)).toBe(APERTURE.initial);
    }
    expect(apertureIndex("5")).toBe(5);
    expect(formatStop(99)).toBe(formatStop(APERTURE.initial));
  });
});

describe("the date line", () => {
  const jaipur = { label: "IST", timeZone: "Asia/Kolkata" };
  // 04:11 UTC is 9:41 AM in India.
  const now = new Date(Date.UTC(2026, 10, 16, 4, 11));

  it("reads like a Lock Screen: Akshat's date and time, and where that is", () => {
    expect(dateLine(now, jaipur, "en-US")).toBe("Monday, November 16 · 9:41 AM IST");
    expect(dateLine(now, { label: "in Jaipur", timeZone: "Asia/Kolkata" }, "en-US")).toMatch(/ · 9:41 AM in Jaipur$/);
  });

  it("is Akshat's day wherever the visitor is: never the visitor's date beside Akshat's time", () => {
    // 22:20 on Sunday the 15th in Chicago is 9:50 on Monday the 16th in India.
    const evening = new Date(Date.UTC(2026, 10, 16, 4, 20));
    expect(dateLine(evening, jaipur, "en-US")).toBe("Monday, November 16 · 9:50 AM IST");
  });

  it("follows the visitor's locale for both halves", () => {
    expect(dateLine(now, jaipur, "en-GB")).toMatch(/^\w+ \d{1,2} \w+ · 9:41 IST$/);
    expect(dateLine(now, jaipur, "de-DE")).toMatch(/^\w+, \d{1,2}\. \w+ · 0?9:41 IST$/);
  });

  it("ticks on the minute", () => {
    expect(untilNextMinute(0)).toBe(60_000);
    expect(untilNextMinute(59_999)).toBe(1);
    expect(untilNextMinute(61_000)).toBe(59_000);
  });
});

describe("the light's warmth", () => {
  /** The light that leads at an hour. */
  const lead = (hours: number): Light => {
    const { from, to, mix } = warmthAt(hours);
    return mix >= 0.5 ? to : from;
  };

  it("is warm at dawn, neutral at noon, saffron at dusk and indigo at night", () => {
    expect(lead(7)).toBe("dawn");
    expect(lead(13)).toBe("noon");
    expect(lead(19)).toBe("dusk");
    expect(lead(1)).toBe("night");
    expect(lead(23)).toBe("night");
  });

  it("blends between the keys instead of jumping", () => {
    expect(warmthAt(6)).toEqual({ from: "night", to: "dawn", mix: 0.5 });
    expect(warmthAt(20)).toEqual({ from: "dusk", to: "night", mix: 0.5 });
    const steps = Array.from({ length: 24 * 4 }, (_, i) => warmthAt(i / 4).mix);
    for (const mix of steps) expect(mix).toBeGreaterThanOrEqual(0);
    for (const mix of steps) expect(mix).toBeLessThanOrEqual(1);
  });

  it("wraps around midnight", () => {
    expect(warmthAt(24)).toEqual(warmthAt(0));
    expect(warmthAt(-1)).toEqual(warmthAt(23));
  });

  it("has a color for every light", () => {
    for (const light of ["dawn", "noon", "dusk", "night"] satisfies Light[]) expect(token(`--light-${light}`)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("the CSS twins (the brief's numbers)", () => {
  it("moves the layers in depth: background ±8px, name ±4px, subject ±12px", () => {
    expect(px("--hero-parallax-plate")).toBe(8);
    expect(px("--hero-parallax-name")).toBe(4);
    expect(px("--hero-parallax-subject")).toBe(12);
  });

  it("pulls focus from 24px to 8px behind and from 12px to sharp in front, within 1.2s", () => {
    expect(px("--portrait-blur-far")).toBe(24);
    expect(px("--portrait-blur-near")).toBe(8);
    expect(px("--portrait-blur-subject")).toBe(12);
    const ms = (name: string) => Number(/^(\d+)ms$/.exec(token(name))![1]);
    expect(ms("--portrait-pull")).toBeLessThanOrEqual(1200);
    expect(ms("--hero-ui-delay") + ms("--hero-ui-fade")).toBeLessThanOrEqual(1200);
  });

  it("scrolls out with the subject at .92 and loops the light over 20s; the cue is still", () => {
    expect(Number(token("--hero-out-scale"))).toBe(0.92);
    expect(token("--hero-light-loop")).toBe("20s");
    expect(tokens.has("--hero-cue-breath")).toBe(false);
  });

  it("draws the loupe as a 120px lens at 1.35×", () => {
    expect(px("--cursor-loupe")).toBe(120);
    expect(Number(token("--cursor-loupe-zoom"))).toBe(1.35);
  });
});
