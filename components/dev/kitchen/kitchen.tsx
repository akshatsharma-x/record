"use client";

import { CircleAlert, Info, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { type CSSProperties, type ReactNode, useState, useSyncExternalStore } from "react";
import { FinishSwatches } from "@/components/finish/finish-swatches";
import { ThemeSelect } from "@/components/theme/theme-select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CubePoster } from "@/components/three/cube-poster";
import { StageView, TIER_CHANGE_EVENT, useStage } from "@/components/three/stage";
import { Behavior } from "@/components/ui/behavior";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Counter } from "@/components/ui/counter";
import { Bento, BentoTile, Cell, Container, Grid, Section, Stack } from "@/components/ui/layout";
import { Resolve } from "@/components/ui/resolve";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { TiltCard } from "@/components/ui/tilt-card";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Body,
  Caption,
  Display,
  Eyebrow,
  Footnote,
  FootnoteBackLink,
  FootnoteRef,
  Hero,
  Lead,
  Title,
} from "@/components/ui/type";
import { FINISHES } from "@/lib/preferences";
import { type Tier, TIER_OVERRIDE_KEY, TIER_SESSION_KEY, TIERS } from "@/lib/tier";
import { CursorLab } from "./cursor-lab";
import { IslandLab } from "./island-lab";
import "./kitchen.css";

export interface TokenGroups {
  neutrals: [string, string][];
  finishes: [string, string][];
  type: [string, string][];
  space: [string, string][];
  radii: [string, string][];
  materials: [string, string][];
  layers: [string, string][];
  motion: [string, string][];
}

const TestCube = dynamic(() => import("@/components/three/test-cube"), { ssr: false });

// ─── Page ────────────────────────────────────────────────────────────────────

export function Kitchen({
  tokens,
  email,
  credentials,
}: {
  tokens: TokenGroups;
  email: string;
  /** The wallet with fixture certificates, rendered on the server (it draws QR codes). */
  credentials: { headline: string; wallet: ReactNode };
}) {
  return (
    <main>
      <Section id="kitchen" name="Kitchen" surface="light">
        <Container width="wide" className="flex flex-col gap-24">
          <Header />
          <NeutralsAndSurfaces tokens={tokens} />
          <Finishes tokens={tokens} />
          <Type tokens={tokens} />
          <SpaceAndLayout tokens={tokens} />
          <Shapes tokens={tokens} />
          <Motion tokens={tokens} />
          <Controls />
          <Overlays />
          <Cursor />
          <IslandBlock email={email} />
          <NumbersAndFootnotes />
          <Reveal />
          <Depth />
          <TextEffects />
          <Stage />
        </Container>
      </Section>
      <Section id="kitchen-credentials" name="Wallet" surface="dark" aria-labelledby="kitchen-credentials-title">
        <Container className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <Display id="kitchen-credentials-title">{credentials.headline}</Display>
            <Lead tone="fg-2" className="max-w-measure">
              The wallet with the fixture certificates from content/fixtures.ts: one with a finish tone, one with an issuer
              tone that never expires, and one that has expired with no ID or verify link.
            </Lead>
          </div>
          {credentials.wallet}
        </Container>
        <Behavior section="credentials" id="kitchen-credentials" />
      </Section>
      <Section id="lights-down" name="Lights down" surface="dark" aria-labelledby="lights-down-title">
        <Container>
          <Display id="lights-down-title">The lights go down.</Display>
          <Lead tone="fg-2" className="mt-4 max-w-measure">
            A dark surface. Scroll slowly: the page background crossfades over the last fifth of each section, and the
            text switches at the midpoint.
          </Lead>
        </Container>
      </Section>
      <Section id="lights-up" name="Lights up" surface="light-alt" aria-labelledby="lights-up-title">
        <Container>
          <Display id="lights-up-title">The lights come up.</Display>
          <Lead tone="fg-2" className="mt-4 max-w-measure">
            Light-alt: the second light surface. In the dark theme both light surfaces become bg-alt.
          </Lead>
        </Container>
      </Section>
      <Section id="kitchen-end" name="Back to light" surface="light" aria-labelledby="kitchen-end-title">
        <Container>
          <Title as="h2" id="kitchen-end-title">
            Back to light.
          </Title>
        </Container>
      </Section>
    </main>
  );
}

