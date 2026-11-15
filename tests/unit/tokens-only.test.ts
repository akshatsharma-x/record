/**
 * Tokens only (DESIGN.md §2 rule 9): no component, page or stylesheet contains a raw color,
 * size or duration. Raw values live in styles/tokens.css (and lib/, which defines the JS
 * twins); everything else references them. This test scans the source and names each
 * violation by file and line.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCANNED = ["app", "components", "styles"];
const EXEMPT = new Set([path.join("styles", "tokens.css")]);

interface Rule {
  name: string;
  pattern: RegExp;
  /** Only for these extensions. */
  only?: string[];
}

const UNITS = "px|rem|em|vh|vw|svh|lvh|dvh|vmin|vmax|pt|cm|mm|in";

const RULES: Rule[] = [
  { name: "raw hex color", pattern: /#[0-9a-fA-F]{3,8}\b/g },
  { name: "raw color function", pattern: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g },
  { name: "raw size", pattern: new RegExp(`(?<![\\w$.-])\\d*\\.?\\d+(?:${UNITS})\\b`, "g") },
  { name: "raw duration", pattern: /(?<![\w$.-])\d*\.?\d+m?s\b/g },
  {
    name: "numeric style prop (React adds px)",
    pattern:
      /\b(?:width|height|minWidth|minHeight|maxWidth|maxHeight|top|left|right|bottom|inset|margin\w*|padding\w*|gap|fontSize|lineHeight|letterSpacing|borderRadius|borderWidth)\s*:\s*-?[1-9]/g,
    only: [".ts", ".tsx"],
  },
  {
    name: "literal duration in JavaScript (use lib/motion.ts)",
    pattern: /\b(?:duration|delay|stagger|visualDuration)\s*:\s*\d|setTimeout\([^)]*,\s*\d/g,
    only: [".ts", ".tsx"],
  },
  {
    name: "Tailwind default scale (use a token)",
    pattern:
      /(?<![\w-])(?:text-(?:xs|sm|base|lg|[2-9]?xl)|rounded(?:-(?:xs|sm|md|lg|xl|2xl|3xl|4xl))?|shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|inner))?|max-w-(?:2xs|3xs|xs|sm|md|lg|[2-7]?xl|prose|screen-\w+)|tracking-(?:tighter|tight|normal|wide|wider|widest)|leading-(?:none|tight|snug|normal|relaxed|loose|\d+)|duration-\d+|delay-\d+)(?=["'`\s}])/g,
    only: [".ts", ".tsx"],
  },
  {
    name: "Tailwind palette color (use a semantic token)",
    pattern:
      /(?<![\w-])(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|placeholder|caret|accent|shadow)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|taupe|mauve|mist|olive)\b/g,
    only: [".ts", ".tsx"],
  },
  { name: "focus ring removed (§6.4)", pattern: /outline:\s*(?:none|0)\b|(?<![\w-])outline-(?:none|0)\b/g },
];

function* files(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.(tsx?|css)$/.test(entry.name)) yield full;
  }
}

function violations(): string[] {
  const found: string[] = [];
  for (const directory of SCANNED) {
    for (const file of files(path.join(ROOT, directory))) {
      const relative = path.relative(ROOT, file);
      if (EXEMPT.has(relative)) continue;
      const extension = path.extname(file);
      // Comments explain tokens and may quote values; only code counts.
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|(?<![:"'`])\/\/[^\n]*/g, (comment) =>
        comment.replace(/[^\n]/g, " "),
      );
      for (const rule of RULES) {
        if (rule.only && !rule.only.includes(extension)) continue;
        for (const match of code.matchAll(rule.pattern)) {
          const line = code.slice(0, match.index).split("\n").length;
          found.push(`${relative}:${line} ${rule.name}: ${match[0]}`);
        }
      }
    }
  }
  return found;
}

describe("tokens only", () => {
  it("finds no raw color, size or duration in components, pages or styles", () => {
    expect(violations()).toEqual([]);
  });

  it("catches each kind of raw value", () => {
    const samples: [string, string][] = [
      ["raw hex color", 'className="text-[#ff0000]"'],
      ["raw color function", "color: rgb(0 0 0)"],
      ["raw size", "padding: 12px"],
      ["raw duration", "transition: opacity 300ms"],
      ["numeric style prop (React adds px)", "style={{ width: 120 }}"],
      ["literal duration in JavaScript (use lib/motion.ts)", "gsap.to(x, { duration: 0.7 })"],
      ["Tailwind default scale (use a token)", 'className="text-xl rounded-lg"'],
      ["Tailwind palette color (use a semantic token)", 'className="bg-blue-500"'],
      ["focus ring removed (§6.4)", "outline: none;"],
    ];
    for (const [name, sample] of samples) {
      const rule = RULES.find((candidate) => candidate.name === name)!;
      expect([...sample.matchAll(rule.pattern)].length, name).toBeGreaterThan(0);
    }
  });

  it("leaves token references alone", () => {
    const fine = [
      'className="text-title rounded-card-l shadow-soft max-w-measure duration-ui"',
      "padding: calc(var(--spacing) * 4);",
      "transition: transform var(--duration-spring-snappy) var(--ease-spring-snappy);",
      'href="#finishes" href="#fn-1"',
      'style={{ width: "100%" }}',
    ];
    for (const sample of fine) {
      for (const rule of RULES) expect([...sample.matchAll(rule.pattern)], `${rule.name} on ${sample}`).toEqual([]);
    }
  });
});
