"use client";

import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useCursorSettings } from "@/lib/cursor/settings";
import { cx } from "@/lib/cx";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * The cursor settings (DESIGN.md §6.1): "Larger cursor" (1.5×) and "Use system cursor".
 * Both persist. Search (Part 4) and the footer (Part 12) offer them; the kitchen shows
 * them now. Until hydration the switches are inert, because the saved values aren't known.
 */
export function CursorSettings({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const large = useCursorSettings((state) => state.large);
  const system = useCursorSettings((state) => state.system);
  const setLarge = useCursorSettings((state) => state.setLarge);
  const setSystem = useCursorSettings((state) => state.setSystem);

  useEffect(() => {
    useCursorSettings.getState().sync();
  }, []);

  return (
    <div className={cx("flex flex-col", className)}>
      <Switch label="Larger cursor" checked={large} onCheckedChange={setLarge} disabled={!hydrated || system} />
      <Switch label="Use system cursor" checked={system} onCheckedChange={setSystem} disabled={!hydrated} />
    </div>
  );
}
