import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { Container } from "@/components/ui/layout";
import { Counter } from "@/components/ui/counter";
import { FootnoteBackLink, FootnoteRef, noteId } from "@/components/ui/type";
import { content } from "@/content";
import type { CaseStudy, WorkMetric } from "@/content/derive";
import { Cover } from "./cover";
import { Diagram } from "./diagram";

/** A figure that counts up when it comes into view, if it's one number; else as stated. */
function Figure({ metric }: { metric: WorkMetric }) {
  const numbers = metric.parts.filter((part) => part.kind === "number");
  if (numbers.length !== 1) return <>{metric.token}</>;
  const [only] = numbers;
  const at = metric.parts.indexOf(only);
  const text = (parts: WorkMetric["parts"]) => parts.map((part) => (part.kind === "text" ? part.text : "")).join("");
  return (
    <Counter
      value={only.value}
      prefix={text(metric.parts.slice(0, at))}
      suffix={text(metric.parts.slice(at + 1))}
      format={{ minimumFractionDigits: only.decimals, maximumFractionDigits: only.decimals, useGrouping: only.group }}
    />
  );
}

function Chapter({ id, title, heading: Heading, children }: { id: string; title: string; heading: "h2" | "h3"; children: ReactNode }) {
  return (
    <section className="case-chapter" aria-labelledby={id}>
      <Container className="case-chapter-inner">
        <Heading id={id} className="case-chapter-title">
          {title}
        </Heading>
        <div className="case-chapter-body">{children}</div>
      </Container>
    </section>
  );
}

/**
 * A case study (DESIGN.md §7.6), the same in the sheet over the home page and on its own
 * page: the hero (eyebrow, title, tagline, cover and facts), then the problem, the approach
 * with its architecture, the outcome, what it's built with, and the next project. Every word
 * is the project's or content's; anything content doesn't have yet is left out, never shown
 * empty. Its notes are its own, under ids scoped to where it's shown, so they never collide
 * with the page's footer.
 */
