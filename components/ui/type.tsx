import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Type styles (DESIGN.md §4.4). Each sets size, line height, tracking and weight from
 * one token, clamped from phone to desktop. Headlines balance and paragraphs wrap
 * pretty (styles/globals.css). Sentence case is a copy rule (§9), not a style.
 */

const tones = {
  fg: "text-fg",
  "fg-2": "text-fg-2",
  "fg-3": "text-fg-3",
  accent: "text-accent",
} as const;

/** fg-3 fails AA below 24px on light surfaces (§4.1), so only the big styles accept it. */
type SmallTone = "fg" | "fg-2" | "accent";
type LargeTone = SmallTone | "fg-3";

interface TextProps<Tone extends string> extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  tone?: Tone;
  /** New York in Safari, then Newsreader: research titles and pull quotes. */
  serif?: boolean;
  children?: ReactNode;
}

function textStyle<Tone extends keyof typeof tones>(name: string, style: string, tag: ElementType, defaultTone: Tone) {
  function Text({ as: Tag = tag, tone = defaultTone, serif, className, ...rest }: TextProps<Tone>) {
    return <Tag className={cx(style, tones[tone], serif && "font-serif", className)} {...rest} />;
  }
  Text.displayName = name;
  return Text;
}

export const Hero = textStyle<LargeTone>("Hero", "text-hero", "h1", "fg");
export const Display = textStyle<LargeTone>("Display", "text-display", "h2", "fg");
export const Title = textStyle<LargeTone>("Title", "text-title", "h3", "fg");
export const Eyebrow = textStyle<SmallTone>("Eyebrow", "text-eyebrow", "p", "fg");
export const Lead = textStyle<SmallTone>("Lead", "text-lead", "p", "fg");
export const Body = textStyle<SmallTone>("Body", "text-body", "p", "fg");
export const Caption = textStyle<SmallTone>("Caption", "text-caption", "p", "fg-2");
export const Footnote = textStyle<SmallTone>("Footnote", "text-footnote", "p", "fg-2");

// ─── Footnotes (§9) ──────────────────────────────────────────────────────────

const refId = (n: number, occurrence: number) => (occurrence > 1 ? `fnref-${n}-${occurrence}` : `fnref-${n}`);

/**
 * A superscript that links to note `n` in the footer. Its hit area is 44×44 (§2 rule 7)
 * even though the numeral is small. A second mention of the same note passes
 * `occurrence={2}`, so each one has its own back-link target.
 */
export function FootnoteRef({ n, occurrence = 1 }: { n: number; occurrence?: number }) {
  return (
    <sup>
      <a
        id={refId(n, occurrence)}
        href={`#fn-${n}`}
        role="doc-noteref"
        aria-label={`Footnote ${n}`}
        className="hit-area rounded-chip font-semibold text-accent underline underline-offset-(--underline-offset)"
      >
        {n}
      </a>
    </sup>
  );
}

/** The ↩ at the end of note `n`, back to where it was cited. */
export function FootnoteBackLink({ n, occurrence = 1 }: { n: number; occurrence?: number }) {
  return (
    <a
      href={`#${refId(n, occurrence)}`}
      role="doc-backlink"
      aria-label={occurrence > 1 ? `Back to mention ${occurrence} of footnote ${n}` : `Back to footnote ${n}`}
      className="hit-area ml-1 inline-flex rounded-chip text-accent no-underline"
    >
      ↩
    </a>
  );
}
