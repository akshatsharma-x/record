import { expect, test } from "@playwright/test";

/**
 * DESIGN.md §4.4: Apple devices render SF Pro, the visitor's own system font, and never
 * download Inter. Serif text is New York and mono SF Mono in Safari; Chromium has neither
 * ui-serif nor ui-monospace, so it may fetch Newsreader and JetBrains Mono (the credentials'
 * IDs, since Part 20), and nothing else. Run on macOS, where both use the system fonts.
 */
test.skip(process.platform !== "darwin", "needs Apple's system fonts");

test("SF Pro renders and Inter is never requested", async ({ page, browserName }) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font" || /\.woff2?(\?|$)/.test(request.url())) fontRequests.push(request.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    // next/font's "… Fallback" faces are local fonts with adjusted metrics: nothing downloads.
    return [...document.fonts]
      .filter((face) => face.status === "loaded" && !/fallback/i.test(face.family))
      .map((face) => face.family);
  });
  if (browserName === "webkit") expect(fontRequests).toEqual([]);
  // Whatever did load is the serif or the mono fallback, never a sans.
  expect(loaded.every((family) => /newsreader|jetbrains mono/i.test(family)), loaded.join(", ")).toBe(true);
  expect(fontRequests.length).toBeLessThanOrEqual(loaded.length);

  // Inter's @font-face is declared, but the browser never needed it.
  const inter = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((face) => /inter/i.test(face.family) && !/fallback/i.test(face.family)).map((face) => face.status);
  });
  expect(inter.length).toBeGreaterThan(0);
  expect(new Set(inter)).toEqual(new Set(["unloaded"]));

  if (browserName === "chromium") {
    // Chromium can name the font it actually drew.
    const client = await page.context().newCDPSession(page);
    await client.send("DOM.enable");
    await client.send("CSS.enable");
    const { root } = await client.send("DOM.getDocument");
    const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: "h1" });
    const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
    expect(fonts[0]?.familyName ?? "").toMatch(/SF|System Font/i);
  } else {
    // WebKit draws the heading exactly as wide as -apple-system does.
    const same = await page.evaluate(() => {
      const heading = document.querySelector("h1")!;
      const style = getComputedStyle(heading);
      const context = document.createElement("canvas").getContext("2d")!;
      const text = heading.textContent ?? "";
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const stack = context.measureText(text).width;
      context.font = `${style.fontWeight} ${style.fontSize} -apple-system`;
      return Math.abs(stack - context.measureText(text).width) < 0.01;
    });
    expect(same).toBe(true);
  }
});
