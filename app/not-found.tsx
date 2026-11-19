import type { Metadata } from "next";
import { FocusButton } from "@/components/not-found/focus-button";
import { Container, Section } from "@/components/ui/layout";
import { content } from "@/content";
import { notFound as outOfFocus } from "@/lib/surprises/not-found";

export const metadata: Metadata = {
  title: `${content.copy.surprises.notFound.headline} · ${content.profile.name}`,
  robots: { index: false, follow: true },
};

/**
 * The 404 (DESIGN.md §3.2, §8): the page is out of focus, the name and the light behind it
 * blurred, and "Bring it into focus" sharpens it and takes the visitor home. The words
 * themselves are always sharp, so the page is never hard to read.
 */
export default function NotFound() {
  const words = content.copy.surprises.notFound;
  return (
    <main id="main" className="not-found" data-blurred={outOfFocus.on ? "" : undefined}>
      <Section id="not-found" surface="dark" padding="none" className="not-found-surface" aria-labelledby="not-found-title">
        <div className="not-found-blur" aria-hidden="true">
          <span className="not-found-light" data-light="a" />
          <span className="not-found-light" data-light="b" />
          <span className="not-found-name text-hero">{content.profile.name}</span>
        </div>
        <Container className="not-found-body">
          <h1 id="not-found-title" className="text-display">
            {words.headline}
          </h1>
          <p className="text-lead text-fg-2">{words.sub}</p>
          <FocusButton>{words.action}</FocusButton>
        </Container>
      </Section>
    </main>
  );
}
