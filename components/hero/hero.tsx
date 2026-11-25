import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Behavior } from "@/components/ui/behavior";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/layout";
import { content } from "@/content";
import { heroFacts } from "@/content/derive";
import type { Portrait } from "@/content/schema";
import { cx } from "@/lib/cx";
import { HERO } from "@/lib/hero";
import { SECTIONS } from "@/lib/sections";
import { devanagariName } from "@/lib/surprises/devanagari-name";
import { heroLens } from "@/lib/surprises/hero-lens";
import { Aperture } from "./aperture";
import { HeroController } from "./hero-controller";
import { HeroSwatches } from "./hero-swatches";
import { typeset } from "@/lib/typeset";

const ID = "top";
const NAME = SECTIONS.find((section) => section.id === ID)!.name;

/**
 * The hero (DESIGN.md §7.1, Parts 5 and 18), in two editions. The portrait edition switches
 * on by itself when content has a photo; until then the typographic edition ships. Both
 * read fully without JavaScript and with reduced motion: the arrival is CSS from the first
 * paint, the name is the LCP element (or the portrait's subject is), and nothing waits on a
 * script to appear. Neither says where Akshat is (Part 18).
 */
export function Hero({ photo }: { photo: Portrait | null }) {
  return photo ? <PortraitHero photo={photo} /> : <TypeHero />;
}

// ─── Shared content ──────────────────────────────────────────────────────────

/**
 * The name, one span per line: two lines on phones, one on wider screens. With its flag on
 * (DESIGN.md §8), a click morphs the first name into Devanagari, with what it means; the
 * heading still reads "Akshat Sharma" to assistive tech.
 */
function Name({ loupe }: { loupe?: boolean }) {
  const [first, ...rest] = content.profile.name.split(" ");
  const morph = devanagariName.on ? content.copy.surprises.devanagari : null;
  return (
    <>
      <h1 id={`${ID}-title`} className="hero-name text-hero" data-cursor={loupe ? "loupe" : undefined} data-morph={morph ? "" : undefined}>
        <span className="hero-line" style={{ "--line": 0 } as CSSProperties}>
          {morph ? (
            <span className="hero-morph">
              <span className="hero-latin">{first}</span>
              <span className="hero-devanagari" lang="sa" aria-hidden="true">
                {morph.name}
              </span>
            </span>
          ) : (
            first
          )}
        </span>{" "}
        <span className="hero-line" style={{ "--line": 1 } as CSSProperties}>
          {rest.join(" ")}
        </span>
      </h1>
      {morph ? (
        <>
          <p className="hero-name-note" aria-hidden="true">
            {morph.note}
          </p>
          <Behavior section="name-morph" id={`${ID}-title`} />
        </>
      ) : null}
    </>
  );
}

/** The role: the typographic edition's eyebrow, over the name, in the finish's gradient. */
function Role() {
  return <p className="hero-role text-eyebrow">{content.profile.role}</p>;
}

/** The one line about Akshat. */
function Headline() {
  return <p className="hero-headline text-lead">{typeset(content.profile.headline, { lastWord: true })}</p>;
}

/** The two ways forward. */
function Ctas() {
  const { copy } = content;
  return (
    <div className="hero-ctas">
      <Button href="#work">{copy.hero.ctaWork}</Button>{" "}
      {/* The link style draws its own ›. White on the dark hero, so it reads over the light. */}
      <Button variant="link" href="#contact" className="hero-hello text-fg!">
        {copy.hero.ctaHello.replace(/\s*›\s*$/, "")}
      </Button>
    </div>
  );
}

/**
 * The key facts (Part 18): each a label over its value and a link to its section, the
 * current role's to its panel in the edit (lib/jump.ts); then the finish. Like a product
 * page's specs at the foot of its first screen.
 */
