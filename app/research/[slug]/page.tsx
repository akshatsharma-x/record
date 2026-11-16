import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Citations } from "@/components/research/citations";
import { Illustration } from "@/components/research/illustration";
import { ShareButton } from "@/components/research/paper-card";
import { ResearchActions } from "@/components/research/research-actions";
import { StatusPill } from "@/components/research/status-pill";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Footnote, FootnoteBackLink, FootnoteRef } from "@/components/ui/type";
import { content } from "@/content";
import { research, scholarlyArticle, scholarMeta } from "@/content/derive";

const paperFor = (slug: string) => research(content).find((paper) => paper.slug === slug);

/**
 * Every paper's page is prerendered (generateStaticParams), and links to one prefetch it.
 * The page reads its slug before rendering anything, so an unknown slug is a real 404, not
 * a 200 that streams a not-found page; that's a blocking read, so the route opts out of
 * instant-navigation validation.
 */
export const instant = false;

export function generateStaticParams() {
  return research(content).map((paper) => ({ slug: paper.slug }));
}

/** Its title and TL;DR, and the tags Google Scholar reads (DESIGN.md §7.5). */
export async function generateMetadata({ params }: PageProps<"/research/[slug]">): Promise<Metadata> {
  const paper = paperFor((await params).slug);
  if (!paper) return {};
  return {
    title: `${paper.title} · ${content.profile.name}`,
    description: paper.tldr,
    other: scholarMeta(paper),
  };
}

/**
 * A paper's page (DESIGN.md §7.5): the title, the authors (Akshat marked), the venue,
 * the status, the TL;DR, the abstract once there is one, the keywords, the illustration
 * at full width, the citations and the projects it relates to, with schema.org
 * ScholarlyArticle JSON-LD. Prerendered for every paper; any other slug is a 404.
 */
export default async function PaperPage({ params }: PageProps<"/research/[slug]">) {
  const paper = paperFor((await params).slug);
  if (!paper) notFound();
  const { caption } = content.copy.research;
  // Escaped as the JSON-LD guide says: no "<" can close the script early.
  const jsonLd = JSON.stringify(scholarlyArticle(content, paper)).replace(/</g, "\\u003c");

  // Footnotes, numbered by content; each mention gets its own back-link (§9).
  const mentions = new Map<number, number>();
  const marks = (footnotes: readonly number[]) =>
    footnotes.map((n) => {
      const occurrence = (mentions.get(n) ?? 0) + 1;
      mentions.set(n, occurrence);
      return <FootnoteRef key={n} n={n} occurrence={occurrence} />;
    });

  const page = (
    <Section id="paper" name="Research" surface="dark" padding="none" className="paper" aria-labelledby="paper-title">
      <Container className="paper-head">
        <Link href="/#research" className="paper-back">
          <span aria-hidden="true">‹</span> Research
        </Link>
        <h1 id="paper-title" className="paper-title">
          {paper.title}
        </h1>
        <p className="paper-authors">
          {paper.authors.map((author, i) => (
            <Fragment key={author.name}>
              {i > 0 ? ", " : null}
              <span className="paper-author" data-self={author.self || undefined}>
                {author.name}
              </span>
            </Fragment>
          ))}
        </p>
        <p className="research-venue">{paper.venue}</p>
        <StatusPill status={paper.status} label={paper.statusLabel} />
        <p className="paper-tldr">{paper.tldr}</p>
        {paper.abstract ? (
          <section className="paper-section" aria-labelledby="abstract-title">
            <h2 id="abstract-title" className="paper-section-title">
              Abstract
            </h2>
            <p className="paper-abstract">{paper.abstract}</p>
          </section>
        ) : null}
        <ul className="chapter-keywords" aria-label="Keywords">
          {paper.keywords.map((keyword) => (
            <li key={keyword}>
              <Chip>{keyword}</Chip>
            </li>
          ))}
        </ul>
        <div className="paper-actions">
          {paper.doiUrl ? (
            <Button href={paper.doiUrl} target="_blank" rel="noopener noreferrer">
              Read
            </Button>
          ) : null}
          <ShareButton title={paper.title} text={paper.tldr} href={paper.href} />
        </div>
      </Container>

      {paper.illustration ? (
        <Container className="paper-figure">
          <Illustration illustration={paper.illustration} caption={caption} />
        </Container>
      ) : null}

      <Container>
        <section id="cite" className="paper-section" aria-labelledby="cite-title">
          <h2 id="cite-title" className="paper-section-title">
            Cite
          </h2>
          <Citations citations={paper.citations} name={`cite-${paper.slug}`} />
        </section>
        {paper.related.length > 0 ? (
          <section className="paper-section" aria-labelledby="related-title">
            <h2 id="related-title" className="paper-section-title">
              Related work
            </h2>
            <ul className="related">
              {paper.related.map((project) => (
                <li key={project.slug} className="related-card">
                  <Link className="related-name" href={`/work/${project.slug}`}>
                    {project.name}
                  </Link>
                  <span className="related-tagline">
                    {project.tagline.text}
                    {marks(project.tagline.footnotes)}
                  </span>
                  <span className="related-shares">In common: {project.shares.join(", ")}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </Section>
  );

  // Rendered after the page, so every mention has been counted.
  const cited = content.footnotes.filter((note) => mentions.has(note.id));
  return (
    <>
      <main>{page}</main>
      <Section as="footer" id="footer" surface="light-alt" aria-label="Notes and credits">
        <Container>
          <Stack gap={6}>
            {cited.length > 0 ? (
              <ol className="flex max-w-measure flex-col gap-2">
                {cited.map((note) => (
                  <li key={note.id} id={`fn-${note.id}`}>
                    <Footnote as="span">
                      {note.id}. {note.note}
                      {note.source ? ` ${note.source}` : null}
                      {Array.from({ length: mentions.get(note.id) ?? 0 }, (_, index) => (
                        <FootnoteBackLink key={index} n={note.id} occurrence={index + 1} />
                      ))}
                    </Footnote>
                  </li>
                ))}
              </ol>
            ) : null}
            <Footnote>{content.copy.footer.credit}</Footnote>
          </Stack>
        </Container>
      </Section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <ResearchActions />
    </>
  );
}
