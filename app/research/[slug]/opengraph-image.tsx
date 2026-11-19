import { content } from "@/content";
import { research } from "@/content/derive";
import { card, OG } from "@/lib/og";

/** A paper's share card (lib/og.tsx): its title, in the serif as its page sets it, and where it was presented. */
const paperFor = (slug: string) => research(content).find((entry) => entry.slug === slug);

export function generateStaticParams() {
  return research(content).map((paper) => ({ slug: paper.slug }));
}

export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const paper = paperFor((await params).slug);
  return [{ id: "card", alt: paper ? `${paper.title}, ${paper.statusLabel.toLowerCase()} at ${paper.conference.name}` : content.profile.name, size: OG.size, contentType: OG.contentType }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const paper = paperFor((await params).slug);
  if (!paper) return card({ section: "Research", title: content.profile.name, subtitle: content.profile.headline });
  const { conference } = paper;
  return card({ section: "Research", title: paper.title, subtitle: `${paper.statusLabel} · ${conference.name} · ${conference.proceedings}`, serif: true });
}
