import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Kitchen, type TokenGroups } from "@/components/dev/kitchen/kitchen";
import { parseCss, rootTokens } from "@/lib/css-tokens";

/**
 * Dev only (the `.dev.tsx` extension keeps it out of production builds, where it's a 404).
 * Every token, type style, component and state, in light and dark, in all four finishes.
 * Token values are read from styles/tokens.css once, at module load, so the page renders
 * them on the server with no streaming and no layout shift.
 */
export const metadata: Metadata = {
  title: "Kitchen · dev",
  robots: { index: false, follow: false },
};

const tokens = rootTokens(parseCss(readFileSync(path.join(process.cwd(), "styles", "tokens.css"), "utf8")));

const pick = (...prefixes: string[]) =>
  [...tokens].filter(([name]) => prefixes.some((prefix) => name.startsWith(prefix))) as [string, string][];

const groups: TokenGroups = {
  neutrals: pick("--neutral-"),
  finishes: pick("--finish-"),
  type: pick("--text-", "--font-"),
  space: pick("--spacing", "--grid-", "--container-", "--breakpoint-", "--target-", "--hairline-", "--focus-ring-"),
  radii: pick("--radius-"),
  materials: pick("--glass-", "--shadow-", "--control-"),
  layers: pick("--layer-"),
  motion: pick("--ease-", "--duration-", "--stagger-", "--scrub", "--motion-"),
};

export default function KitchenPage() {
  return <Kitchen tokens={groups} />;
}
