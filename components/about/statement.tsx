import type { CSSProperties, ReactNode } from "react";
import { Container, Section } from "@/components/ui/layout";
import { content } from "@/content";
import { statementWords, type StatementWord } from "@/content/derive";
import { StatementController } from "./statement-controller";

const ID = "statement";

function Word({ word, index }: { word: StatementWord; index: number }) {
  return (
    <span className="statement-word" style={{ "--i": index } as CSSProperties}>
      {word.text}
    </span>
  );
}

/**
 * The statement (DESIGN.md §7, Part 6): content.copy.statement at display size, pinned on
 * the dark surface while each word fills from fg-3 to fg in reading order, scrubbed to the
 * scroll. It's real text from the start: without JavaScript, and with reduced motion, it
 * reads fully filled with no pin. It opens About, so the Island names it About and links
 * to #about land past it (§5.5: a pinned scene can be skipped).
 */
export function Statement() {
  const words = statementWords(content);
  // The space before a word: a no-break one before a dash and before the last word, so no
  // line starts with a dash and the statement never ends on a word alone (Part 17).
  const space = (i: number) => (!words[i].space ? null : i === words.length - 1 || /^[—–]/.test(words[i].text) ? "\u00a0" : " ");
  const nodes: ReactNode[] = [];
  for (let i = 0; i < words.length; ) {
    if (!words[i].emphasis) {
      nodes.push(space(i), <Word key={i} word={words[i]} index={i} />);
      i += 1;
      continue;
    }
    // The gradient phrase is one span, so its gradient runs across all of its words.
    const start = i;
    const phrase: ReactNode[] = [];
    for (; i < words.length && words[i].emphasis; i++) {
      phrase.push(i > start ? space(i) : null, <Word key={i} word={words[i]} index={i} />);
    }
    nodes.push(
      space(start),
      <span key={`phrase-${start}`} className="statement-emphasis">
        {phrase}
      </span>,
    );
  }

  return (
    <Section
      id={ID}
      name="About"
      surface="dark"
      padding="none"
      data-section-for="about"
      className="statement"
      style={{ "--n": words.length } as CSSProperties}
    >
      <div className="statement-stage">
        <Container width="content">
          <p className="statement-text">{nodes}</p>
        </Container>
      </div>
      <StatementController target={ID} />
    </Section>
  );
}
