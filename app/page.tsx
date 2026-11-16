import { Fragment } from "react";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Body, Display, Eyebrow, Footnote, FootnoteBackLink, FootnoteRef, Hero, Lead, Title } from "@/components/ui/type";
import { content } from "@/content";
import { allSkills, credentialsHeadline } from "@/content/derive";
import type { Claim } from "@/content/schema";
import { formatYearMonth } from "@/lib/dates";
import { SECTIONS, type SectionId } from "@/lib/sections";

const nameOf = (id: SectionId) => SECTIONS.find((section) => section.id === id)!.name;

const dates = (start: string, end: string) =>
  `${formatYearMonth(start)} – ${end === "present" ? "present" : formatYearMonth(end)}`;

/**
 * The story (DESIGN.md §3.1), in order. Part 4 lays down its structure so the Island and
 * Search have somewhere to go: every section with its id, surface and real copy, plainly
 * set. Parts 5–12 turn each one into its signature moment (§7).
 */
export default function Home() {
  const { profile, copy, highlights, experience, publications, conferences, projects, education, achievements } = content;
  const venues = new Map(conferences.map((conference) => [conference.id, conference]));
  const skills = allSkills(content);
  const categories = [...new Set(skills.map((skill) => skill.category))];

  // Footnotes are numbered by content; each mention gets its own back-link (§9).
  const mentions = new Map<number, number>();
  const cite = (claim: { text: string; footnotes?: readonly number[] } | Claim) => (
    <>
      {claim.text}
      {(claim.footnotes ?? []).map((n) => {
        const occurrence = (mentions.get(n) ?? 0) + 1;
        mentions.set(n, occurrence);
        return <FootnoteRef key={n} n={n} occurrence={occurrence} />;
      })}
    </>
  );

  const story = (
    <>
      <Section id="top" name={nameOf("top")} surface="dark" aria-labelledby="top-title">
        <Container>
          <Stack gap={4}>
            <Eyebrow tone="fg-2">{profile.role}</Eyebrow>
            <Hero id="top-title">{profile.name}</Hero>
            <Lead tone="fg-2" className="max-w-measure">
              {profile.headline}
            </Lead>
          </Stack>
        </Container>
      </Section>

      <Section id="about" name={nameOf("about")} surface="light" aria-labelledby="about-title">
        <Container width="measure">
          <Stack gap={6}>
            <Eyebrow tone="fg-2">{nameOf("about")}</Eyebrow>
            <Display id="about-title">{copy.about.headline}</Display>
            {profile.bio.map((paragraph) => (
              <Body key={paragraph.text}>{cite(paragraph)}</Body>
            ))}
          </Stack>
        </Container>
      </Section>

      <Section id="highlights" name={nameOf("highlights")} surface="light-alt" aria-labelledby="highlights-title">
        <Container>
          <Stack gap={6}>
            <Title as="h2" id="highlights-title">
              {nameOf("highlights")}
            </Title>
            <ul className="flex flex-col gap-3">
              {highlights.map((highlight) => (
                <li key={highlight.id}>
                  <Lead as="p">
                    {cite(highlight)}
                    {highlight.source ? <span className="text-fg-2"> {highlight.source}</span> : null}
                  </Lead>
                </li>
              ))}
            </ul>
          </Stack>
        </Container>
      </Section>

      <Section id="experience" name={nameOf("experience")} surface="light" aria-labelledby="experience-title">
        <Container>
          <Stack gap={6}>
            <Display id="experience-title">{copy.experience.headline}</Display>
            {copy.experience.sub ? <Lead tone="fg-2">{copy.experience.sub}</Lead> : null}
            <ul className="flex flex-col gap-3">
              {experience.map((role) => (
                <li key={role.id}>
                  <Body>
                    <strong className="font-semibold">{role.org}</strong>, {role.role}
                  </Body>
                  <Body tone="fg-2">{dates(role.start, role.end)}</Body>
                </li>
              ))}
            </ul>
          </Stack>
        </Container>
      </Section>

      <Section id="research" name={nameOf("research")} surface="dark" aria-labelledby="research-title">
        <Container>
          <Stack gap={6}>
            <Display id="research-title">{copy.research.headline}</Display>
            {copy.research.sub ? <Lead tone="fg-2">{copy.research.sub}</Lead> : null}
            <ul className="flex flex-col gap-3">
              {publications.map((paper) => {
                const venue = venues.get(paper.presentedAt);
                return (
                  <li key={paper.slug}>
                    <Body serif className="font-semibold">
                      {paper.title}
                    </Body>
                    {venue ? <Body tone="fg-2">{`${venue.name}, ${venue.proceedings}`}</Body> : null}
                  </li>
                );
              })}
            </ul>
          </Stack>
        </Container>
      </Section>

      <Section id="work" name={nameOf("work")} surface="light-alt" aria-labelledby="work-title">
        <Container>
          <Stack gap={6}>
            <Display id="work-title">{copy.work.headline}</Display>
            {copy.work.sub ? <Lead tone="fg-2">{copy.work.sub}</Lead> : null}
            <ul className="flex flex-col gap-3">
              {projects.map((project) => (
                <li key={project.slug}>
                  <Body>
                    <strong className="font-semibold">{project.name}</strong>
                  </Body>
                  <Body tone="fg-2">{cite(project.tagline)}</Body>
                </li>
              ))}
            </ul>
          </Stack>
        </Container>
      </Section>

      <Section id="skills" name={nameOf("skills")} surface="dark" aria-labelledby="skills-title">
        <Container>
          <Stack gap={6}>
            <Eyebrow tone="fg-2">{nameOf("skills")}</Eyebrow>
            <Display id="skills-title">{copy.skills.headline}</Display>
            {copy.skills.sub ? <Lead tone="fg-2">{copy.skills.sub}</Lead> : null}
            <dl className="flex flex-col gap-3">
              {categories.map((category) => (
                <div key={category}>
                  <Body as="dt" className="font-semibold">
                    {category}
                  </Body>
                  <Body as="dd" tone="fg-2">
                    {skills
                      .filter((skill) => skill.category === category)
                      .map((skill) => skill.label)
                      .join(", ")}
                  </Body>
                </div>
              ))}
            </dl>
          </Stack>
        </Container>
      </Section>

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
