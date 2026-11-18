import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Behavior } from "@/components/ui/behavior";
import { Container, Section } from "@/components/ui/layout";
import { Lead } from "@/components/ui/type";
import { content } from "@/content";
import { type ResearchPaper, research, venueLine } from "@/content/derive";
import { Citations } from "./citations";
import { Illustration } from "./illustration";
import { PaperCard } from "./paper-card";
import { StatusPill } from "./status-pill";

const ID = "research";

function Chapter({ paper, index, count, caption }: { paper: ResearchPaper; index: number; count: number; caption: string }) {
  const title = `${paper.slug}-title`;
  return (
    <article className="chapter" data-chapter={paper.slug} data-evidence-id={`paper:${paper.slug}`} aria-labelledby={title}>
      <div className="chapter-stage">
        <Container width="wide" className="chapter-frame">
          <PaperCard
            title={paper.title}
            tldr={paper.tldr}
            href={paper.href}
            read={paper.doiUrl}
            cite={<Citations citations={paper.citations} name={`cite-${paper.slug}`} />}
          >
            <p className="chapter-eyebrow">
              Paper {index + 1} of {count}
            </p>
            <h3 id={title} className="chapter-title p-name">
              <Link href={paper.href} prefetch className="u-url">
                {paper.title}
              </Link>
            </h3>
            <StatusPill status={paper.status} label={paper.statusLabel} />
            <p className="chapter-tldr p-summary">{paper.tldr}</p>
            <ul className="chapter-keywords" aria-label="Keywords">
              {paper.keywords.map((keyword) => (
                <li key={keyword} className="p-category">
                  <Chip>{keyword}</Chip>
                </li>
              ))}
            </ul>
          </PaperCard>
          {paper.illustration ? <Illustration illustration={paper.illustration} caption={caption} /> : null}
        </Container>
      </div>
    </article>
  );
}

/**
 * Research (DESIGN.md §7.5): the lights go down, then the living abstracts. The surface
 * controller dims the page to black as the section arrives; "Research." comes up in the
 * serif italic over where the papers were presented. Then one chapter per paper, pinned
 * on wide, tall screens while its illustration plays (components/research/
 * lib/research-behavior.ts, attachChapters). Phones, reduced motion and no JavaScript read it as a column,
 * each illustration on its final frame.
 */
export function Research() {
  const papers = research(content);
  const { headline, sub, caption } = content.copy.research;
  const venues = [...new Map(papers.map((paper) => [paper.conference.id, paper.conference])).values()];

  return (
    <Section id={ID} name="Research" surface="dark" padding="none" aria-labelledby={`${ID}-title`} className="research">
      <Container width="wide" className="research-head">
        <h2 id={`${ID}-title`} className="research-title">
          {headline}
        </h2>
        {sub ? <Lead tone="fg-2">{sub}</Lead> : null}
        {venues.map((venue) => (
          <p key={venue.id} className="research-venue">
            Presented at {venueLine(venue)}
          </p>
        ))}
      </Container>
      {papers.map((paper, index) => (
        <Chapter key={paper.slug} paper={paper} index={index} count={papers.length} caption={caption} />
      ))}
      <Behavior section="research" />
    </Section>
  );
}
