import { content } from "@/content";
import { skillIconSprite } from "@/lib/skill-icon-sprite";

/** The skills' logos as one SVG sprite, prerendered as a static file (lib/skill-icons.ts). */
export function GET() {
  const slugs = content.skills.flatMap((category) => category.skills.flatMap((skill) => (skill.icon ? [skill.icon] : [])));
  return new Response(skillIconSprite(slugs), { headers: { "Content-Type": "image/svg+xml" } });
}
