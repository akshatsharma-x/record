"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ThemeChoice } from "@/lib/preferences";
import { usePreferences } from "@/lib/stores/preferences";
import { originOf } from "./theme-toggle";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const satisfies readonly { value: ThemeChoice; label: string }[];

/** Light, Dark or System, for settings (the footer and Search reuse it). */
export function ThemeSelect({ className }: { className?: string }) {
  const choice = usePreferences((state) => state.themeChoice);
  const setTheme = usePreferences((state) => state.setTheme);
  return (
    <SegmentedControl
      label="Theme"
      options={OPTIONS}
      value={choice}
      className={className}
      onValueChange={(value, segment) => void setTheme(value, originOf(null, segment))}
    />
  );
}
