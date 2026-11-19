import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PaperCardProps {
  title: string;
  tldr: string;
  href: string;
  /** The paper's DOI link; Read stays hidden until there is one. */
  read: string | null;
  /** The back: its citations (./citations.tsx), or null until content knows every author. */
  cite: ReactNode | null;
  /** The front: the paper's title, status, TL;DR and keywords. */
  children: ReactNode;
}

/**
 * A chapter's living abstract (DESIGN.md §7.5): the paper on the front, its citation on
 * the back. Cite flips the card, Done or Escape flips it back, and focus goes with it
 * (lib/research-behavior.ts, attachActions). The faces share one grid cell, so the card never changes size.
 * Without JavaScript, Cite links to the paper's page, where the citations are inline.
 * The card is an h-entry: its front the content, with the paper's name, summary, link and
 * keywords. That's also what tells a reader view the paper is the page's own content rather
 * than a teaser to drop (Part 15).
 */
export function PaperCard({ title, tldr, href, read, cite, children }: PaperCardProps) {
  const id = useId();
  return (
    <div className="paper-card h-entry">
      <div className="paper-face e-content" data-face="front">
        {children}
        <div className="paper-actions">
          {read ? (
            <Button href={read} target="_blank" rel="noopener noreferrer">
              Read
            </Button>
          ) : null}{" "}
          {cite ? (
            <>
              <Button variant="secondary" className="needs-js" data-cite-open="" aria-expanded="false" aria-controls={`${id}-back`}>
                Cite
              </Button>{" "}
              <Button href={`${href}#cite`} variant="secondary" className="without-js">
                Cite
              </Button>{" "}
            </>
          ) : null}
          <ShareButton title={title} text={tldr} href={href} />
        </div>
      </div>
      {cite ? (
        <div className="paper-face" data-face="back" id={`${id}-back`} inert role="region" aria-labelledby={`${id}-heading`}>
          <h4 id={`${id}-heading`} tabIndex={-1} className="paper-back-title">
            Cite
          </h4>
          {cite}
          <Button variant="link" className="paper-done" data-cite-close="">
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Share (lib/research-behavior.ts, attachActions): the share sheet, or the link copied. Hidden without JavaScript. */
export function ShareButton({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Button variant="secondary" className="needs-js" data-share={href} data-share-title={title} data-share-text={text}>
      Share
    </Button>
  );
}
