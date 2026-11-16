import type { CSSProperties } from "react";
import type { SkillItem } from "@/content/derive";
import { spiral } from "@/lib/honeycomb";
import { SkillIcon } from "./skill-icon";

const vars = (values: Record<string, number | string>) => values as CSSProperties;
const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * The cloud (DESIGN.md §7.7): every skill as a round icon on a watchOS-style honeycomb,
 * the core six in the middle and the rest around them, layer by layer. The skills behavior
 * magnifies it like a fisheye around the pointer, pans it with a drag, names the icon under
 * the pointer, and moves focus through it with the arrow keys; without it, it's a still
 * honeycomb of buttons. The cursor stays the plain dot over it (the behavior marks the
 * cells): the fisheye is the feedback.
 */
export function Cloud({ skills, label }: { skills: SkillItem[]; label: string }) {
  const cells = spiral(skills.length);
  return (
    <div className="cloud-frame">
      <div className="cloud" data-cloud data-cursor="default">
      <div className="cloud-lattice" role="group" aria-label={label}>
        {skills.map((skill, i) => (
          <button
            key={skill.id}
            type="button"
            className="cloud-cell"
            data-skill={skill.id}
            data-evidence={skill.evidence.map((hit) => `${hit.kind}:${hit.id}`).join(" ")}
            data-core={skill.core || undefined}
            aria-pressed="false"
            aria-label={skill.label}
            tabIndex={i === 0 ? 0 : -1}
            style={vars({ "--cx": round(cells[i].x), "--cy": round(cells[i].y) })}
          >
            <SkillIcon skill={skill} />
          </button>
        ))}
      </div>
      </div>
      <p className="cloud-name" data-cloud-name aria-hidden="true" />
      <p className="cloud-caption" data-cloud-caption />
    </div>
  );
}
