import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Container, Section } from "@/components/ui/layout";
import { content } from "@/content";
import { clockPlace, heroChips, publicLocation } from "@/content/derive";
import type { Portrait } from "@/content/schema";
import { cx } from "@/lib/cx";
import { HERO } from "@/lib/hero";
import { SECTIONS } from "@/lib/sections";
import { Aperture } from "./aperture";
import { DateLine } from "./date-line";
import { HeroController } from "./hero-controller";
import { HeroSwatches } from "./hero-swatches";

const ID = "top";
const NAME = SECTIONS.find((section) => section.id === ID)!.name;

/**
 * The hero (DESIGN.md §7, Part 5), in two editions. The portrait edition switches on by
 * itself when content has a photo; until then the typographic edition ships. Both read
 * fully without JavaScript and with reduced motion: the arrival is CSS from the first
 * paint, the name is the LCP element (or the portrait's subject is), and nothing waits on
 * a script to appear.
 */
export function Hero({ photo }: { photo: Portrait | null }) {
  return photo ? <PortraitHero photo={photo} /> : <TypeHero />;
}

// ─── Shared content ──────────────────────────────────────────────────────────

/** The name, one span per line: two lines on phones, one on wider screens. */
function Name({ loupe }: { loupe?: boolean }) {
  const [first, ...rest] = content.profile.name.split(" ");
  return (
    <h1 id={`${ID}-title`} className="hero-name text-hero" data-cursor={loupe ? "loupe" : undefined}>
      <span className="hero-line" style={{ "--line": 0 } as CSSProperties}>
        {first}
      </span>{" "}
      <span className="hero-line" style={{ "--line": 1 } as CSSProperties}>
        {rest.join(" ")}
      </span>
    </h1>
  );
}

function DateLineSlot() {
  const location = publicLocation(content);
  return (
    <DateLine
      className="hero-date"
      place={clockPlace(content)}
      fallback={`${location.place} · ${location.timeZoneLabel}`}
    />
  );
}

/** The role and the one line about Akshat. */
function Intro() {
  const { profile } = content;
  return (
    <>
      <p className="hero-role text-eyebrow">{profile.role}</p>
      <p className="hero-headline text-lead">{profile.headline}</p>
    </>
  );
}

/** The context chips and the two ways forward. */
function Actions() {
  const { copy } = content;
  return (
    <>
      <ul className="hero-chips" aria-label="Key facts">
        {heroChips(content).map((chip) => (
          <li key={chip.label}>
            <Chip as="a" href={`#${chip.section}`}>
              {chip.label}
            </Chip>
          </li>
        ))}
      </ul>
      <div className="hero-ctas">
        <Button href="#work">{copy.hero.ctaWork}</Button>
        {/* The link style draws its own ›. White on the dark hero, so it reads over the light field. */}
        <Button variant="link" href="#contact" className="hero-hello text-fg!">
          {copy.hero.ctaHello.replace(/\s*›\s*$/, "")}
        </Button>
      </div>
    </>
  );
}

function Cue() {
  return <span className="hero-cue" aria-hidden="true" />;
}

// ─── The typographic edition ─────────────────────────────────────────────────

/**
 * The name huge and centered on a dark surface, over a slow light field in the finish's
 * hues. The loupe magnifies the letters under the cursor (DESIGN.md §6.1).
 */
function TypeHero() {
  return (
    <Section id={ID} name={NAME} surface="dark" padding="none" aria-labelledby={`${ID}-title`} className="hero hero-type">
      <div className="hero-light" aria-hidden="true">
        <span className="hero-light-blob" data-blob="a" />
        <span className="hero-light-blob" data-blob="b" />
        <span className="hero-light-blob" data-blob="c" />
      </div>
      <Container width="wide" className="hero-stack">
        <DateLineSlot />
        <Name loupe />
        <Intro />
        <Actions />
        <div className="hero-ui">
          <HeroSwatches className="hero-swatches" />
        </div>
      </Container>
      <Cue />
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

      <div className="hero-top">
        <Container width="wide">
          <DateLineSlot />
        </Container>
      </div>

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
            <Intro />
          </div>
          <div className="hero-more">
            <Actions />
            <div className="hero-ui">
              <HeroSwatches className="hero-swatches" />
              <Aperture target={ID} />
            </div>
          </div>
        </Container>
      </div>
      <Cue />
      <HeroController target={ID} edition="portrait" />
    </Section>
  );
}
