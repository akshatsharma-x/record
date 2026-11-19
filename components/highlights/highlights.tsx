import type { ReactNode } from "react";
import { Container, Section } from "@/components/ui/layout";
import { content } from "@/content";
import { reel } from "@/content/derive";
import { Film } from "./films";
import { Reel } from "./reel";

/**
 * The highlights (DESIGN.md §7, Part 6): "The highlights." over a reel of cards, one per
 * content.highlights entry, each with its micro-film. `texts` are the cards' words, already
 * cited by the page so their footnotes are numbered in page order.
 */
export function Highlights({ texts }: { texts: ReactNode[] }) {
  const items = reel(content);
  return (
    <Section id="highlights" name="Highlights" surface="light-alt" aria-labelledby="highlights-title" className="highlights">
      <Container>
        <h2 id="highlights-title" className="highlights-title text-eyebrow">
          {content.copy.highlights.eyebrow}
        </h2>
      </Container>
      <Reel
        label="Highlights"
        cards={items.map((item, i) => ({
          id: item.id,
          subject: item.subject,
          label: item.text,
          text: texts[i],
          film: <Film film={item.film} />,
          sheet: {
            fact: item.fact,
            footnotes: item.footnotes,
            sources: item.sources,
            section: item.section,
            sectionName: item.sectionName,
          },
        }))}
      />
    </Section>
  );
}
