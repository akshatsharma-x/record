import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { SurfaceName } from "@/lib/stores/surface";

/**
 * Layout primitives (DESIGN.md §4.5). Server components with no JavaScript. Spacing
 * comes from the 8pt grid with 4pt half-steps, widths from the container tokens.
 */

interface BaseProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children?: ReactNode;
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps extends BaseProps {
  id: string;
  surface: SurfaceName;
  /** What the Island calls this section while it's on screen (§6.2). */
  name?: string;
  /** "section" is the block padding from §4.5, clamp(96px, 12vw, 180px). */
  padding?: "section" | "none";
}

/** A top-level part of the story. The surface controller crossfades between these. */
export function Section({ id, surface, name, padding = "section", as: Tag = "section", className, ...rest }: SectionProps) {
  return (
    <Tag
      id={id}
      data-section=""
      data-surface={surface}
      data-section-name={name}
      className={cx(padding === "section" && "py-section", className)}
      {...rest}
    />
  );
}

// ─── Container ───────────────────────────────────────────────────────────────

const widths = {
  measure: "max-w-measure",
  content: "max-w-content",
  wide: "max-w-wide",
} as const;

interface ContainerProps extends BaseProps {
  width?: keyof typeof widths;
}

/** Centers content at a DESIGN.md width. The gutter sits outside it, so measure means measure. */
export function Container({ width = "content", as: Tag = "div", className, children, ...rest }: ContainerProps) {
  return (
    <div className="px-page">
      <Tag className={cx("mx-auto w-full", widths[width], className)} {...rest}>
        {children}
      </Tag>
    </div>
  );
}

// ─── Grid ────────────────────────────────────────────────────────────────────

/** The page grid: 4 columns on phones, 8 from 735px, 12 from 1069px, with the gutter token. */
export function Grid({ as: Tag = "div", className, ...rest }: BaseProps) {
  return <Tag className={cx("grid grid-cols-4 gap-gutter md:grid-cols-8 lg:grid-cols-12", className)} {...rest} />;
}

const spanBase = ["", "col-span-1", "col-span-2", "col-span-3", "col-span-4"] as const;
const spanMd = ["", "md:col-span-1", "md:col-span-2", "md:col-span-3", "md:col-span-4", "md:col-span-5", "md:col-span-6", "md:col-span-7", "md:col-span-8"] as const;
const spanLg = ["", "lg:col-span-1", "lg:col-span-2", "lg:col-span-3", "lg:col-span-4", "lg:col-span-5", "lg:col-span-6", "lg:col-span-7", "lg:col-span-8", "lg:col-span-9", "lg:col-span-10", "lg:col-span-11", "lg:col-span-12"] as const;

interface CellProps extends BaseProps {
  /** Columns at each breakpoint: up to 4 on phones, 8 on tablets and 12 on desktop. */
  span?: { base?: 1 | 2 | 3 | 4; md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; lg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 };
}

export function Cell({ span = { base: 4, md: 8, lg: 12 }, as: Tag = "div", className, ...rest }: CellProps) {
  return (
    <Tag
      className={cx(spanBase[span.base ?? 4], span.md && spanMd[span.md], span.lg && spanLg[span.lg], className)}
      {...rest}
    />
  );
}

// ─── Bento ───────────────────────────────────────────────────────────────────

/** A 12-column bento (§4.5). Tiles keep fixed aspect ratios set by their span and rows. */
export function Bento({ className, children, ...rest }: BaseProps) {
  return (
    <div className={cx("bento-frame", className)} {...rest}>
      <div className="bento">{children}</div>
    </div>
  );
}

const spanOnTablets = { 4: 6, 6: 6, 8: 12, 12: 12 } as const;

interface BentoTileProps extends BaseProps {
  /** Columns on desktop. Tablets double a 4-span; phones stack every tile full width. */
  span?: 4 | 6 | 8 | 12;
  rows?: 1 | 2;
  /** The tile's shape on phones, where it stacks. */
  aspect?: "square" | "landscape" | "wide" | "portrait";
}

export function BentoTile({ span = 4, rows = 1, aspect = "landscape", as: Tag = "div", className, style, ...rest }: BentoTileProps) {
  const vars = {
    "--span-lg": span,
    "--span-md": spanOnTablets[span],
    "--rows": rows,
    "--tile-aspect": `var(--aspect-${aspect})`,
  } as CSSProperties;
  return <Tag className={cx("bento-tile", className)} style={{ ...vars, ...style }} {...rest} />;
}

// ─── Stack ───────────────────────────────────────────────────────────────────

/** Gaps on the 8pt grid (4pt half-steps): 1 is 4px, 2 is 8px, 4 is 16px, 8 is 32px. */
const gaps = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
  16: "gap-16",
  24: "gap-24",
} as const;

const aligns = { start: "items-start", center: "items-center", end: "items-end", baseline: "items-baseline", stretch: "items-stretch" } as const;
const justifies = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" } as const;

interface StackProps extends BaseProps {
  gap?: keyof typeof gaps;
  direction?: "column" | "row";
  align?: keyof typeof aligns;
  justify?: keyof typeof justifies;
  wrap?: boolean;
}

export function Stack({ gap = 4, direction = "column", align, justify, wrap, as: Tag = "div", className, ...rest }: StackProps) {
  return (
    <Tag
      className={cx(
        "flex",
        direction === "column" ? "flex-col" : "flex-row",
        gaps[gap],
        align && aligns[align],
        justify && justifies[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...rest}
    />
  );
}
