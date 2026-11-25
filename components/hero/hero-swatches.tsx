"use client";

import { Palette } from "lucide-react";
import { FinishSwatches } from "@/components/finish/finish-swatches";
import { island } from "@/lib/island/store";
import { FINISHES } from "@/lib/preferences";

/**
 * The hero's finish picker (Part 18): four dots, and the chosen one's name beside them, as a
 * product's color picker shows them. Each choice spreads from its dot and says so in the
 * Island. The name shown is the one html[data-finish] names (styles/components.css), which
 * the head script sets before the first paint, so it's right from the start.
 */
export function HeroSwatches({ className }: { className?: string }) {
  return (
    <div className={className}>
      <FinishSwatches
        wipe
        compact
        onChange={(finish) => {
          const name = FINISHES.find((option) => option.id === finish)?.name ?? finish;
          island.show({ icon: Palette, title: `Finish: ${name}`, tone: "accent" });
        }}
      />
      <span className="hero-finish-name" aria-hidden="true">
        {FINISHES.map((option) => (
          <span key={option.id} data-finish-name={option.id}>
            {option.name}
          </span>
        ))}
      </span>
    </div>
  );
}
