/**
 * Contrast (DESIGN.md §4.1, §4.3, §10): every text pair passes WCAG 2.2 AA in both themes,
 * on every surface and in every finish. Colors are read from styles/tokens.css itself, so
 * changing a hex there changes what's tested. If a hex fails, adjust the hex, never the
 * rule (§4.3).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCss, rootTokens } from "@/lib/css-tokens";
import { FINISHES } from "@/lib/preferences";

const tokens = rootTokens(parseCss(readFileSync(path.join(process.cwd(), "styles", "tokens.css"), "utf8")));

// ─── Color math ──────────────────────────────────────────────────────────────

type RGBA = [r: number, g: number, b: number, a: number];

function color(name: string): RGBA {
  const value = tokens.get(name);
  if (!value) throw new Error(`${name} isn't in tokens.css`);
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
  throw new Error(`${name}: can't read ${value}`);
}

/** `top` painted over an opaque `bottom`. */
function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
}

/** color-mix(in srgb, a p, b). */
function mix(a: RGBA, b: RGBA, p: number): RGBA {
  return [a[0] * p + b[0] * (1 - p), a[1] * p + b[1] * (1 - p), a[2] * p + b[2] * (1 - p), 1];
}

function luminance([r, g, b]: RGBA): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: RGBA, b: RGBA): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// ─── The contexts (lib: styles/tokens.css §3–4) ──────────────────────────────

type Tone = "light" | "dark";

interface Context {
  name: string;
  tone: Tone;
  surface: RGBA;
  card: RGBA;
}

const CONTEXTS: Context[] = [
  { name: "light theme · light", tone: "light", surface: color("--neutral-light-bg"), card: color("--neutral-light-bg-alt") },
  { name: "light theme · light-alt", tone: "light", surface: color("--neutral-light-bg-alt"), card: color("--neutral-light-card") },
  { name: "light theme · dark", tone: "dark", surface: color("--neutral-dark-bg"), card: color("--neutral-dark-card") },
  { name: "dark theme · light and light-alt", tone: "dark", surface: color("--neutral-dark-bg-alt"), card: color("--neutral-dark-card") },
  { name: "dark theme · dark", tone: "dark", surface: color("--neutral-dark-bg"), card: color("--neutral-dark-card") },
];

const AA = 4.5;
const AA_LARGE = 3;
const NON_TEXT = 3;

/** Where body text sits: fg and fg-2 must pass on all of these. */
function textBackgroundsOf(context: Context) {
  const glass = color(context.tone === "light" ? "--glass-light" : "--glass-dark");
  return { surface: context.surface, card: context.card, "glass over the surface": over(glass, context.surface) };
}

