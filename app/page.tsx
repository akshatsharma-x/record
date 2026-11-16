import { Fragment } from "react";
import { About } from "@/components/about/about";
import { Statement } from "@/components/about/statement";
import { type EditMarks, Experience } from "@/components/experience/experience";
import { Hero } from "@/components/hero/hero";
import { Highlights } from "@/components/highlights/highlights";
import { Research } from "@/components/research/research";
import { Skills } from "@/components/skills/skills";
import { Work, type WorkMarks } from "@/components/work/work";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Body, Display, Eyebrow, Footnote, FootnoteBackLink, FootnoteRef, Lead } from "@/components/ui/type";
import { content } from "@/content";
import { credentialsHeadline, edit, work } from "@/content/derive";
import type { Claim } from "@/content/schema";
import { formatYearMonth } from "@/lib/dates";
import { portraitFor } from "@/lib/portrait-fixture";
import { SECTIONS, type SectionId } from "@/lib/sections";

const nameOf = (id: SectionId) => SECTIONS.find((section) => section.id === id)!.name;

const dates = (start: string, end: string) =>
  `${formatYearMonth(start)} – ${end === "present" ? "present" : formatYearMonth(end)}`;

/**
 * The story (DESIGN.md §3.1), in order. Part 4 laid down its structure so the Island and
 * Search have somewhere to go: every section with its id, surface and real copy, plainly
 * set. Parts 5–12 turn each one into its signature moment (§7): the hero is Part 5's, the
 * statement, About and the highlights Part 6's, the edit Part 7's, research Part 8's, the
 * work bento Part 9's and the chip Part 10's.
 */
export default function Home() {
  const { profile, copy, highlights, education, achievements } = content;

  // Footnotes are numbered by content; each mention gets its own back-link (§9).
  const mentions = new Map<number, number>();
  const marks = (footnotes: readonly number[]) =>
    footnotes.map((n) => {
      const occurrence = (mentions.get(n) ?? 0) + 1;
      mentions.set(n, occurrence);
      return <FootnoteRef key={n} n={n} occurrence={occurrence} />;
    });
  const cite = (claim: { text: string; footnotes?: readonly number[] } | Claim) => (
    <>
      {claim.text}
      {marks(claim.footnotes ?? [])}
    </>
  );
  // The edit's panels cite each note once per panel, on the metrics it backs.
  const editMarks = (): EditMarks =>
    Object.fromEntries(
      edit(content).panels.map((panel) => [
        panel.id,
        panel.kind === "role"
          ? panel.groups.map((group) => <>{marks(group.footnotes)}</>)
          : panel.kind === "honor" && panel.detail
            ? [<>{marks(panel.detail.footnotes)}</>]
            : [],
      ]),
    );

  // Each tile cites a note once, on its top metric or else its tagline.
  const workMarks = (): WorkMarks =>
    Object.fromEntries(
      work(content).tiles.map((tile) => [
        tile.slug,
        <>{marks([...new Set([...tile.tagline.footnotes, ...(tile.metric?.footnotes ?? [])])])}</>,
      ]),
    );

  const story = (
    <>
      <Hero photo={portraitFor(profile.photo)} />

      <Statement />
      <About bio={profile.bio.map((paragraph) => cite(paragraph))} />
      <Highlights texts={highlights.map((highlight) => cite(highlight))} />

      <Experience marks={editMarks()} />

      <Research />

      <Work marks={workMarks()} />

      <Skills />

      <Section id="credentials" name={nameOf("credentials")} surface="dark" aria-labelledby="credentials-title">
        <Container>
          <Stack gap={6}>
            <Display id="credentials-title">{credentialsHeadline(content)}</Display>
            <ul className="flex flex-col gap-3">
              {education.map((entry) => (
                <li key={entry.id}>
                  <Body className="font-semibold">
                    {entry.kind === "degree" ? entry.institution : `${entry.level}, ${entry.board}`}
                  </Body>
                  <Body tone="fg-2">
                    {entry.kind === "degree"
                      ? `${entry.degree}, ${entry.field} · ${dates(entry.start, entry.end)}`
                      : String(entry.year)}
                  </Body>
                </li>
              ))}
              {achievements.map((achievement) => (
                <li key={achievement.id}>
                  <Body className="font-semibold">{achievement.title}</Body>
                  <Body tone="fg-2">{[achievement.org, achievement.years.join(" · ")].filter(Boolean).join(" · ")}</Body>
                </li>
              ))}
            </ul>
          </Stack>
        </Container>
      </Section>

      <Section id="contact" name={nameOf("contact")} surface="light" aria-labelledby="contact-title">
        <Container>
          <Stack gap={6}>
            <Eyebrow tone="fg-2">{nameOf("contact")}</Eyebrow>
            <Display id="contact-title">{copy.contact.headline}</Display>
            <Lead>
              <a href={`mailto:${profile.email}`} className="text-accent underline underline-offset-(--underline-offset)">
                {profile.email}
              </a>
            </Lead>
          </Stack>
        </Container>
      </Section>
    </>
  );

  // Rendered after the story, so every mention has been counted.
  const cited = content.footnotes.filter((note) => mentions.has(note.id));
  return (
    <>
      <main>{story}</main>
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
                        <Fragment key={index}>
                          <FootnoteBackLink n={note.id} occurrence={index + 1} />
                        </Fragment>
                      ))}
                    </Footnote>
                  </li>
                ))}
              </ol>
            ) : null}
            <Footnote>{copy.footer.credit}</Footnote>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
