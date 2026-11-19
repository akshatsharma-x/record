import { content } from "@/content";
import { card, OG } from "@/lib/og";

/** /colophon's share card (lib/og.tsx). */
export const alt = content.copy.colophon.headline;
export const size = OG.size;
export const contentType = OG.contentType;

export default function Image() {
  const { colophon } = content.copy;
  return card({ section: content.copy.footer.pages.colophon, title: colophon.headline, subtitle: colophon.sub });
}
