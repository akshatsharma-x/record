/**
 * The hero's logic (lib/hero.ts, DESIGN.md §7): the aperture's stops, the Lock Screen
 * date line, the light's warmth through the day, and the CSS twins in styles/tokens.css
 * that must agree with the brief's numbers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@/content";
import { heroFacts } from "@/content/derive";
import { parseCss, rootTokens } from "@/lib/css-tokens";
import { APERTURE, apertureBlur, apertureIndex, formatStop, HERO, type Light, untilNextMinute, warmthAt } from "@/lib/hero";

const css = readFileSync(path.join(process.cwd(), "styles", "tokens.css"), "utf8");
const rules = parseCss(css);
const tokens = rootTokens(rules);
/** The tokens the reduced-motion edition sets (the data-motion="reduce" twin of the media query). */
const reduced = new Map(rules.find((rule) => rule.selector.trim() === ':root[data-motion="reduce"]')!.tokens);

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

/** A duration token in ms, itself or through the var() it names. */
function ms(name: string): number {
  const value = token(name);
  const alias = /^var\((--[\w-]+)\)$/.exec(value);
  if (alias) return ms(alias[1]);
  return Number(/^(\d+)ms$/.exec(value)![1]);
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

describe("the clocks", () => {
  it("tick on the minute", () => {
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
    expect(ms("--portrait-pull")).toBeLessThanOrEqual(1200);
    expect(ms("--hero-ui-delay") + ms("--hero-ui-fade")).toBeLessThanOrEqual(1200);
  });

  it("scrolls out with the subject at .92, and loops nothing: no drifting light, no cue (Part 18)", () => {
    expect(Number(token("--hero-out-scale"))).toBe(0.92);
    for (const gone of ["--hero-light-loop", "--hero-cue-breath", "--hero-cue-width"]) expect(tokens.has(gone)).toBe(false);
  });

  it("slides the field into register within a reveal, from a turn and a scale that read as noise (Part 18)", () => {
    expect(ms("--hero-register")).toBeLessThanOrEqual(900);
    expect(parseFloat(token("--hero-register-turn"))).toBeGreaterThan(0);
    expect(Number(token("--hero-register-scale"))).toBeGreaterThan(1);
    // A few pixels of depth under the mouse, never a whole step of the grid.
    expect(px("--hero-field-shift")).toBeLessThan(px("--hero-pitch"));
  });

  it("brings the UI in turn: the links, each key fact 30ms after the one before, then the finish, all within 1.2s (Part 19)", () => {
    const last = heroFacts(content).length + 1;
    expect(ms("--hero-ui-delay") + last * ms("--hero-ui-stagger") + ms("--hero-ui-fade")).toBeLessThanOrEqual(1200);
    expect(px("--hero-ui-rise")).toBeGreaterThan(0);
  });

  it("glints across the name within the arrival, and rests where the controller parks it (Part 19)", () => {
    expect(ms("--hero-glint-sweep")).toBeLessThanOrEqual(900);
    expect(ms("--hero-glint-delay") + ms("--hero-glint-sweep")).toBeLessThanOrEqual(1200);
    // The registered property's first value is the controller's resting place: off to the
    // right, as far as a pointer can draw it, so the glint never shows before anything moves.
    const initial = /@property --hero-glint-x \{[^}]*initial-value: (-?[\d.]+)/.exec(css);
    expect(Number(initial?.[1])).toBe(HERO.glint.parked);
    expect(HERO.glint.parked).toBe(HERO.glint.max);
    expect(HERO.glint.min).toBeLessThan(0);
  });

  it("lights a pool of the field's own dots, a little larger, and tilts the field back as the hero goes (Part 19)", () => {
    expect(px("--hero-spot-dot-size")).toBeGreaterThan(px("--hero-dot-size"));
    expect(px("--hero-spot-radius")).toBeGreaterThan(px("--hero-pitch") * 4);
    const tilt = parseFloat(token("--hero-tilt"));
    expect(tilt).toBeGreaterThan(0);
    expect(tilt).toBeLessThan(90);
    expect(HERO.outReach).toBeGreaterThan(0);
    expect(HERO.outReach).toBeLessThanOrEqual(1);
  });

  it("with reduced motion, recedes, tilts, rises and staggers nothing (Part 19)", () => {
    expect(reduced.get("--hero-tilt")).toBe("0deg");
    expect(reduced.get("--hero-out-recede")).toBe("0");
    expect(reduced.get("--hero-light-rise")).toBe("0vh");
    expect(reduced.get("--hero-light-swell")).toBe("0");
    expect(reduced.get("--hero-foot-drop")).toBe("0vh");
    expect(reduced.get("--hero-ui-rise")).toBe("0px");
    expect(reduced.get("--hero-ui-stagger")).toBe("0ms");
  });

  it("draws the loupe as a 120px lens at 1.35×", () => {
    expect(px("--cursor-loupe")).toBe(120);
    expect(Number(token("--cursor-loupe-zoom"))).toBe(1.35);
  });
});
