import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * A chip: a small rounded label for stacks, filters and facts. Static by default; pass
 * `as="button"` (with onClick) or `as="a"` (with href) to make it interactive, which adds
 * the pressed state and a 44×44 hit area. Server-safe: no hooks.
 */
interface ChipProps extends HTMLAttributes<HTMLElement> {
  as?: "span" | "button" | "a";
  href?: string;
  tone?: "neutral" | "accent";
  selected?: boolean;
  disabled?: boolean;
  /** Kitchen only: shows "hover", "pressed" or "focus" without interaction. */
  force?: string;
  children: ReactNode;
}

const tones = {
  neutral: "border-hairline bg-card text-fg",
  accent: "border-accent text-accent",
} as const;

export function Chip({ as: Tag = "span", tone = "neutral", selected, disabled, force, className, children, ...rest }: ChipProps) {
  const interactive = Tag !== "span";
  return (
    <Tag
      data-force={force}
      aria-pressed={Tag === "button" && selected !== undefined ? selected : undefined}
      aria-current={Tag === "a" && selected ? "true" : undefined}
      disabled={Tag === "button" ? disabled : undefined}
      aria-disabled={Tag === "a" && disabled ? true : undefined}
      className={cx(
        "inline-flex min-h-8 items-center gap-1 rounded-chip border px-3 text-caption font-semibold",
        selected ? "border-accent-fill bg-accent-fill text-on-accent" : tones[tone],
        interactive && "hit-area pressable cursor-pointer",
        interactive && !selected && "hover-state:border-fg-2",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