/** Segmented-control labels are fg, never fg-2, so only fg is tested on controls. */
function controlBackgroundsOf(context: Context) {
  const track = over(color(`--control-${context.tone}-track`), context.surface);
  return { "control track": track, "control thumb": over(color(`--control-${context.tone}-thumb`), track) };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe.each(CONTEXTS)("$name", (context) => {
  const tone = context.tone;

  it.each(Object.entries(textBackgroundsOf(context)))("fg and fg-2 pass AA on the %s", (_, background) => {
    expect(ratio(color(`--neutral-${tone}-fg`), background)).toBeGreaterThanOrEqual(AA);
    expect(ratio(color(`--neutral-${tone}-fg-2`), background)).toBeGreaterThanOrEqual(AA);
  });

  it.each(Object.entries(controlBackgroundsOf(context)))("control labels (fg) pass AA on the %s", (_, background) => {
    expect(ratio(color(`--neutral-${tone}-fg`), background)).toBeGreaterThanOrEqual(AA);
  });

  it("fg-3 passes AA for large text on light surfaces and AA outright on dark ones", () => {
    const needed = tone === "light" ? AA_LARGE : AA;
    expect(ratio(color(`--neutral-${tone}-fg-3`), context.surface)).toBeGreaterThanOrEqual(needed);
    expect(ratio(color(`--neutral-${tone}-fg-3`), context.card)).toBeGreaterThanOrEqual(needed);
  });

  describe.each(FINISHES)("$name", ({ id }) => {
    const accent = color(`--finish-${id}-on-${tone}`);
    const second = color(`--finish-${id}-2-on-${tone}`);
    const fill = color(`--finish-${id}-on-light`);
    const label = color("--on-accent");

    it("accent text and its gradient stop pass AA on the surface and on cards", () => {
      for (const background of [context.surface, context.card]) {
        expect(ratio(accent, background)).toBeGreaterThanOrEqual(AA);
        expect(ratio(second, background)).toBeGreaterThanOrEqual(AA);
      }
    });

    it("button labels pass AA on the fill and on its hover", () => {
      expect(ratio(label, fill)).toBeGreaterThanOrEqual(AA);
      expect(ratio(label, mix(fill, color("--neutral-dark-bg"), 0.88))).toBeGreaterThanOrEqual(AA);
    });

    it("selected text stays readable on the selection color (the accent at 25%)", () => {
      const selection = over([...accent.slice(0, 3), 0.25] as RGBA, context.surface);
      expect(ratio(color(`--neutral-${tone}-fg`), selection)).toBeGreaterThanOrEqual(AA);
    });

    it("the focus ring and the fill stand out from the surface (non-text, 3:1)", () => {
      expect(ratio(accent, context.surface)).toBeGreaterThanOrEqual(NON_TEXT);
      expect(ratio(fill, context.surface)).toBeGreaterThanOrEqual(NON_TEXT);
    });
  });
});

describe("the cursor and the switch (non-text, 3:1)", () => {
  const dark = color("--cursor-ink-dark");
  const light = color("--cursor-ink-light");

  it("draw the dot in two inks that contrast with each other", () => {
    expect(ratio(over(dark, color("--cursor-outline-light")), color("--cursor-outline-light"))).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio(over(light, color("--cursor-outline-dark")), color("--cursor-outline-dark"))).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it.each(CONTEXTS)("fill the dot in an ink that stands out from $name", (context) => {
    const ink = context.tone === "light" ? dark : light;
    for (const background of [context.surface, context.card]) {
      expect(ratio(over(ink, background), background)).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });

  it.each(CONTEXTS)("edge the switch's off track so it stands out from $name", (context) => {
    const edge = color(`--neutral-${context.tone}-fg-3`);
    for (const background of [context.surface, context.card]) {
      expect(ratio(edge, background)).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });
});

describe("the Island and Search (Part 4)", () => {
  const black = color("--neutral-dark-bg");
  const white = color("--neutral-light-bg");
  const dim = color("--backdrop-dim");

  it("keep the Island's text readable on black and on the current link's marker", () => {
    const marker = over(color("--island-marker"), black);
    for (const background of [black, marker]) {
      expect(ratio(color("--neutral-dark-fg"), background)).toBeGreaterThanOrEqual(AA);
      expect(ratio(color("--neutral-dark-fg-2"), background)).toBeGreaterThanOrEqual(AA);
    }
  });

  it("tint activity icons so they stand out from the black pill (non-text, 3:1)", () => {
    expect(ratio(color("--status-success"), black)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio(color("--status-error"), black)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio(over(color("--island-track"), black), black)).toBeGreaterThan(1);
  });

  it.each(["light", "dark"] as const)("keep Search's %s glass legible over a dimmed black or white page", (tone) => {
    const glass = color(`--search-glass-${tone}`);
    for (const page of [black, white]) {
      const behind = over(glass, over(dim, page));
      expect(ratio(color(`--neutral-${tone}-fg`), behind)).toBeGreaterThanOrEqual(AA);
      expect(ratio(color(`--neutral-${tone}-fg-2`), behind)).toBeGreaterThanOrEqual(AA);
    }
  });
});

describe("the hero (Part 5)", () => {
  const black = color("--neutral-dark-bg");
  const fg = color("--neutral-dark-fg");
  const paper: RGBA = [255, 255, 255, 1];
  const alpha = Number(tokens.get("--hero-light-alpha"));
  const lights = ["dawn", "noon", "dusk", "night"].map((light) => color(`--light-${light}`));
  const disc = (hue: RGBA): RGBA => [hue[0], hue[1], hue[2], alpha];

  it.each(FINISHES)("keeps white text readable where all three discs of light overlap at full strength ($name)", ({ id }) => {
    const first = color(`--finish-${id}-on-dark`);
    const second = color(`--finish-${id}-2-on-dark`);
    for (const warmth of lights) {
      const field = over(disc(warmth), over(disc(second), over(disc(first), black)));
      expect(ratio(fg, field)).toBeGreaterThanOrEqual(AA);
    }
  });

  it("keeps the portrait's date line and name readable over even a white wall", () => {
    expect(ratio(fg, over(color("--portrait-scrim"), paper))).toBeGreaterThanOrEqual(AA);
  });

  it("keeps the details readable over even a white shirt, where the floor is full", () => {
    expect(ratio(fg, over(color("--portrait-floor"), paper))).toBeGreaterThanOrEqual(AA);
  });

  it("draws the loupe's rim so it stands out from the dark hero (non-text, 3:1)", () => {
    expect(ratio(over(color("--lens-rim"), black), black)).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe("the wallet's passes (Part 11)", () => {
  const white = color("--pass-ink");
  const shade = color("--pass-shade");
  const graphite = color("--pass-graphite");

  it.each(FINISHES)("keep white type readable on every tone the finish gives a pass ($name)", ({ id }) => {
    const accent = color(`--finish-${id}-on-light`);
    const second = color(`--finish-${id}-2-on-light`);
    // Each tone's gradient, end to end (styles/components.css, .pass[data-tone]).
    const stops = [accent, second, mix(second, shade, 0.64), mix(accent, shade, 0.78), mix(accent, shade, 0.52)];
    for (const stop of stops) expect(ratio(white, stop)).toBeGreaterThanOrEqual(AA);
  });

  it("keep white type readable on graphite, the finish-free tone", () => {
    expect(ratio(white, graphite)).toBeGreaterThanOrEqual(AA);
    expect(ratio(white, mix(graphite, shade, 0.55))).toBeGreaterThanOrEqual(AA);
  });

  it("draw QR codes dark on white, as scanners expect", () => {
    expect(ratio(color("--pass-qr-ink"), color("--pass-qr-paper"))).toBeCloseTo(21, 5);
  });
});

describe("the close (Part 12)", () => {
  const card = { light: [color("--neutral-light-bg-alt"), color("--neutral-light-card")], dark: [color("--neutral-dark-card")] };

  it("keeps a form's error words readable on its card, in both tones", () => {
    for (const background of card.light) expect(ratio(color("--status-error-on-light"), background)).toBeGreaterThanOrEqual(AA);
    for (const background of card.dark) expect(ratio(color("--status-error"), background)).toBeGreaterThanOrEqual(AA);
  });

  it("keeps Akshat's gray bubble readable, in both tones", () => {
    expect(ratio(color("--neutral-light-fg"), color("--bubble-them-light"))).toBeGreaterThanOrEqual(AA);
    expect(ratio(color("--neutral-dark-fg"), color("--bubble-them-dark"))).toBeGreaterThanOrEqual(AA);
  });

  it.each(FINISHES)("keeps LinkedIn's monogram, in the accent, readable on its plain tile ($name)", ({ id }) => {
    expect(ratio(color(`--finish-${id}-on-light`), color("--dock-plain-light"))).toBeGreaterThanOrEqual(AA_LARGE);
    expect(ratio(color(`--finish-${id}-on-dark`), color("--dock-plain-dark"))).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe("the tests themselves", () => {
  it("compute WCAG ratios correctly", () => {
    expect(ratio([0, 0, 0, 1], [255, 255, 255, 1])).toBeCloseTo(21, 5);
    expect(ratio(color("--neutral-light-fg-3"), color("--neutral-light-bg"))).toBeCloseTo(3.62, 2);
  });

  it("read the adjusted Saffron (§4.3: the hex changed, the rule didn't)", () => {
    expect(tokens.get("--finish-saffron-on-light")).toBe("#ab5a00");
    expect(ratio(color("--finish-saffron-on-light"), color("--neutral-light-bg-alt"))).toBeGreaterThanOrEqual(AA);
  });
});
