import type { ReactNode } from "react";
import type { SkillItem } from "@/content/derive";

interface Row {
  id: string;
  name: string;
  skills?: SkillItem[];
  /** Rows that aren't skills (education, coursework) bring their own items. */
  items?: ReactNode[];
}

/**
 * The tech specs (DESIGN.md §7.7), in the manner of Apple's: each category on the left, its
 * items on the right, between hairlines, with room to breathe. In #skills each skill is a
 * button that shows where it's used; on /specs it's plain, printable text.
 */
export function SpecsSheet({ rows, interactive }: { rows: Row[]; interactive: boolean }) {
  return (
    <dl className="specs">
      {rows.map((row) => (
        <div key={row.id} className="specs-row">
          <dt className="specs-term">{row.name}</dt>
          <dd className="specs-items">
            <ul>
              {row.skills?.map((skill) => (
                <li key={skill.id} className="specs-item">
                  {interactive ? (
                    <button
                      type="button"
                      className="specs-skill"
                      data-skill={skill.id}
                      data-evidence={skill.evidence.map((hit) => `${hit.kind}:${hit.id}`).join(" ")}
                      aria-pressed="false"
                    >
                      {skill.label}
                    </button>
                  ) : (
                    skill.label
                  )}
                </li>
              ))}
              {row.items?.map((item, i) => (
                <li key={i} className="specs-item">
                  {item}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
