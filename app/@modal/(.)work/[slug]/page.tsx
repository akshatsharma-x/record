import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CaseSheet } from "@/components/work/case-sheet";
import { CaseStudyView } from "@/components/work/case-study";
import { content } from "@/content";
import { caseStudies } from "@/content/derive";

export function generateStaticParams() {
  return caseStudies(content).map((study) => ({ slug: study.slug }));
}

/**
 * A case study opened from inside the site (a soft navigation to /work/[slug]) is
 * intercepted into the modal slot: it opens as a sheet over the page, which stays where it
 * was behind it (DESIGN.md §7.6). A direct visit or a reload gets the page instead.
 *
 * Prerendered for every project. The slug is read inside a Suspense boundary, as instant
 * navigation asks: a slot's page can't opt out of that check the way a page can.
 */
export default function InterceptedWork({ params }: PageProps<"/work/[slug]">) {
  return (
    <Suspense>
      <Sheet params={params} />
    </Suspense>
  );
}

async function Sheet({ params }: Pick<PageProps<"/work/[slug]">, "params">) {
  const { slug } = await params;
  const study = caseStudies(content).find((entry) => entry.slug === slug);
  if (!study) notFound();
  return (
    <CaseSheet slug={study.slug} titleId={`sheet-${study.slug}-title`}>
      <CaseStudyView study={study} scope={`sheet-${study.slug}`} heading="h2" inSheet />
    </CaseSheet>
  );
}
