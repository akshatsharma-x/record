import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Footnote } from "@/components/ui/type";
import { SpecsSheet } from "@/components/skills/specs-sheet";
import { content } from "@/content";
import { skillsSection } from "@/content/derive";
import { formatYearMonth } from "@/lib/dates";

export const metadata: Metadata = {
  ...pageMetadata({ path: "/specs", title: `${content.copy.specs.headline.replace(/\.$/, "")} · ${content.profile.name}`, description: content.copy.specs.sub ?? content.profile.headline }),
};

/**
 * The full tech specs (DESIGN.md §7.7): every skill by category, in content's order, then
 * education and coursework, as one sheet in the manner of Apple's Tech Specs pages. It
 * prints as itself, not as the résumé edition every other page prints.
 */
export default function SpecsPage() {
  const { copy, education } = content;
  const { categories } = skillsSection(content);
  const degrees = education.filter((entry) => entry.kind === "degree");
  const rows = [
    ...categories.map((category) => ({ id: category.id, name: category.name, skills: category.skills })),
    {
      id: "education",
      name: copy.specs.education,
      items: education.map((entry) =>
        entry.kind === "degree" ? (
          <>
            <strong className="specs-strong">
              {entry.degree}, {entry.field}
            </strong>
            <br />
            {entry.institution} · {formatYearMonth(entry.start)} – {formatYearMonth(entry.end)}
          </>
        ) : (
          <>
            <strong className="specs-strong">{entry.level}</strong>
            <br />
            {entry.board} · {entry.year}
          </>
        ),
      ),
    },
    ...(degrees.some((degree) => degree.coursework.length > 0)
      ? [{ id: "coursework", name: copy.specs.coursework, items: degrees.flatMap((degree) => degree.coursework) }]
      : []),
  ];
  return (
    <>
      <main className="specs-page">
        <Section id="specs" name="Skills" surface="light" padding="none" className="specs-section" aria-labelledby="specs-title">
          <Container className="specs-head">
            <Link href="/#skills" className="paper-back">
              <span aria-hidden="true">‹</span> {copy.specs.back}
            </Link>
            <h1 id="specs-title" className="specs-title">
              {copy.specs.headline}
            </h1>
            {copy.specs.sub ? <p className="specs-sub">{copy.specs.sub}</p> : null}
          </Container>
          <Container>
            <SpecsSheet rows={rows} interactive={false} />
          </Container>
        </Section>
      </main>
      <Section as="footer" id="footer" surface="light-alt" aria-label="Credits">
        <Container>
          <Stack gap={6}>
            <Footnote>{copy.footer.credit}</Footnote>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
