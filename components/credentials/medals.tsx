import type { ReactNode } from "react";
import { content } from "@/content";
import type { Medal } from "@/content/derive";
import { MedalStill } from "./medal-still";
import { MedalView } from "./medal-view";

/**
 * The medals (DESIGN.md §7.8): one per honor, each its own minted shape, in the order
 * they were won. A drag spins one with inertia, a click or Enter turns it over, and at
 * rest it's still. Under each, in words, everything its faces carry.
 */
export function Medals({ medals, marks = {} }: { medals: readonly Medal[]; marks?: Record<string, ReactNode> }) {
  const words = content.copy.credentials.medals;
  return (
    <div className="medals">
      <h3 className="medals-title text-title">{content.copy.credentials.honors}</h3>
      <ul className="medal-list" aria-label={words.label}>
        {medals.map((medal) => (
          <li key={medal.id} className="medal" id={`medal-${medal.id}`} data-medal={medal.id} data-shape={medal.shape}>
            <div className="medal-figure">
              <MedalView
                medal={{ id: medal.id, shape: medal.shape, face: medal.face, line: medal.line, back: medal.back }}
                still={<MedalStill id={medal.id} shape={medal.shape} face={medal.face} line={medal.line} back={medal.back} />}
                label={`${medal.title} ${words.medal}: ${medal.face}, ${medal.line}`}
              />
              <button
                type="button"
                className="medal-turn"
                aria-pressed="false"
                aria-label={`${words.flip}: ${medal.title} ${words.medal}`}
                aria-describedby={medal.description ? `medal-${medal.id}-back` : undefined}
                data-cursor="default"
              />
            </div>
            <div className="medal-caption">
              <h4 className="medal-name">{medal.title}</h4>
              <p className="medal-line">{medal.line}</p>
              {medal.description ? (
                <p className="medal-description" id={`medal-${medal.id}-back`}>
                  {medal.description.text}
                  {marks[medal.id]}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
