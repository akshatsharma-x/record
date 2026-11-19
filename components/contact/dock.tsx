import { FileText, Mail } from "lucide-react";
import { content } from "@/content";
import { SKILL_ICONS_URL } from "@/lib/skill-icons";
import { resumeEdition } from "@/lib/surprises/resume-edition";

interface DockApp {
  id: "email" | "linkedin" | "github" | "resume";
  label: string;
  href: string;
  /** Opens elsewhere: LinkedIn and GitHub, in a new tab. */
  external?: boolean;
  download?: boolean;
  /** Prints the page's résumé edition, which needs JavaScript, so it's hidden without. */
  print?: boolean;
}

/** Each app's tile: its glyph on its own color, as a dock's icons are. */
function Tile({ id }: { id: DockApp["id"] }) {
  switch (id) {
    case "email":
      return <Mail aria-hidden="true" className="dock-glyph" />;
    case "linkedin":
      // LinkedIn isn't in Simple Icons, so it gets a monogram, as the skills cloud does. It's
      // drawn by CSS, not written in the DOM, so the cursor stays a dot over it, not a caret.
      return <span aria-hidden="true" className="dock-monogram" data-letters="in" />;
    case "github":
      return (
        <svg aria-hidden="true" className="dock-glyph dock-logo" viewBox="0 0 24 24">
          <use href={`${SKILL_ICONS_URL}#github`} />
        </svg>
      );
    case "resume":
      return <FileText aria-hidden="true" className="dock-glyph" />;
  }
}

/**
 * The dock (DESIGN.md §7.9): Email, LinkedIn and GitHub, and the résumé, on a glass shelf:
 * a download once a phone-free PDF exists (§2 rule 2), until then the print edition, which
 * is phone-free already (Part 17: a recruiter couldn't find it). Each is a link that works without
 * JavaScript; the behavior adds the magnification, the launch bounce, and Email's copy
 * (lib/contact-behavior.ts). Its label is its name, shown as a tooltip on hover and focus.
 */
export function Dock() {
  const { profile, copy } = content;
  const words = copy.contact.dock;
  const apps: DockApp[] = [
    { id: "email", label: words.email, href: `mailto:${profile.email}` },
    { id: "linkedin", label: words.linkedin, href: profile.links.linkedin, external: true },
    { id: "github", label: words.github, href: profile.links.github, external: true },
    ...(profile.resumePdf
      ? [{ id: "resume" as const, label: words.resume, href: profile.resumePdf, download: true }]
      : resumeEdition.on
        ? [{ id: "resume" as const, label: words.resume, href: "#contact", print: true }]
        : []),
  ];
  return (
    <nav className="dock" aria-label={words.label} data-copied={words.copied} data-not-copied={words.notCopied} data-open-mail={words.openMail}>
      <span className="dock-glass" aria-hidden="true" />
      <ul className="dock-items">
        {apps.map((app) => (
          <li key={app.id} className={app.print ? "dock-slot needs-js" : "dock-slot"}>
            <a
              className="dock-item"
              data-app={app.id}
              href={app.href}
              {...(app.external ? { target: "_blank", rel: "noopener" } : {})}
              {...(app.download ? { download: "" } : {})}
              {...(app.id === "email" ? { "data-email": profile.email } : {})}
              {...(app.print ? { "data-print": "" } : {})}
              data-cursor="default"
            >
              <span className="dock-tile">
                <Tile id={app.id} />
              </span>
              <span className="dock-label">{app.label}</span>
              <span className="dock-dot" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
