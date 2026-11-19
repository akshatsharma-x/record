import { content } from "@/content";
import { card, OG } from "@/lib/og";

/** /compare's share card (lib/og.tsx). */
export const alt = content.copy.surprises.compare.headline;
export const size = OG.size;
export const contentType = OG.contentType;

export default function Image() {
  const { compare } = content.copy.surprises;
  return card({ section: compare.headline.replace(/\.$/, ""), title: compare.headline, subtitle: compare.footnote });
}
