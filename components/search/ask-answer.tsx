"use client";

import { ArrowRight } from "lucide-react";
import type { AskSource } from "@/lib/ask/documents";
import type { AskCopy } from "@/lib/search/types";
import { SECTIONS } from "@/lib/sections";
import type { AskAnswer as Answer } from "./use-ask";

/**
 * An answer in Search (DESIGN.md §6.3, Part 14): its text as it streams, each claim marked
 * with the number of the source it came from, and the sources as chips that close Search
 * and go there. When the answer is the site's own text, or the model declined, it says so
 * first. A screen reader hears "Answering", then the whole answer once it's done.
 */
export function AskAnswer({ answer, copy, onSource }: { answer: Answer; copy: AskCopy; onSource: (source: AskSource) => void }) {
  const { phase, blocks, sources, notice, mode } = answer;
  const streaming = phase === "asking" || phase === "streaming";
  const contact = { label: SECTIONS.find((section) => section.id === "contact")!.name, target: "contact", href: "/#contact" } satisfies AskSource;
  const said = blocks.map((block) => block.text).join("").trim();
  const status = streaming ? copy.answering : phase === "done" ? [notice === "declined" ? copy.declined : notice ? copy.fallback[notice] : "", said].filter(Boolean).join(" ") : "";

  return (
    <section className="ask" aria-label={copy.label} aria-busy={streaming || undefined} data-mode={mode} data-phase={phase}>
      {notice ? <p className="ask-notice">{notice === "declined" ? copy.declined : copy.fallback[notice]}</p> : null}
      {blocks.length > 0 || streaming ? (
        <p className="ask-text" data-quote={mode === "fallback" || undefined}>
          {blocks.map((block, i) => {
            if (block.sources.length === 0) return <span key={i}>{block.text}</span>;
            // The number goes right after the words it stands for, before any space that follows them.
            const words = block.text.trimEnd();
            return (
              <span key={i} className="ask-cited">
                {words}
                <sup className="ask-mark" aria-hidden="true">
                  {block.sources.map((source) => source + 1).join(",")}
                </sup>
                {block.text.slice(words.length)}
              </span>
            );
          })}
          {streaming ? <span className="ask-caret" aria-hidden="true" /> : null}
        </p>
      ) : null}
      {sources.length > 0 ? (
        <div className="ask-sources">
          <p className="ask-sources-label">{copy.sources}</p>
          <ul className="ask-chips">
            {sources.map((source, i) => (
              <li key={source.label}>
                <button type="button" className="ask-chip" onClick={() => onSource(source)}>
                  <span className="ask-chip-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  {source.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {/* Nothing to show for it, or nothing it could point to: Akshat can say. */}
      {phase === "done" && (notice === "declined" || notice === "nothing" || (mode === "generated" && sources.length === 0)) ? (
        <button type="button" className="ask-contact" onClick={() => onSource(contact)}>
          {copy.contact}
          <ArrowRight aria-hidden="true" className="ask-contact-icon" />
        </button>
      ) : null}
      <p role="status" className="sr-only">
        {status}
      </p>
    </section>
  );
}

/**
 * The glow while an answer streams (DESIGN.md §6.3): a soft band of the finish's two
 * accents travelling round the edges of the screen, gone when the answer is whole. Still,
 * with reduced motion. It never takes a click, and assistive tech never hears it.
 */
export function AskGlow({ on }: { on: boolean }) {
  // The ring is masked, and its parent blurred: blurred after the mask, its edges stay soft.
  return (
    <div className="ask-glow" aria-hidden="true" data-on={on || undefined}>
      <span className="ask-glow-ring" />
    </div>
  );
}
