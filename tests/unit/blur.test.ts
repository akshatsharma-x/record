import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { blurOf } from "@/lib/blur";

/** Screenshots resolve from their blur placeholders (DESIGN.md §5.4, Part 16). */

const root = mkdtempSync(path.join(tmpdir(), "classyfolio-blur-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("a screenshot's blur placeholder", () => {
  it("is the picture at 16px wide, inlined as a PNG, with its colors", async () => {
    mkdirSync(path.join(root, "public", "shots"), { recursive: true });
    const picture = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: { r: 10, g: 132, b: 255 } } }).png().toBuffer();
    writeFileSync(path.join(root, "public", "shots", "cover.png"), picture);
    const blur = await blurOf("/shots/cover.png", root);
    expect(blur).toMatch(/^data:image\/png;base64,/);
    const placeholder = sharp(Buffer.from(blur!.split(",")[1], "base64"));
    expect(await placeholder.metadata()).toMatchObject({ width: 16, height: 10 });
    const { dominant } = await placeholder.stats();
    expect(dominant.b).toBeGreaterThan(200);
    // Small enough to inline in the page.
    expect(blur!.length).toBeLessThan(600);
  });

  it("is made only for pictures in /public, never for another site's or a path out of it", async () => {
    expect(await blurOf("https://example.com/shot.png", root)).toBeNull();
    expect(await blurOf("//example.com/shot.png", root)).toBeNull();
    // A picture beside /public, not in it: ".." stays inside, and the build says what's missing.
    writeFileSync(path.join(root, "secret.png"), await sharp({ create: { width: 4, height: 4, channels: 3, background: "#000" } }).png().toBuffer());
    await expect(blurOf("/../secret.png", root)).rejects.toThrow("The picture /../secret.png isn't in /public.");
  });
});
