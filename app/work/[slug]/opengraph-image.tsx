import { content } from "@/content";
import { caseStudies } from "@/content/derive";
import { card, OG } from "@/lib/og";

/** A case study's share card (lib/og.tsx): the project's name and tagline, and an alt text that says so. */
const studyFor = (slug: string) => caseStudies(content).find((entry) => entry.slug === slug);

export function generateStaticParams() {
  return caseStudies(content).map((study) => ({ slug: study.slug }));
}

export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const study = studyFor((await params).slug);
  return [{ id: "card", alt: study ? `${study.name}: ${study.tagline.text}` : content.profile.name, size: OG.size, contentType: OG.contentType }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const study = studyFor((await params).slug);
  return card({ section: "Work", title: study?.name ?? content.profile.name, subtitle: study ? `${study.category} · ${study.tagline.text}` : content.profile.headline });
}
