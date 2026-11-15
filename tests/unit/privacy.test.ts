/**
 * The privacy guard (DESIGN.md §2 rule 2). It fails on anything shaped like a phone
 * number in content, source or the build output, and reports only where the hit is,
 * never its digits. Every sample below is built at runtime from obviously fake digits,
 * so this file never contains a phone-shaped literal itself.
 *
 * `npm run check` scans content and source, plus the build output if one exists.
 * `npm run build` runs it again afterwards (postbuild), so every build is scanned.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findPhoneNumbers, lineAndColumn } from "@/lib/privacy";

const ROOT = process.cwd();
const BUILD = path.join(ROOT, ".next");
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "test-results",
  "playwright-report",
  "blob-report",
  "coverage",
]);
/** Build caches and dev-server output aren't published, and they're large. */
const SKIPPED_BUILD_DIRECTORIES = new Set(["cache", "dev", "diagnostics"]);
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|pdf|zip|gz|br|mp4|webm|mov|wasm|node)$/i;

function* walk(directory: string, skip: Set<string>): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(full, skip);
    else if (entry.isFile() && !BINARY.test(entry.name)) yield full;
  }
}

/** Returns "file:line:column" for every phone-shaped number, without the number. */
function scan(files: Iterable<string>): string[] {
  const leaks: string[] = [];
  for (const file of files) {
    const buffer = readFileSync(file);
    if (buffer.subarray(0, 8000).includes(0)) continue;
    const text = buffer.toString("utf8");
    for (const hit of findPhoneNumbers(text)) {
      const { line, column } = lineAndColumn(text, hit.index);
      leaks.push(`${path.relative(ROOT, file)}:${line}:${column} (${hit.length} characters)`);
    }
  }
  return leaks;
}

// Obviously fake digits, assembled at runtime.
const mobile = "9".padEnd(10, "0");
const landline = `141${"2".padEnd(7, "0")}`;

describe("phone-number shapes", () => {
  it.each([
    ["+91 and 10 digits", `+91 ${mobile}`],
    ["+91 with no space", `+91${mobile}`],
    ["+91 split 5-5", `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`],
    ["+91 with hyphens", `+91-${mobile.slice(0, 5)}-${mobile.slice(5)}`],
    ["0091 prefix", `0091 ${mobile}`],
    ["a tel: link", `tel:+91${mobile}`],
    ["a +91 landline", `+91 ${landline.slice(0, 3)} ${landline.slice(3)}`],
    ["a bare mobile number", `"${mobile}"`],
    ["a trunk 0", `0${mobile}`],
    ["a bare number split 5-5", `${mobile.slice(0, 5)} ${mobile.slice(5)}`],
    ["a bare number split 3-3-4", `${mobile.slice(0, 3)}-${mobile.slice(3, 6)}-${mobile.slice(6)}`],
  ])("catches %s", (_, sample) => {
    expect(findPhoneNumbers(`Call ${sample} today.`).length).toBeGreaterThan(0);
  });

  it.each([
    ["a number starting with 5", "5".padEnd(10, "0")],
    ["11 digits", `${mobile}1`],
    ["a digit before it", `1${mobile}`],
    ["hex", `0x${mobile}`],
    ["a decimal", `0.${mobile}`],
    ["a decimal tail", `${mobile}.5`],
    ["a millisecond timestamp", "17".padEnd(13, "0")],
    ["inside a word", `id${mobile}`],
    ["résumé numbers", "2,500+ users, 10,000+ records, 90%+ coverage, $0.08–0.11 per run"],
    ["dates and versions", "2026-04-28 · Next.js 16.4.6 · SHA-256 · CGPA 8.79/10"],
  ])("ignores %s", (_, sample) => {
    expect(findPhoneNumbers(`Value: ${sample}.`)).toEqual([]);
  });

  it("never reports the digits themselves", () => {
    const [hit] = findPhoneNumbers(`x ${mobile}`);
    expect(Object.keys(hit).sort()).toEqual(["index", "length"]);
  });
});

describe("privacy guard", () => {
  it("finds no phone-shaped number in content or source", () => {
    expect(scan(walk(ROOT, SKIPPED_DIRECTORIES))).toEqual([]);
  });

  const built = existsSync(path.join(BUILD, "server")) || existsSync(path.join(BUILD, "static"));
  it.skipIf(!built)("finds no phone-shaped number in the build output", () => {
    expect(scan(walk(BUILD, SKIPPED_BUILD_DIRECTORIES))).toEqual([]);
  });
});
