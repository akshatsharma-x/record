/**
 * The strict half of the Content Security Policy (DESIGN.md §10, Part 16), written into each
 * prerendered page after `next build`. A static page can't carry a nonce, and a header can't
 * know what's inline in each page, so each page says it itself: a meta policy that lets a
 * script run only from this site or if it's one of the page's own inline scripts, by hash
 * (the theme script, Turbopack's chunk list and React's payload). next.config.ts sends the
 * rest of the policy as a header, whose script rule is the lenient one; a browser enforces
 * both, so the strict one is what holds.
 *
 *   node scripts/csp.ts            (postbuild; idempotent)
 *
 * Plain Node: erasable TypeScript, relative imports with extensions.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), ".next", "server");

/** The inline scripts a browser would run: no src, and a JavaScript type (or none). */
export function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attributes, body] = match;
    if (/\bsrc\s*=/i.test(attributes)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attributes)?.[1]?.toLowerCase();
    if (type && type !== "text/javascript" && type !== "module" && type !== "application/javascript") continue;
    scripts.push(body);
  }
  return scripts;
}

/** A source expression for a script's text, as the browser hashes it. */
export const hashOf = (script: string) => `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;

const MARK = /<meta http-equiv="Content-Security-Policy"[^>]*>/i;

/** The page with its own policy in its head, before any script; replaces one already there. */
export function withPolicy(html: string): string {
  const unmarked = html.replace(MARK, "");
  const hashes = [...new Set(inlineScripts(unmarked).map(hashOf))];
  const meta = `<meta http-equiv="Content-Security-Policy" content="script-src 'self' ${hashes.join(" ")}"/>`;
  return unmarked.replace(/<head([^>]*)>/i, (head) => `${head}${meta}`);
}

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return pages(file);
    return name.endsWith(".html") ? [file] : [];
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let count = 0;
  for (const file of pages(ROOT)) {
    const html = readFileSync(file, "utf8");
    if (!/<head[\s>]/i.test(html)) continue;
    writeFileSync(file, withPolicy(html));
    count += 1;
  }
  console.log(`csp: a script policy in each of ${count} prerendered pages`);
}
