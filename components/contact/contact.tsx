import { Behavior } from "@/components/ui/behavior";
import { Container, Section } from "@/components/ui/layout";
import { Resolve } from "@/components/ui/resolve";
import { Lead } from "@/components/ui/type";
import { content } from "@/content";
import { clockPlace } from "@/content/derive";
import { LazyContactClock } from "./contact-clock-lazy";
import { Dock } from "./dock";
import { Thread } from "./thread";

/**
 * The close (DESIGN.md §7.9): on a light surface, the headline resolves from blur, then a
 * line on availability (while content has one), Akshat's live time and how our days meet,
 * the dock and the thread, where the visitor's bubble is the composer.
 */
export function Contact() {
  const { profile, copy } = content;
  const words = copy.contact;
  return (
    <Section id="contact" name="Contact" surface="light" className="contact" aria-labelledby="contact-title">
      <Container className="contact-body">
        <div className="contact-close">
          <Resolve as="h2" id="contact-title" className="text-display text-fg">
            {words.headline}
          </Resolve>
          {profile.availability ? (
            <Lead tone="fg-2" className="contact-availability">
              {profile.availability}
            </Lead>
          ) : null}
          <LazyContactClock
            place={clockPlace(content)}
            hours={profile.workingHours}
            visitorDay={copy.about.visitorDay}
            words={{ clock: words.clock, overlap: words.overlap, noOverlap: words.noOverlap }}
          />
          <Dock />
        </div>
        <Thread />
      </Container>
      <Behavior section="contact" />
    </Section>
  );
}
