import type { Metadata } from "next";
import { Hero } from "@/components/hero/hero";
import { Container, Section } from "@/components/ui/layout";
import { Body, Display } from "@/components/ui/type";
import { content } from "@/content";
import { PORTRAIT_FIXTURE } from "@/lib/portrait-fixture";

export const metadata: Metadata = {
  title: "Hero · dev",
  robots: { index: false },
};

/**
 * The hero's portrait edition with the stand-in portrait (scripts/portrait-fixture.mjs),
 * until Akshat's photo exists. Development only; the home page shows the typographic
 * edition. A light section follows, so the scroll-out has somewhere to dim into.
 */
export default function HeroPage() {
  return (
    <main>
      <Hero photo={PORTRAIT_FIXTURE} />
      <Section id="about" name="About" surface="light" aria-labelledby="dev-hero-next">
        <Container width="measure">
          <Display id="dev-hero-next">{content.copy.about.headline}</Display>
          <Body className="mt-6">
            The portrait edition switches on by itself once content has a photo. This page shows it with a stand-in.
          </Body>
        </Container>
      </Section>
    </main>
  );
}
