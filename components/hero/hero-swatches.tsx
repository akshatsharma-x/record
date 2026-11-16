"use client";

import { Palette } from "lucide-react";
import { FinishSwatches } from "@/components/finish/finish-swatches";
import { island } from "@/lib/island/store";
import { FINISHES } from "@/lib/preferences";

/** The hero's finish swatches: each choice spreads from its swatch and says so in the Island. */
export function HeroSwatches({ className }: { className?: string }) {
  return (
    <FinishSwatches
      wipe
      className={className}
      onChange={(finish) => {
        const name = FINISHES.find((option) => option.id === finish)?.name ?? finish;
        island.show({ icon: Palette, title: `Finish: ${name}`, tone: "accent" });
      }}
    />
  );
}
