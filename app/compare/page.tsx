import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareTable } from "@/components/compare/compare-table";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Footnote } from "@/components/ui/type";
import { content } from "@/content";
import { compareTable } from "@/content/derive";
import { SECTIONS } from "@/lib/sections";
import { comparePage } from "@/lib/surprises/compare-page";

export const metadata: Metadata = {
  title: `${content.copy.surprises.compare.headline.replace(/\.$/, "")} · ${content.profile.name}`,
  description: content.copy.surprises.compare.footnote,
};

/**
 * /compare, "Compare Akshat models." (DESIGN.md §8, lib/surprises/compare-page.ts): Akshat's
 * years side by side, as Apple compares its models, built only from dated entries.
 */
export default function ComparePage() {
  if (!comparePage.on) notFound();
  const { copy } = content;
  const words = copy.surprises.compare;
  const table = compareTable(content);
  const counted = new Set(["internships", "papers", "stack"]);
  const overview = SECTIONS.find((section) => section.id === "top")!.name;
  return (
    <>
      <main className="specs-page">
        <Section id="compare" name={words.headline} surface="light" padding="none" className="specs-section" aria-labelledby="compare-title">
          <Container className="specs-head">
            <Link href="/" className="paper-back">
              <span aria-hidden="true">‹</span> {overview}
            </Link>
            <h1 id="compare-title" className="specs-title">
              {words.headline}
            </h1>
          </Container>
          <Container>
            <CompareTable
              years={table.years}
              rows={table.rows.map((row) => ({ id: row.id, label: row.label, counted: counted.has(row.id), cells: row.cells }))}
              words={{ picker: words.picker, none: words.none }}
            />
            <Footnote className="compare-footnote">{words.footnote}</Footnote>
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
