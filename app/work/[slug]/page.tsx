import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Footnote } from "@/components/ui/type";
import { CaseStudyView } from "@/components/work/case-study";
import { content } from "@/content";
import { caseStudies } from "@/content/derive";

const studyFor = (slug: string) => caseStudies(content).find((study) => study.slug === slug);

/**
 * Every case study's page is prerendered (generateStaticParams). The page reads its slug
 * before rendering anything, so an unknown slug is a real 404 (proxy.ts answers it first);
 * that's a blocking read, so the route opts out of instant-navigation validation.
 */
export const instant = false;

export function generateStaticParams() {
  return caseStudies(content).map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const study = studyFor((await params).slug);
  if (!study) return {};
  return { title: `${study.name} · ${content.profile.name}`, description: study.tagline.text };
}

/**
 * A case study as its own page (DESIGN.md §7.6): what a direct visit or a reload of
 * /work/[slug] gets. From the home page the same case study opens over it as a sheet
 * (app/@modal/(.)work/[slug]).
 */
export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const study = studyFor((await params).slug);
  if (!study) notFound();
  return (
    <>
      <main>
        <Section id="case" name="Work" surface="light" padding="none" className="case-page" aria-labelledby={`page-${study.slug}-title`}>
          <Container className="case-page-head">
            <Link href="/#work" className="paper-back">
              <span aria-hidden="true">‹</span> {content.copy.work.caseStudy.back}
            </Link>
          </Container>
          <CaseStudyView study={study} scope={`page-${study.slug}`} heading="h1" inSheet={false} />
        </Section>
      </main>
      <Section as="footer" id="footer" surface="light-alt" aria-label="Credits">
        <Container>
          <Stack gap={6}>
            <Footnote>{content.copy.footer.credit}</Footnote>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