function Block({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-12 flex-col gap-8">
      <div className="flex max-w-measure flex-col gap-2">
        <Title as="h2" id={`${id}-title`}>
          {title}
        </Title>
        {note ? <Body tone="fg-2">{note}</Body> : null}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <Caption as="h3" className="font-semibold">
      {children}
    </Caption>
  );
}

function TokenTable({ caption, rows, swatch }: { caption: string; rows: [string, string][]; swatch?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-card-s border border-hairline">
      <table className="w-full border-collapse text-left text-caption">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Token
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, value]) => (
            <tr key={name} className="border-t border-hairline align-top">
              <td className="whitespace-nowrap px-3 py-2 font-mono">
                {swatch ? (
                  <span className="kitchen-swatch mr-2" style={{ backgroundColor: `var(${name})` }} aria-hidden="true" />
                ) : null}
                {name}
              </td>
              <td className="break-all px-3 py-2 font-mono text-fg-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Header and controls ─────────────────────────────────────────────────────

function useAttribute(name: string): string | null {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: [name] });
      return () => observer.disconnect();
    },
    () => document.documentElement.getAttribute(name),
    () => null,
  );
}

function subscribeToTier(onChange: () => void): () => void {
  window.addEventListener(TIER_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(TIER_CHANGE_EVENT, onChange);
}

function readTierOverride(): Tier | "AUTO" {
  try {
    const stored = sessionStorage.getItem(TIER_OVERRIDE_KEY);
    return (TIERS as readonly string[]).includes(stored ?? "") ? (stored as Tier) : "AUTO";
  } catch {
    return "AUTO";
  }
}

function Header() {
  const motion = useAttribute("data-motion");
  const tier = useSyncExternalStore(subscribeToTier, readTierOverride, () => "AUTO" as const);
  const { tier: detected, active } = useStage();

  return (
    <header className="flex flex-col gap-8">
      <div className="flex max-w-measure flex-col gap-2">
        <Eyebrow>Design system · development only</Eyebrow>
        <Display as="h1">Kitchen.</Display>
        <Lead tone="fg-2">
          Every token, type style, component and state, in light and dark and all four finishes. Values are read from
          styles/tokens.css.
        </Lead>
      </div>
      <div className="flex flex-col gap-4">
        <Stack direction="row" gap={4} align="center" wrap>
          <ThemeSelect />
          <ThemeToggle />
        </Stack>
        <FinishSwatches />
        <Stack direction="row" gap={4} align="center" wrap>
          <SegmentedControl
            label="Motion"
            options={[
              { value: "system", label: "System" },
              { value: "reduce", label: "Reduce" },
              { value: "full", label: "Full" },
            ]}
            value={motion === "reduce" || motion === "full" ? motion : "system"}
            onValueChange={(value) => {
              if (value === "system") document.documentElement.removeAttribute("data-motion");
              else document.documentElement.setAttribute("data-motion", value);
            }}
          />
          <SegmentedControl
            label="3D tier"
            options={[{ value: "AUTO", label: "Auto" }, ...TIERS.map((value) => ({ value, label: value }))]}
            value={tier}
            onValueChange={(value) => {
              try {
                sessionStorage.removeItem(TIER_SESSION_KEY);
                if (value === "AUTO") sessionStorage.removeItem(TIER_OVERRIDE_KEY);
                else sessionStorage.setItem(TIER_OVERRIDE_KEY, value);
              } catch {
                // Without session storage the override can't stick.
              }
              window.dispatchEvent(new Event(TIER_CHANGE_EVENT));
            }}
          />
          <output className="kitchen-stack text-caption text-fg-2" aria-label="Detected tier">
            <span className="invisible">OFF · posters</span>
            <span>{detected ? `${detected} · ${active ? "3D on" : "posters"}` : "detecting…"}</span>
          </output>
        </Stack>
      </div>
    </header>
  );
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

function SurfacePanel({ surface, name }: { surface: "light" | "light-alt" | "dark"; name: string }) {
  return (
    <div data-surface={surface} className="flex flex-col gap-4 rounded-card-l border border-hairline p-6">
      <Eyebrow as="h3">{name}</Eyebrow>
      <Title as="p">fg: Clarity, engineered.</Title>
      <Body tone="fg-2">fg-2: secondary text, captions and metadata.</Body>
      <Title as="p" tone="fg-3">
        fg-3: large text only
      </Title>
      <hr className="border-hairline" />
      <div className="rounded-card-s bg-card p-4">
        <Body>A card on this surface.</Body>
      </div>
      <Body>
        <a href="#neutrals" className="text-accent underline underline-offset-(--underline-offset)">
          An accent link
        </a>
      </Body>
    </div>
  );
}

function NeutralsAndSurfaces({ tokens }: { tokens: TokenGroups }) {
  return (
    <Block
      id="neutrals"
      title="Neutrals and surfaces"
      note="Text tokens re-map per surface. In the dark theme, both light surfaces become bg-alt."
    >
      <Grid>
        {(
          [
            ["light", "Light"],
            ["light-alt", "Light-alt"],
            ["dark", "Dark"],
          ] as const
        ).map(([surface, name]) => (
          <Cell key={surface} span={{ base: 4, md: 8, lg: 4 }}>
            <SurfacePanel surface={surface} name={name} />
          </Cell>
        ))}
      </Grid>
      <TokenTable caption="Neutral palette" rows={tokens.neutrals} swatch />
    </Block>
  );
}

function FinishPanel({ finish, name, tone }: { finish: string; name: string; tone: "light" | "dark" }) {
  return (
    <div data-finish={finish} data-tone={tone} className="flex flex-col items-start gap-4 rounded-card-l border border-hairline bg-bg p-6 text-fg">
      <div className="flex items-center gap-2">
        <span className="swatch" aria-hidden="true" />
        <Eyebrow as="h4">{name}</Eyebrow>
        <Caption as="span">{tone === "light" ? "on light" : "on dark"}</Caption>
      </div>
      <Title as="p">
        Clarity, <span className="text-gradient">engineered</span>.
      </Title>
      <Body tone="accent">Accent text for links and emphasis.</Body>
      <div className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="link" href="#finishes">
          Text link
        </Button>
        <Chip tone="accent">Accent chip</Chip>
        <Chip as="button" selected>
          Selected
        </Chip>
      </div>
      <Button variant="secondary" force="focus">
        Focus ring
      </Button>
    </div>
  );
}

function Finishes({ tokens }: { tokens: TokenGroups }) {
  return (
    <Block
      id="finishes"
      title="Finishes"
      note="Each finish has an accent on light and on dark, and a luminance-matched second stop for gradients. All of them pass 4.5:1 (tests/unit/contrast.test.ts)."
    >
      <Grid>
        {FINISHES.map((finish) => (
          <Cell key={finish.id} span={{ base: 4, md: 4, lg: 3 }} className="flex flex-col gap-4">
            <Label>{finish.name}</Label>
            <FinishPanel finish={finish.id} name={finish.name} tone="light" />
            <FinishPanel finish={finish.id} name={finish.name} tone="dark" />
          </Cell>
        ))}
      </Grid>
      <TokenTable caption="Finish palette" rows={tokens.finishes} swatch />
    </Block>
  );
}

const TYPE_STYLES = [
  ["Hero", "--text-hero", <Hero key="hero" as="p">Clarity, engineered.</Hero>],
  ["Display", "--text-display", <Display key="display" as="p">The lights go down.</Display>],
  ["Title", "--text-title", <Title key="title" as="p">Built to be used. Designed to be understood.</Title>],
  ["Eyebrow", "--text-eyebrow", <Eyebrow key="eyebrow">The highlights.</Eyebrow>],
  ["Lead", "--text-lead", <Lead key="lead">Machine learning for the food we save and the air we breathe.</Lead>],
  ["Body", "--text-body", <Body key="body">Six documents. Two calls. Pennies a run. Short declaratives, then the payoff.</Body>],
  ["Caption", "--text-caption", <Caption key="caption">A caption under a figure or a chart.</Caption>],
  ["Footnote", "--text-footnote", <Footnote key="footnote">1. Footnotes sit in the footer, with a way back.</Footnote>],
] as const;

function Type({ tokens }: { tokens: TokenGroups }) {
  const value = (name: string) => tokens.type.find(([token]) => token === name)?.[1] ?? "";
  return (
    <Block id="type" title="Type" note="SF Pro, New York and SF Mono on Apple devices; Inter, Newsreader and JetBrains Mono elsewhere.">
      <div className="flex flex-col divide-y divide-hairline">
        {TYPE_STYLES.map(([name, token, sample]) => (
          <div key={name} className="flex flex-col gap-2 py-6">
            <Caption>
              <span className="font-semibold text-fg">{name}</span> · <span className="font-mono">{value(token)}</span> ·
              line height {value(`${token}--line-height`)}
              {value(`${token}--letter-spacing`) ? ` · tracking ${value(`${token}--letter-spacing`)}` : ""}
              {value(`${token}--font-weight`) ? ` · weight ${value(`${token}--font-weight`)}` : ""}
            </Caption>
            {sample}
          </div>
        ))}
        <div className="flex flex-col gap-2 py-6">
          <Caption>
            <span className="font-semibold text-fg">Serif</span> · research titles and pull quotes
          </Caption>
          <Title as="p" serif className="italic">
            An interpretable framework for food waste.
          </Title>
        </div>
        <div className="flex flex-col gap-2 py-6">
          <Caption>
            <span className="font-semibold text-fg">Mono</span> · metrics, IDs and code, with tabular figures
          </Caption>
          <Body className="font-mono tabular-nums">0123456789 · $0.08–0.11 · 2,500+</Body>
        </div>
      </div>
      <TokenTable caption="Type tokens" rows={tokens.type} />
    </Block>
  );
}

// ─── Space and layout ────────────────────────────────────────────────────────

const SPACE_STEPS = [
  [1, "w-1"],
  [2, "w-2"],
  [3, "w-3"],
  [4, "w-4"],
  [6, "w-6"],
  [8, "w-8"],
  [12, "w-12"],
  [16, "w-16"],
  [24, "w-24"],
  [32, "w-32"],
] as const;

function SpaceAndLayout({ tokens }: { tokens: TokenGroups }) {
  return (
    <Block
      id="layout"
      title="Space and layout"
      note="An 8-point grid with 4-point half-steps. The page grid has 4, 8 or 12 columns, and the bento has 12 with fixed tile shapes."
    >
      <div className="flex flex-col gap-2">
        <Label>Spacing steps, in 4-pixel units</Label>
        {SPACE_STEPS.map(([step, width]) => (
          <div key={step} className="flex items-center gap-4">
            <Caption as="span" className="w-12 font-mono">
              {step}
            </Caption>
            <span className={`${width} h-2 rounded-pill bg-accent-fill`} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Label>Grid: 4 columns on phones, 8 on tablets and 12 on desktops</Label>
        <Grid>
          {Array.from({ length: 12 }, (_, i) => (
            <Cell key={i} span={{ base: 1, md: 1, lg: 1 }} className="rounded-chip bg-card py-4 text-center">
              <Caption as="span">{i + 1}</Caption>
            </Cell>
          ))}
        </Grid>
      </div>
      <div className="flex flex-col gap-4">
        <Label>Bento: 8×2, 4×2, then three 4×1 tiles</Label>
        <Bento>
          {(
            [
              [8, 2, "Flagship · 8×2"],
              [4, 2, "Tall · 4×2"],
              [4, 1, "4×1"],
              [4, 1, "4×1"],
              [4, 1, "4×1"],
            ] as const
          ).map(([span, rows, label], i) => (
            <BentoTile key={i} span={span} rows={rows} className="flex items-end rounded-card-l bg-card p-6">
              <Body className="font-semibold">{label}</Body>
            </BentoTile>
          ))}
        </Bento>
      </div>
      <div className="flex flex-col gap-4">
        <Label>Stack</Label>
        <Stack direction="row" gap={2} wrap>
          {["Python", "TypeScript", "Java", "LangGraph", "Next.js", "FastAPI"].map((skill) => (
            <Chip key={skill}>{skill}</Chip>
          ))}
        </Stack>
      </div>
      <TokenTable caption="Space and layout tokens" rows={tokens.space} />
    </Block>
  );
}

function Shapes({ tokens }: { tokens: TokenGroups }) {
  return (
    <Block id="shapes" title="Radii, elevation, materials and layers" note="Corners are continuous where the browser supports corner-shape.">
      <div className="flex flex-wrap items-end gap-6">
        {(["chip", "control", "card-s", "card-l", "pill"] as const).map((radius) => (
          <div key={radius} className="flex flex-col items-center gap-2">
            <span
              className="size-24 border border-hairline bg-card"
              style={{ borderRadius: `var(--radius-${radius})` }}
              aria-hidden="true"
            />
            <Caption as="span" className="font-mono">
              {radius}
            </Caption>
          </div>
        ))}
        <div className="flex flex-col items-center gap-2">
          <span className="size-24 rounded-card-s bg-bg shadow-soft" aria-hidden="true" />
          <Caption as="span" className="font-mono">
            shadow-soft
          </Caption>
        </div>
      </div>
      <div className="kitchen-pattern relative overflow-hidden rounded-card-l p-12">
        <div className="material-glass max-w-measure rounded-card-s p-6">
          <Title as="p">Glass</Title>
          <Body>Translucent, saturated and blurred, with a specular rim. It turns solid with reduced transparency or more contrast.</Body>
        </div>
      </div>
      <TokenTable caption="Radii" rows={tokens.radii} />
      <TokenTable caption="Materials and shadows" rows={tokens.materials} />
      <TokenTable caption="Layers, bottom to top" rows={tokens.layers} />
    </Block>
  );
}

// ─── Motion ──────────────────────────────────────────────────────────────────

const MOTION_DEMOS = [
  ["ease-out", "var(--ease-out)", "var(--duration-reveal)"],
  ["ease-in-out", "var(--ease-in-out)", "var(--duration-reveal)"],
  ["emphasized", "var(--ease-emphasized)", "var(--duration-reveal)"],
  ["spring · smooth", "var(--ease-spring-smooth)", "var(--duration-spring-smooth)"],
  ["spring · snappy", "var(--ease-spring-snappy)", "var(--duration-spring-snappy)"],
  ["spring · bouncy", "var(--ease-spring-bouncy)", "var(--duration-spring-bouncy)"],
  ["spring · island", "var(--ease-spring-island)", "var(--duration-spring-island)"],
] as const;

function Motion({ tokens }: { tokens: TokenGroups }) {
  const [played, setPlayed] = useState(false);
  return (
    <Block id="motion" title="Motion" note="Three curves and four SwiftUI-style springs. With reduced motion, the dots jump instead.">
      <div className="flex flex-col gap-4" data-played={played || undefined}>
        {MOTION_DEMOS.map(([name, ease, duration]) => (
          <div key={name} className="grid grid-cols-4 items-center gap-4 lg:grid-cols-12">
            <Caption as="span" className="col-span-4 font-mono lg:col-span-3">
              {name}
            </Caption>
            <div className="kitchen-track col-span-4 lg:col-span-9" style={{ "--demo-ease": ease, "--demo-duration": duration } as CSSProperties}>
              <span className="kitchen-dot" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
      <div>
        <Button variant="secondary" onClick={() => setPlayed((value) => !value)}>
          {played ? "Reset" : "Play"}
        </Button>
      </div>
      <TokenTable caption="Motion tokens" rows={tokens.motion} />
    </Block>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

const STATES = [
  ["Default", {}],
  ["Hover", { force: "hover" }],
  ["Focus", { force: "focus" }],
  ["Pressed", { force: "pressed" }],
  ["Disabled", { disabled: true }],
  ["Loading", { status: "loading" }],
  ["Success", { status: "success" }],
  ["Error", { status: "error" }],
] as const;

const BUTTON_LABELS = { Loading: "Sending", Success: "Sent", Error: "Try again" } as const;

function Controls() {
  const [segment, setSegment] = useState("specs");
  return (
    <Block id="controls" title="Controls" note="Every state: default, hover, focus-visible, pressed, disabled, loading, success and error.">
      {(["primary", "secondary", "link"] as const).map((variant) => (
        <div key={variant} className="flex flex-col gap-4">
          <Label>Button · {variant}</Label>
          <div className="flex flex-wrap items-center gap-4">
            {STATES.map(([state, props]) => (
              <Button key={state} variant={variant} {...props}>
                {state in BUTTON_LABELS ? BUTTON_LABELS[state as keyof typeof BUTTON_LABELS] : state}
              </Button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-4">
        <Label>Chip</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Chip>Neutral</Chip>
          <Chip tone="accent">Accent</Chip>
          <Chip as="button">Interactive</Chip>
          <Chip as="button" force="hover">
            Hover
          </Chip>
          <Chip as="button" force="focus">
            Focus
          </Chip>
          <Chip as="button" force="pressed">
            Pressed
          </Chip>
          <Chip as="button" selected>
            Selected
          </Chip>
          <Chip as="button" disabled>
            Disabled
          </Chip>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Label>SegmentedControl</Label>
        <div className="flex flex-wrap items-center gap-6">
          <SegmentedControl
            label="View"
            options={[
              { value: "specs", label: "Specs" },
              { value: "cloud", label: "Cloud" },
            ]}
            value={segment}
            onValueChange={setSegment}
          />
          <SegmentedControl
            label="Citation format"
            options={[
              { value: "apa", label: "APA" },
              { value: "ieee", label: "IEEE" },
              { value: "bibtex", label: "BibTeX" },
            ]}
            defaultValue="apa"
          />
          <SegmentedControl
            label="Filter"
            options={[
              { value: "all", label: "All" },
              { value: "ai", label: "AI" },
              { value: "ml", label: "ML" },
              { value: "soon", label: "Soon", disabled: true },
            ]}
            defaultValue="all"
          />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Label>Empty, error and success</Label>
        <Grid>
          <Cell span={{ base: 4, md: 4, lg: 4 }} className="flex flex-col gap-2 rounded-card-s bg-card p-6">
            <Body className="font-semibold">Nothing here yet.</Body>
            <Caption>An empty state says what will appear, without placeholders.</Caption>
          </Cell>
          <Cell span={{ base: 4, md: 4, lg: 4 }} className="flex items-start gap-2 rounded-card-s bg-card p-6">
            <CircleAlert aria-hidden="true" className="text-fg" />
            <Body>That didn&apos;t send. Your message is still here.</Body>
          </Cell>
          <Cell span={{ base: 4, md: 8, lg: 4 }} className="flex flex-col gap-2 rounded-card-s bg-card p-6">
            <Body className="font-semibold">Delivered.</Body>
            <Caption>Success is quiet: it confirms, then rests.</Caption>
          </Cell>
        </Grid>
      </div>
    </Block>
  );
}

function Overlays() {
  const [open, setOpen] = useState(false);
  return (
    <Block id="overlays" title="Overlays" note="The sheet is a top-layer dialog: a bottom sheet on phones, a centered card on desktop.">
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => setOpen(true)}>Open the sheet</Button>
        <Tooltip content="Search everything, with ⌘K">
          <button
            type="button"
            aria-label="Search"
            className="pressable inline-flex min-h-target min-w-target items-center justify-center rounded-pill bg-control-track text-fg"
          >
            <Search aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip content="Tooltips open on hover and on keyboard focus, and Esc closes them.">
          <Button variant="secondary">
            <Info aria-hidden="true" /> About tooltips
          </Button>
        </Tooltip>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="A sheet" description="It traps focus, closes with Esc or the backdrop, and returns focus.">
        <Body>Sheets hold one task at a time: a fact and its footnote, a citation, a case study.</Body>
        <div>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </Sheet>
    </Block>
  );
}

function Cursor() {
  return (
    <Block
      id="cursor"
      title="Cursor"
      note="The dot is the hotspot: it never trails the pointer and shows on anything. Shake the pointer to find it; rest it for three seconds and a ring pulses once."
    >
      <CursorLab />
    </Block>
  );
}

function IslandBlock({ email }: { email: string }) {
  return (
    <Block
      id="island"
      title="The Island"
      note="Activities grow the pill into a wider capsule for 2.2 seconds, one at a time, and each is announced. The same message twice in a row stays up instead of repeating."
    >
      <IslandLab email={email} />
    </Block>
  );
}

function NumbersAndFootnotes() {
  const [run, setRun] = useState(0);
  return (
    <Block id="numbers" title="Numbers and footnotes" note="Counters count once, on reveal, in at most 1.2 seconds. The final value is in the HTML from the start.">
      <div key={run} className="flex flex-wrap items-baseline gap-12">
        <Display as="p">
          <Counter value={97} suffix="%" />
        </Display>
        <Display as="p">
          <Counter value={2500} suffix="+" />
        </Display>
        <Display as="p">
          <Counter value={0.08} prefix="$" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
        </Display>
      </div>
      <div>
        <Button variant="secondary" onClick={() => setRun((value) => value + 1)}>
          Count again
        </Button>
      </div>
      <Body className="max-w-measure">
        Cartographer generates six documentation artifacts in two LLM calls.
        <FootnoteRef n={1} />
      </Body>
      <ol className="flex max-w-measure flex-col gap-2 border-t border-hairline pt-4">
        <li id="fn-1">
          <Footnote as="span">
            1. Cartographer generates 6 documentation artifacts in 2 LLM calls. United Airlines, 2026.
            <FootnoteBackLink n={1} />
          </Footnote>
        </li>
      </ol>
    </Block>
  );
}

function Reveal() {
  const [run, setRun] = useState(0);
  return (
    <Block id="resolve" title="The Resolve" note="Content arrives out of focus and resolves: lines rise through masks, one after another.">
      <div key={run} className="flex max-w-measure flex-col gap-4">
        <Resolve as="p" className="text-display">
          Intelligent systems are everywhere. Clear ones are rare.
        </Resolve>
        <Resolve split="block" as="p" className="text-lead text-fg-2">
          A block resolves whole: it rises, scales up slightly and comes into focus.
        </Resolve>
      </div>
      <div>
        <Button variant="secondary" onClick={() => setRun((value) => value + 1)}>
          Resolve again
        </Button>
      </div>
    </Block>
  );
}

function Depth() {
  return (
    <Block id="depth" title="Depth on hover" note="Cards tilt up to 6° toward the pointer under a moving highlight. Off for touch and reduced motion.">
      <Grid>
        {["Cognivault AI", "QuizMUJ"].map((name) => (
          <Cell key={name} span={{ base: 4, md: 4, lg: 6 }}>
            <TiltCard className="flex aspect-wide flex-col justify-end gap-2 rounded-card-l bg-card p-8">
              <Eyebrow>Work</Eyebrow>
              <Title as="p">{name}</Title>
            </TiltCard>
          </Cell>
        ))}
      </Grid>
    </Block>
  );
}

function TextEffects() {
  return (
    <Block id="text-effects" title="Gradient, selection and focus" note="One gradient word per section at most. Selection is the accent at 25%.">
      <Display as="p">
        Clarity, <span className="text-gradient">engineered</span>.
      </Display>
      <Lead className="max-w-measure">Select this sentence to see the selection color, the accent at a quarter strength.</Lead>
      <div className="flex flex-wrap gap-4">
        <Button force="focus">Focus ring on a pill</Button>
        <Chip as="button" force="focus">
          Focus ring on a chip
        </Chip>
      </div>
    </Block>
  );
}

function Stage() {
  const { tier, active } = useStage();
  return (
    <Block
      id="stage"
      title="The 3D stage"
      note="One fixed Canvas for the site. HIGH and MID tiers render the cube; others see its poster."
    >
      <StageView scene={TestCube} poster={<CubePoster />} label="A test cube in the finish accent" className="aspect-square w-full max-w-[calc(var(--container-measure)/2)] rounded-card-l border border-hairline" />
      <Caption>
        {tier ? `Tier ${tier}: ${active ? "rendered through the shared stage" : "showing the poster"}.` : "Detecting the tier…"}
      </Caption>
    </Block>
  );
}
