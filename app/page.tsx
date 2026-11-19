import type { Metadata } from "next";
import { About } from "@/components/about/about";
import { Contact } from "@/components/contact/contact";
import { Credentials } from "@/components/credentials/credentials";
import { backKey, fieldKey, type PassMarks } from "@/components/credentials/pass";
import { Statement } from "@/components/about/statement";
import { type EditMarks, Experience } from "@/components/experience/experience";
import { Footer } from "@/components/footer/footer";
import { Hero } from "@/components/hero/hero";
import { Highlights } from "@/components/highlights/highlights";
import { Research } from "@/components/research/research";
import { Skills } from "@/components/skills/skills";
import { Work, type WorkMarks } from "@/components/work/work";
import { JsonLd } from "@/components/seo/json-ld";
import { FootnoteRef } from "@/components/ui/type";
import { content } from "@/content";
import { edit, medals, wallet, work } from "@/content/derive";
import type { Claim } from "@/content/schema";
import { portraitFor } from "@/lib/portrait-fixture";
import { pageMetadata } from "@/lib/site";
import { person } from "@/lib/structured-data";

/**
 * The story (DESIGN.md §3.1), in order. Part 4 laid down its structure so the Island and
 * Search have somewhere to go: every section with its id, surface and real copy, plainly
 * set. Parts 5–12 turn each one into its signature moment (§7): the hero is Part 5's, the
 * statement, About and the highlights Part 6's, the edit Part 7's, research Part 8's, the
 * work bento Part 9's, the chip Part 10's, the wallet and the medals Part 11's, and the
 * close, the dock, the thread and the footer Part 12's.
 */
/** The home page's canonical address and share card, as a person's profile (lib/site.ts). */
export const metadata: Metadata = pageMetadata({ path: "/", title: content.profile.name, description: content.profile.headline, type: "profile" });

export default function Home() {
  const { profile, highlights } = content;

  // Footnotes are numbered by content; each mention gets its own back-link (§9).
  const mentions = new Map<number, number>();
  const marks = (footnotes: readonly number[]) =>
    footnotes.map((n) => {
      const occurrence = (mentions.get(n) ?? 0) + 1;
      mentions.set(n, occurrence);
      return <FootnoteRef key={n} n={n} occurrence={occurrence} />;
    });
  const cite = (claim: { text: string; footnotes?: readonly number[] } | Claim) => (
    <>
      {claim.text}
      {marks(claim.footnotes ?? [])}
    </>
  );
  // The edit's panels cite each note once per panel, on the metrics it backs.
  const editMarks = (): EditMarks =>
    Object.fromEntries(
      edit(content).panels.map((panel) => [
        panel.id,
        panel.kind === "role"
          ? panel.groups.map((group) => <>{marks(group.footnotes)}</>)
          : panel.kind === "honor" && panel.detail
            ? [<>{marks(panel.detail.footnotes)}</>]
            : [],
      ]),
    );

  // Each tile cites a note once, on its top metric or else its tagline.
  const workMarks = (): WorkMarks =>
    Object.fromEntries(
      work(content).tiles.map((tile) => [
        tile.slug,
        <>{marks([...new Set([...tile.tagline.footnotes, ...(tile.metric?.footnotes ?? [])])])}</>,
      ]),
    );

  // The wallet's grades and the medals' details cite their notes where they're stated.
  const credentialsMarks = (): PassMarks => {
    const cited: PassMarks = {};
    for (const pass of wallet(content).passes) {
      pass.fields.forEach((field, i) => {
        if (field.footnotes.length > 0) cited[fieldKey(pass.id, i)] = <>{marks(field.footnotes)}</>;
      });
      pass.back.forEach((section, i) => {
        if (section.kind === "text" && section.footnotes.length > 0) cited[backKey(pass.id, i)] = <>{marks(section.footnotes)}</>;
      });
    }
    for (const medal of medals(content)) {
      if (medal.description?.footnotes.length) cited[medal.id] = <>{marks(medal.description.footnotes)}</>;
    }
    return cited;
  };

  const story = (
    <>
      <Hero photo={portraitFor(profile.photo)} />

      <Statement />
      <About bio={profile.bio.map((paragraph) => cite(paragraph))} />
      <Highlights texts={highlights.map((highlight) => cite(highlight))} />

      <Experience marks={editMarks()} />

      <Research />

      <Work marks={workMarks()} />

      <Skills />

      <Credentials marks={credentialsMarks()} />

      <Contact />
    </>
  );

  // Rendered after the story, so every mention has been counted.
  const cited = content.footnotes
    .filter((note) => mentions.has(note.id))
    .map((note) => ({ id: note.id, note: note.note, source: note.source ?? null, mentions: mentions.get(note.id) ?? 0 }));
  return (
    <>
      <JsonLd data={person(content)} />
      <main>{story}</main>
      <Footer notes={cited} />
    </>
  );
}
