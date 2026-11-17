import Link from "next/link";
import { Fragment } from "react";
import { Container, Section } from "@/components/ui/layout";
import { Footnote, FootnoteBackLink } from "@/components/ui/type";
import { content } from "@/content";
import { SECTIONS } from "@/lib/sections";
import { LazyFooterSettings } from "./footer-settings-lazy";
import { LiveYear } from "./live-year";

const nameOf = (id: (typeof SECTIONS)[number]["id"]) => SECTIONS.find((section) => section.id === id)!.name;

/** A cited note and how many times the page mentions it, each mention with its own ↩. */
export interface CitedNote {
  id: number;
  note: string;
  source: string | null;
  mentions: number;
}

/**
 * The footer (DESIGN.md §7.9): the notes, numbered as content numbers them, each with a ↩ back
 * to every place that cites it; a small site map; the settings; and the small print, with
 * the live year.
 */
export function Footer({ notes }: { notes: readonly CitedNote[] }) {
  const words = content.copy.footer;
  const map = [
    { label: nameOf("top"), href: "/#top" },
    { label: nameOf("work"), href: "/#work" },
    { label: nameOf("research"), href: "/#research" },
    { label: words.pages.specs, href: "/specs" },
    { label: words.pages.colophon, href: "/colophon" },
  ];
  return (
    <Section as="footer" id="footer" surface="light-alt" className="footer" aria-label="Notes and credits">
      <Container className="footer-body">
        {notes.length > 0 ? (
          <section className="footer-notes" aria-labelledby="footer-notes-title">
            <h2 className="footer-title" id="footer-notes-title">
              {words.notes}
            </h2>
            <ol className="footer-note-list">
              {notes.map((note) => (
                <li key={note.id} id={`fn-${note.id}`} className="footer-note">
                  <Footnote as="span">
                    <span className="footer-note-number">{note.id}.</span> {note.note}
                    {note.source ? ` ${note.source}` : null}
                    {Array.from({ length: note.mentions }, (_, index) => (
                      <Fragment key={index}>
                        <FootnoteBackLink n={note.id} occurrence={index + 1} total={note.mentions} />
                      </Fragment>
                    ))}
                  </Footnote>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <div className="footer-columns">
          <nav className="footer-map" aria-labelledby="footer-map-title">
            <h2 className="footer-title" id="footer-map-title">
              {words.map}
            </h2>
            <ul className="footer-map-list">
              {map.map((page) => (
                <li key={page.href}>
                  <Link className="footer-link" href={page.href}>
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <section className="footer-settings-block" aria-labelledby="footer-settings-title">
            <h2 className="footer-title" id="footer-settings-title">
              {words.settings}
            </h2>
            <LazyFooterSettings />
          </section>
        </div>
        <div className="footer-fine">
          <p>{words.cookies}</p>
          <p>{words.credit}</p>
          <p>
            <LiveYear template={words.copyright} />
          </p>
        </div>
      </Container>
    </Section>
  );
}