export function CaseStudyView({ study, scope, heading: Heading, inSheet }: { study: CaseStudy; scope: string; heading: "h1" | "h2"; inSheet: boolean }) {
  const words = content.copy.work.caseStudy;
  const id = (name: string) => `${scope}-${name}`;
  const sub = Heading === "h1" ? "h2" : "h3";

  // Footnotes, numbered by content; each mention gets its own back-link (§9).
  const mentions = new Map<number, number>();
  const marks = (footnotes: readonly number[]) =>
    footnotes.map((n) => {
      const occurrence = (mentions.get(n) ?? 0) + 1;
      mentions.set(n, occurrence);
      return <FootnoteRef key={n} n={n} occurrence={occurrence} scope={scope} />;
    });
  const cite = (claim: { text: string; footnotes: readonly number[] }) => (
    <>
      {claim.text}
      {marks(claim.footnotes)}
    </>
  );

  const facts = [
    study.year === null ? null : { term: words.facts.year, value: String(study.year) },
    study.role === null ? null : { term: words.facts.role, value: study.role },
    study.stack.length === 0
      ? null
      : {
          term: words.facts.stack,
          value: study.stack.map((item, i) => (
            <Fragment key={item.name}>
              {i > 0 ? " · " : null}
              <span className="case-fact-item">{item.name}</span>
            </Fragment>
          )),
        },
  ].filter((fact) => fact !== null);
  const links = [
    study.links.repo ? { href: study.links.repo, label: words.links.repo } : null,
    study.links.live ? { href: study.links.live, label: words.links.live } : null,
  ].filter((link) => link !== null);

  const body = (
    <>
      <header className="case-hero">
        <Container className="case-hero-text">
          <p className="case-eyebrow" data-case-fade>
            {study.category}
          </p>
          <Heading id={id("title")} className="case-title" data-case-title tabIndex={inSheet ? -1 : undefined}>
            {study.name}
          </Heading>
          <p className="case-tagline" data-case-fade>
            {cite(study.tagline)}
          </p>
        </Container>
        <Container width="wide" className="case-cover-frame">
          <div className="case-cover" data-case-cover>
            <Cover preview={study.preview} screenshot={study.screenshot} />
          </div>
        </Container>
        {facts.length > 0 ? (
          <Container>
            <dl className="case-facts" data-case-fade>
              {facts.map((fact) => (
                <div key={fact.term} className="case-fact">
                  <dt>{fact.term}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Container>
        ) : null}
      </header>

      <div className="case-chapters" data-case-fade>
        {study.problem ? (
          <Chapter id={id("problem")} title={words.chapters.problem} heading={sub}>
            <p className="case-text">{cite(study.problem)}</p>
          </Chapter>
        ) : null}

        <Chapter id={id("approach")} title={words.chapters.approach} heading={sub}>
          <p className="case-text">{cite(study.summary)}</p>
          <Diagram id={id("architecture")} diagram={study.diagram} caption={words.architecture} marks={marks(study.diagram.footnotes)} />
        </Chapter>

        {study.metrics.length > 0 || study.outcome ? (
          <Chapter id={id("outcome")} title={words.chapters.outcome} heading={sub}>
            {study.metrics.length > 0 ? (
              <div className="case-metrics">
                {study.metrics.map((group, g) => (
                  <p key={g} className="case-metric-group">
                    {group.metrics.map((metric, m) => (
                      <span key={m} className="case-metric">
                        <span className="case-metric-value">
                          <Figure metric={metric} />
                        </span>
                        <span className="case-metric-label">
                          {metric.label}
                          {m === group.metrics.length - 1 ? marks(group.footnotes) : null}
                        </span>
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            ) : study.outcome ? (
              <p className="case-text case-outcome">{cite(study.outcome)}</p>
            ) : null}
          </Chapter>
        ) : null}

        {study.stack.length > 0 || links.length > 0 ? (
          <Chapter id={id("built")} title={words.chapters.built} heading={sub}>
            {study.stack.length > 0 ? (
              <ul className="case-stack" aria-label={words.facts.stack}>
                {study.stack.map((item) => (
                  <li key={item.name}>
                    {item.skill ? (
                      <Link href="/#skills" className="case-stack-link">
                        <Chip>{item.name}</Chip>
                      </Link>
                    ) : (
                      <Chip>{item.name}</Chip>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {links.length > 0 ? (
              <ul className="case-links">
                {links.map((link) => (
                  <li key={link.href}>
                    <a className="case-link" href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Chapter>
        ) : null}

        <Container className="case-next-frame">
          <Link
            href={study.next.href}
            replace={inSheet}
            scroll={false}
            className="case-next"
            data-work-origin={study.next.slug}
            data-cursor="open"
            aria-describedby={id("next")}
          >
            <span id={id("next")} className="case-next-eyebrow">
              {words.next}
            </span>
            <span className="case-next-cover">
              <Cover preview={study.next.preview} screenshot={study.next.screenshot} />
            </span>
            <span className="case-next-text">
              <span className="case-next-category">{study.next.category}</span>
              <span className="case-next-name" data-work-title>
                {study.next.name}
              </span>
            </span>
          </Link>
        </Container>

        {mentions.size > 0 ? (
          <Container>
            <section className="case-notes" aria-labelledby={id("notes")}>
              {sub === "h2" ? (
                <h2 id={id("notes")} className="sr-only">
                  {words.notes}
                </h2>
              ) : (
                <h3 id={id("notes")} className="sr-only">
                  {words.notes}
                </h3>
              )}
              <ol>
                {content.footnotes
                  .filter((note) => mentions.has(note.id))
                  .map((note) => (
                    <li key={note.id} id={noteId(note.id, scope)}>
                      {note.id}. {note.note}
                      {note.source ? ` ${note.source}` : null}
                      {Array.from({ length: mentions.get(note.id) ?? 0 }, (_, index) => (
                        <Fragment key={index}>
                          <FootnoteBackLink n={note.id} occurrence={index + 1} scope={scope} />
                        </Fragment>
                      ))}
                    </li>
                  ))}
              </ol>
            </section>
          </Container>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="case" data-case={study.slug} aria-labelledby={id("title")}>
      {body}
    </article>
  );
}
