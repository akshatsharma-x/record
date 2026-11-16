import type { CSSProperties } from "react";
import type { SkillItem } from "@/content/derive";
import { cx } from "@/lib/cx";
import { SKILL_ICONS_URL } from "@/lib/skill-icons";

/** A skill's logo from the sprite (lib/skill-icons.ts), or its monogram where it has none. */
export function SkillIcon({ skill, className }: { skill: Pick<SkillItem, "icon" | "monogram">; className?: string }) {
  if (skill.icon) {
    return (
      <svg className={cx("skill-icon", className)} viewBox="0 0 24 24" aria-hidden="true">
        <use href={`${SKILL_ICONS_URL}#${skill.icon}`} />
      </svg>
    );
  }
  return (
    <span className={cx("skill-monogram", className)} style={{ "--letters": skill.monogram.length } as CSSProperties} aria-hidden="true">
      {skill.monogram}
    </span>
  );
}
