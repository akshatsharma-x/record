import { Fragment, type ReactNode } from "react";
import { Container, Section } from "@/components/ui/layout";
import { Display, Lead } from "@/components/ui/type";
import { content } from "@/content";
import { currently, type CurrentItem } from "@/content/derive";
import { Glance } from "./glance";

const VERBS: Record<CurrentItem["kind"], string> = { building: "Building", researching: "Researching", reading: "Reading" };

/** The quiet line under the bio: what Akshat is building, researching and reading. */
function Currently() {
  const items = currently(content);
  return (
    <p className="about-currently text-body">
      <span className="about-currently-label">{content.copy.about.currently}</span>
      {items.map((item, i) => (
        <Fragment key={item.kind}>
          {i > 0 ? (
            <>
              <span className="about-currently-sep" aria-hidden="true">
                ·
              </span>
              <span className="sr-only">,</span>
            </>
          ) : null}{" "}
          {VERBS[item.kind]}{" "}
          {item.href ? (
            <a href={item.href} className="about-currently-link">
              {item.text}
            </a>
          ) : (
            item.text
          )}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * About (DESIGN.md §7, Part 6): the lights come up to a light surface. On the left, "Hi,
 * I'm Akshat." with the bio and the Currently line; on the right, the At-a-glance bento.
 * The bio arrives already cited, so its footnotes are numbered in page order.
 */
export function About({ bio }: { bio: ReactNode[] }) {
  return (
    <Section id="about" name="About" surface="light" aria-labelledby="about-title" className="about">
      <Container width="wide">
        <div className="about-grid">
          <div className="about-bio">
            <Display id="about-title">{content.copy.about.headline}</Display>
            {bio.map((paragraph, i) => (
              <Lead key={i}>{paragraph}</Lead>
            ))}
            <Currently />
          </div>
          <Glance />
        </div>
      </Container>
    </Section>
  );
}
