import { content } from "@/content";
import { card, OG } from "@/lib/og";

/** The home page's share card (lib/og.tsx): the name, big, with the role and the headline. */
export const alt = `${content.profile.name}, ${content.profile.role}`;
export const size = OG.size;
export const contentType = OG.contentType;

export default function Image() {
  const { profile } = content;
  return card({ section: "Overview", title: profile.name, subtitle: profile.headline });
}
