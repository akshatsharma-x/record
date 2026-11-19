/**
 * Scans the whole git history for anything shaped like a phone number (DESIGN.md §2 rule 2,
 * Part 16): every version of every file reachable from any ref, and every commit message.
 * tests/unit/privacy.test.ts guards the files as they are; this guards what a push would
 * publish. Run it before the first public push, and after anything that rewrites history.
 *
 *   node scripts/scan-history.ts
 *
 * Like the privacy test it says where, never what: a hit's digits aren't printed.
 *
 * Plain Node: erasable TypeScript, relative imports with extensions.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { findPhoneNumbers, lineAndColumn } from "../lib/privacy.ts";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 2 ** 30 });

/** Every blob reachable from any ref, with a path it was committed at. */
function blobs(): Map<string, string> {
  const named = new Map<string, string>();
  for (const line of git("rev-list", "--all", "--objects").split("\n")) {
    const space = line.indexOf(" ");
    if (space > 0) named.set(line.slice(0, space), line.slice(space + 1));
  }
  const checked = spawnSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype)"], { input: [...named.keys()].join("\n"), encoding: "utf8", maxBuffer: 2 ** 30 });
  const found = new Map<string, string>();
  for (const line of checked.stdout.split("\n")) {
    const [sha, type] = line.split(" ");
    if (type === "blob") found.set(sha, named.get(sha)!);
  }
  return found;
}

/** The contents of many blobs at once, through one `git cat-file --batch`. */
function contents(shas: string[]): Map<string, Buffer> {
  const out = spawnSync("git", ["cat-file", "--batch"], { input: shas.join("\n") + "\n", maxBuffer: 2 ** 30 }).stdout;
  const result = new Map<string, Buffer>();
  let at = 0;
  while (at < out.length) {
    const end = out.indexOf(10, at);
    const [sha, , size] = out.subarray(at, end).toString("utf8").split(" ");
    const length = Number(size);
    result.set(sha, out.subarray(end + 1, end + 1 + length));
    at = end + 1 + length + 1;
  }
  return result;
}

/** Text only: a NUL in the first 8 KB means a binary file (an image), which can't spell digits. */
const isText = (bytes: Buffer) => !bytes.subarray(0, 8192).includes(0);

export function scanHistory(): string[] {
  const problems: string[] = [];
  const files = blobs();
  for (const [sha, bytes] of contents([...files.keys()])) {
    if (!isText(bytes)) continue;
    const text = bytes.toString("utf8");
    for (const hit of findPhoneNumbers(text)) {
      const { line, column } = lineAndColumn(text, hit.index);
      const commit = git("log", "--all", "--format=%h", "-1", `--find-object=${sha}`).trim();
      problems.push(`${files.get(sha)}:${line}:${column} (blob ${sha.slice(0, 10)}, first in commit ${commit || "?"})`);
    }
  }
  const log = git("log", "--all", "--format=%H%x1f%B%x1e");
  for (const entry of log.split("\x1e")) {
    const [sha, message = ""] = entry.trim().split("\x1f");
    for (const hit of findPhoneNumbers(message)) {
      const { line, column } = lineAndColumn(message, hit.index);
      problems.push(`commit message ${sha.slice(0, 10)}:${line}:${column}`);
    }
  }
  return problems;
}

if (process.argv[1]?.endsWith("scan-history.ts")) {
  const commits = git("rev-list", "--all", "--count").trim();
  const problems = scanHistory();
  if (problems.length === 0) {
    console.log(`scan-history: nothing shaped like a phone number in ${commits} commits, their files or their messages.`);
  } else {
    console.error(`scan-history: ${problems.length} phone-shaped number${problems.length === 1 ? "" : "s"} in the history (shown by place, never by digits):`);
    for (const problem of problems) console.error(`  · ${problem}`);
    process.exit(1);
  }
}
