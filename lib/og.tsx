import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { content } from "@/content";
import { parseCss, resolveVars, rootTokens } from "./css-tokens";
import { siteUrl } from "./site";

/**
 * Share cards and the monogram icons (DESIGN.md §10, Part 16), drawn with next/og at build.
 * In the site's own style: the dark surface lit by the finish's two hues, the Island with
 * the monogram and the section, and the big name or title, set as the page sets it (Inter
 * for the sans, Newsreader for a paper). Colors come from styles/tokens.css, the default
 * finish's; sizes are the card's own geometry, here with the other JS twins of the tokens.
 */

export const OG = {
  size: { width: 1200, height: 630 },
  contentType: "image/png",
} as const;

/** The home-screen icon's size: 180 points square, as iOS asks. */
export const APPLE_ICON = { size: { width: 180, height: 180 } } as const;

/** The default finish (lib/preferences.ts, FINISHES[0]). */
const FINISH = "contrail";

interface Assets {
  colors: { bg: string; card: string; fg: string; fg2: string; hairline: string; accent: string; accent2: string };
  fonts: { name: string; data: Buffer; weight: 500 | 600 | 700; style: "normal" }[];
}

/**
 * The tokens and the fonts, read once at module scope: the same for every card, so under
 * Cache Components each card still prerenders at build (a read during rendering would be
 * uncached data, and make it a request-time route).
 */
const ASSETS: Assets = (() => {
  const root = process.cwd();
  const tokens = rootTokens(parseCss(readFileSync(path.join(root, "styles", "tokens.css"), "utf8")));
  const token = (name: string) => resolveVars(`var(${name})`, tokens);
  const font = (file: string) => readFileSync(path.join(root, "node_modules", "@fontsource", file));
  return {
    colors: {
      bg: token("--neutral-dark-bg"),
      card: token("--neutral-dark-card"),
      fg: token("--neutral-dark-fg"),
      fg2: token("--neutral-dark-fg-2"),
      hairline: token("--island-hairline"),
      accent: token(`--finish-${FINISH}-on-dark`),
      accent2: token(`--finish-${FINISH}-2-on-dark`),
    },
    fonts: [
      { name: "Inter", data: font("inter/files/inter-latin-600-normal.woff"), weight: 600, style: "normal" },
      { name: "Inter", data: font("inter/files/inter-latin-700-normal.woff"), weight: 700, style: "normal" },
      { name: "Newsreader", data: font("newsreader/files/newsreader-latin-500-normal.woff"), weight: 500, style: "normal" },
    ],
  };
})();

function load(): Assets {
  return ASSETS;
}

/** A hex color with an alpha, as satori reads it. */
const alpha = (hex: string, opacity: number) => `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;

/** How big a title is set: the shorter, the bigger, as a page's headline is. */
function titleSize(title: string): number {
  if (title.length <= 16) return 136;
  if (title.length <= 32) return 96;
  if (title.length <= 64) return 70;
  return 58;
}

interface Card {
  /** The Island's label: the section, as the page's Island names it. */
  section: string;
  title: string;
  subtitle: string;
  /** A paper's title is set in the serif, as its page sets it. */
  serif?: boolean;
}

/** A route's share card. */
export function card({ section, title, subtitle, serif = false }: Card): ImageResponse {
  const { colors, fonts } = load();
  const { profile } = content;
  const host = siteUrl().hostname;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          backgroundColor: colors.bg,
          color: colors.fg,
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* The light: two soft discs in the finish's hues, as the hero's field. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG.size.width,
            height: OG.size.height,
            display: "flex",
            backgroundImage: `radial-gradient(circle at 86% 10%, ${alpha(colors.accent, 0.42)} 0%, transparent 44%), radial-gradient(circle at 64% 108%, ${alpha(colors.accent2, 0.32)} 0%, transparent 48%)`,
          }}
        />
        {/* The Island: the monogram, the section and its ring. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 16,
            padding: "8px 22px 8px 8px",
            borderRadius: 999,
            backgroundColor: colors.bg,
            border: `2px solid ${colors.hairline}`,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              backgroundColor: colors.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 21,
              fontWeight: 700,
            }}
          >
            {profile.initials}
          </div>
          <div style={{ fontSize: 26, fontWeight: 600 }}>{section}</div>
          <div style={{ width: 18, height: 18, borderRadius: 999, border: `3px solid ${colors.accent}` }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1040 }}>
          <div
            style={{
              fontFamily: serif ? "Newsreader" : "Inter",
              fontWeight: serif ? 500 : 700,
              fontSize: titleSize(title),
              lineHeight: serif ? 1.08 : 1.02,
              letterSpacing: serif ? "-0.01em" : "-0.035em",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: colors.fg2, lineHeight: 1.3 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, fontWeight: 600, color: colors.fg2 }}>
          <div style={{ display: "flex" }}>{`${profile.name} · ${profile.role}`}</div>
          <div style={{ display: "flex" }}>{host === "localhost" ? "" : host}</div>
        </div>
      </div>
    ),
    { ...OG.size, fonts },
  );
}

/**
 * The monogram, as an icon: "AS" in white on black, the Island's own. `bleed` fills the
 * square edge to edge, for an icon the platform masks itself (Apple's, a maskable one), and
 * keeps the letters inside the mask's safe zone.
 */
export function monogram(size: number, { bleed = false } = {}): ImageResponse {
  const { colors, fonts } = load();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
          borderRadius: bleed ? 0 : size * 0.22,
          color: colors.fg,
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: size * (bleed ? 0.34 : 0.44),
          letterSpacing: "-0.04em",
        }}
      >
        {content.profile.initials}
      </div>
    ),
    { width: size, height: size, fonts },
  );
}

/** The colors a manifest names: the dark surface the monogram sits on. */
export function iconColors(): { background: string; theme: string } {
  const { colors } = load();
  return { background: colors.bg, theme: colors.bg };
}