function Facts() {
  const words = content.copy.hero.facts;
  return (
    <div className="hero-facts">
      <ul className="hero-fact-list" aria-label={words.label}>
        {heroFacts(content).map((fact) => (
          <li key={fact.id}>
            {/* Read as one phrase, its label first: "Now: AI & ML Intern, United Airlines". */}
            <a
              className="hero-fact"
              href={`#${fact.target ?? fact.section}`}
              aria-label={`${fact.label}: ${fact.value}`}
              data-jump={fact.target ? "" : undefined}
            >
              <span className="hero-fact-label">{fact.label}</span>{" "}
              <span className="hero-fact-value">{fact.value}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="hero-finish">
        <p className="hero-fact-label" aria-hidden="true">
          {words.finish}
        </p>
        <HeroSwatches className="hero-swatches" />
      </div>
    </div>
  );
}

// ─── The typographic edition ─────────────────────────────────────────────────

/**
 * "Into focus" (Part 18): the name on a dark stage, lit from below in the finish's hues,
 * over two fine dot grids that arrive out of register, the noise of an unclear system,
 * and slide into register as the name comes into focus: complexity turned to order. Then
 * nothing moves on its own; under a mouse the upper grid follows the pointer a few pixels
 * and the light moves against it. The loupe magnifies the name (DESIGN.md §6.1).
 */
function TypeHero() {
  return (
    <Section id={ID} name={NAME} surface="dark" padding="none" aria-labelledby={`${ID}-title`} className="hero hero-type">
      <div className="hero-light" aria-hidden="true">
        <span className="hero-light-glow" data-light="a" />
        <span className="hero-light-glow" data-light="b" />
        <span className="hero-light-glow" data-light="c" />
      </div>
      <div className="hero-field" aria-hidden="true">
        <span className="hero-field-layer" data-field="base" />
        <span className="hero-field-layer" data-field="upper" />
      </div>
      <Container width="wide" className="hero-stack">
        <Role />
        <Name loupe={heroLens.on} />
        <Headline />
        <Ctas />
      </Container>
      <Container width="wide" className="hero-foot">
        <Facts />
      </Container>
      <HeroController target={ID} edition="type" />
    </Section>
  );
}

// ─── The portrait edition ────────────────────────────────────────────────────

function Layer({ depth, className, children }: { depth: "plate" | "name" | "subject"; className?: string; children: ReactNode }) {
  return (
    <div className={cx("hero-layer", className)} data-depth={depth}>
      {children}
    </div>
  );
}

/**
 * Portrait mode: the name sits behind Akshat's head and shoulders, like the Lock Screen's
 * depth effect. Back to front: the blurred plate, the name, the subject, then the UI. The
 * arrival is a focus pull, done by fading pre-blurred copies, so nothing animates blur
 * on a full-screen layer (§5.4).
 */
function PortraitHero({ photo }: { photo: Portrait }) {
  const { subject, plate } = photo;
  // The photo's shape and where its head sits place the frame and the name.
  const geometry = { "--portrait-aspect": subject.width / subject.height, "--portrait-head": photo.headTop } as CSSProperties;
  return (
    <Section
      id={ID}
      name={NAME}
      surface="dark"
      padding="none"
      aria-labelledby={`${ID}-title`}
      className="hero hero-portrait"
      style={geometry}
    >
      {/* The plate, softly blurred, extended past the frame by a heavier blur of itself. */}
      <Layer depth="plate" className="hero-plate">
        <Image
          src={plate.src}
          alt=""
          width={plate.width}
          height={plate.height}
          sizes={HERO.sizes.backdrop}
          quality={60}
          loading="eager"
          className="hero-backdrop"
        />
        <div className="hero-frame">
          <Image
            src={plate.src}
            alt=""
            width={plate.width}
            height={plate.height}
            sizes={HERO.sizes.plate}
            quality={60}
            loading="eager"
            className="hero-plate-near"
          />
          <Image
            src={plate.src}
            alt=""
            width={plate.width}
            height={plate.height}
            sizes={HERO.sizes.plate}
            quality={60}
            loading="eager"
            className="hero-plate-far"
          />
        </div>
        <span className="hero-dim" />
      </Layer>

      <Layer depth="name" className="hero-name-layer">
        <Name />
      </Layer>

      <Layer depth="subject" className="hero-subject">
        <div className="hero-frame">
          <Image
            src={subject.src}
            alt={photo.alt}
            width={subject.width}
            height={subject.height}
            sizes={HERO.sizes.frame}
            quality={75}
            // The LCP image: preloaded from the head, at high priority.
            preload
            fetchPriority="high"
            className="hero-subject-sharp"
          />
          <Image
            src={subject.src}
            alt=""
            width={subject.width}
            height={subject.height}
            sizes={HERO.sizes.frame}
            quality={75}
            loading="eager"
            className="hero-subject-soft"
          />
        </div>
      </Layer>

      {/* On phones the intro closes the first screen and the rest follows it. */}
      <div className="hero-bottom">
        <Container width="wide" className="hero-stack hero-stack-portrait">
          <div className="hero-intro">
            <Role />
            <Headline />
          </div>
          <div className="hero-more">
            <Ctas />
            <Facts />
            {heroLens.on ? (
              <div className="hero-ui">
                <Aperture target={ID} />
              </div>
            ) : null}
          </div>
        </Container>
      </div>
      <HeroController target={ID} edition="portrait" />
    </Section>
  );
}
