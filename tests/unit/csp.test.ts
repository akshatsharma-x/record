import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashOf, inlineScripts, withPolicy } from "../../scripts/csp.ts";

/** The strict script policy each prerendered page carries (scripts/csp.ts, Part 16). */

const PAGE = [
  "<!DOCTYPE html><html><head><meta charSet=\"utf-8\"/>",
  "<script>(function(){document.documentElement.dataset.theme='dark'})()</script>",
  '<script src="/_next/static/chunks/a.js" async=""></script>',
  '<script type="application/ld+json">{"@type":"Person"}</script>',
  "</head><body><main>Hi</main>",
  "<script>self.__next_f.push([1,\"0:{}\"])</script>",
  "</body></html>",
].join("");

describe("the page's own script policy", () => {
  it("finds the scripts a browser would run inline, not the ones it loads or the data it doesn't run", () => {
    expect(inlineScripts(PAGE)).toEqual(["(function(){document.documentElement.dataset.theme='dark'})()", 'self.__next_f.push([1,"0:{}"])']);
  });

  it("hashes each one as the browser does: SHA-256 of its text, base64", () => {
    const script = "self.__next_f.push([0])";
    expect(hashOf(script)).toBe(`'sha256-${createHash("sha256").update(script).digest("base64")}'`);
  });

  it("puts the policy first in the head, before any script, allowing this site and those hashes only", () => {
    const html = withPolicy(PAGE);
    const head = html.slice(0, html.indexOf("</head>"));
    const policy = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"\/>/.exec(head)![1];
    expect(head.indexOf("Content-Security-Policy")).toBeLessThan(head.indexOf("<script"));
    expect(policy.startsWith("script-src 'self' 'sha256-")).toBe(true);
    expect(policy).not.toContain("unsafe-inline");
    for (const script of inlineScripts(PAGE)) expect(policy).toContain(hashOf(script));
  });

  it("can run twice and still says it once", () => {
    const once = withPolicy(PAGE);
    expect(withPolicy(once)).toBe(once);
    expect(once.match(/Content-Security-Policy/g)).toHaveLength(1);
  });
});
