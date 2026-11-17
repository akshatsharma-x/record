"use client";

import { Palette } from "lucide-react";
import { CursorSettings } from "@/components/cursor/cursor-settings";
import { FinishSwatches } from "@/components/finish/finish-swatches";
import { ThemeSelect } from "@/components/theme/theme-select";
import { island } from "@/lib/island/store";
import { FINISHES } from "@/lib/preferences";

/**
 * The footer's settings (DESIGN.md §7.9): the theme, the finish (said in the Island, as the
 * hero's swatches say it), and the cursor's two options. Each persists, as it does in Search.
 */
export function FooterSettings() {
  return (
    <div className="footer-settings">
      <ThemeSelect className="footer-theme" />
      <FinishSwatches
        className="footer-finish"
        onChange={(finish) => {
          const name = FINISHES.find((option) => option.id === finish)?.name ?? finish;
          island.show({ icon: Palette, title: `Finish: ${name}`, tone: "accent" });
        }}
      />
      <CursorSettings className="footer-cursor" />
    </div>
  );
}
