import type { Metadata } from "next";
import Link from "next/link";
import { SpecsSheet } from "@/components/skills/specs-sheet";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Footnote } from "@/components/ui/type";
import { content } from "@/content";
import { SECTIONS } from "@/lib/sections";

export const metadata: Metadata = {
  title: `${content.copy.colophon.headline.replace(/\.$/, "")} · ${content.profile.name}`,
  description: content.copy.colophon.sub,
};

/**
 * How the site is built (DESIGN.md §3.2): a sheet in the same manner as /specs, of facts
 * about the site, never about Akshat, from content.copy.colophon.
 */
export default function ColophonPage() {
  const { copy } = content;
  const overview = SECTIONS.find((section) => section.id === "top")!.name;
  const rows = copy.colophon.rows.map((row) => ({ id: row.label.toLowerCase(), name: row.label, items: row.items }));
  return (
    <>
      <main className="specs-page">
        <Section id="colophon" name={copy.footer.pages.colophon} surface="light" padding="none" className="specs-section" aria-labelledby="colophon-title">
          <Container className="specs-head">
            <Link href="/" className="paper-back">
              <span aria-hidden="true">‹</span> {overview}
            </Link>
            <h1 id="colophon-title" className="specs-title">
              {copy.colophon.headline}
            </h1>
            <p className="specs-sub">{copy.colophon.sub}</p>
          </Container>
          <Container>
            <SpecsSheet rows={rows} interactive={false} />
          </Container>
        </Section>
      </main>
      <Section as="footer" id="footer" surface="light-alt" aria-label="Credits">
        <Container>
          <Stack gap={6}>
            <Footnote>{copy.footer.cookies}</Footnote>
            <Footnote>{copy.footer.credit}</Footnote>
          </Stack>
        </Container>
      </Section>
    </>
  );
}
