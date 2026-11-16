import Link from "next/link";
import { content } from "@/content";
import type { SkillItem } from "@/content/derive";
import { SkillIcon } from "./skill-icon";

/**
 * The core six (DESIGN.md §7.7): the skills content marks core, as large tiles with their
 * evidence, the roles, projects and papers that use them. No bars, percentages or years:
 * where a skill was used is the measure.
 */
export function CoreSix({ skills }: { skills: SkillItem[] }) {
  const { core } = content.copy.skills;
  return (
    <section className="core-six" aria-labelledby="core-six-title">
      <h3 id="core-six-title" className="core-six-title">
        {core.headline}
      </h3>
      <ul className="core-grid">
        {skills.map((skill) => (
          <li key={skill.id} className="core-tile">
            <SkillIcon skill={skill} className="core-icon" />
            <h4 className="core-name">{skill.name}</h4>
            {skill.detail ? <p className="core-detail">{skill.detail}</p> : null}
            {skill.evidence.length > 0 ? (
              <>
                <p className="core-used">{core.usedIn}</p>
                <ul className="core-evidence">
                  {skill.evidence.map((hit) => (
                    <li key={`${hit.kind}:${hit.id}`}>
                      <Link className="core-link" href={hit.href} data-kind={hit.kind}>
                        {hit.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
