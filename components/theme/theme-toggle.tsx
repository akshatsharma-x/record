"use client";

import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";
import { cx } from "@/lib/cx";
import type { ThemeChoice } from "@/lib/preferences";
import { usePreferences } from "@/lib/stores/preferences";
import type { Origin } from "@/lib/theme";

/** The point a theme change grows from: the pointer, or the control's center for keys. */
export function originOf(event: MouseEvent<HTMLElement> | null, element: HTMLElement): Origin {
  if (event && event.detail > 0) return { x: event.clientX, y: event.clientY };
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Flips between light and dark. The new theme is revealed in a circle from the click
 * (lib/theme.ts). The icons follow data-theme in CSS, so they're right before hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);
  const next: ThemeChoice = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={next === "dark" ? "Use the dark theme" : "Use the light theme"}
      onClick={(event) => void setTheme(next, originOf(event, event.currentTarget))}
      className={cx(
        "pressable inline-flex min-h-target min-w-target items-center justify-center rounded-pill text-fg hover-state:bg-control-track",
        className,
      )}
    >
      <Moon aria-hidden="true" className="theme-icon-to-dark" />
      <Sun aria-hidden="true" className="theme-icon-to-light" />
    </button>
  );
}
