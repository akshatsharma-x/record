import { content } from "@/content";
import { card, OG } from "@/lib/og";

/** /specs's share card (lib/og.tsx). */
export const alt = `${content.copy.specs.headline} ${content.profile.name}`;
export const size = OG.size;
export const contentType = OG.contentType;

export default function Image() {
  const { specs } = content.copy;
  return card({ section: "Skills", title: specs.headline, subtitle: specs.sub ?? content.profile.headline });
}
