import { allSkills, publicLocation, publicationStatus, skillEvidence, venueLine } from "@/content/derive";
import type { Content } from "@/content/schema";
import { formatYearMonth } from "@/lib/dates";
import { evidenceTarget } from "@/lib/evidence";
import { SECTIONS, type SectionId } from "@/lib/sections";

/**
 * Ask's knowledge (DESIGN.md §6.3, Part 14): the site's own content, rendered as plain-text
 * documents, one per section or entity, in content's words. The model reads and cites
 * them; each citation names its document, and so its source chip. Deterministic, byte for
 * byte, so the documents stay a cached prefix (lib/ask/prompt.ts). Nothing here is
 * invented, and nothing null is rendered.
 */

/** Where a source chip goes. */
export interface AskSource {
  /** What the chip says: "Experience · United Airlines". */
  label: string;
  /** The element on the home page that it jumps to and lights up. */
  target: string;
  /** The same place from any page. */
  href: string;
}

export interface AskDocument extends AskSource {
  id: string;
  /** The document as the model reads it: plain sentences, one to a line. */
  text: string;
}

const name = (id: SectionId) => SECTIONS.find((section) => section.id === id)!.name;
const at = (section: SectionId, what?: string) => (what ? `${name(section)} · ${what}` : name(section));
const home = (target: string) => `/#${target}`;
const long = (yearMonth: string) => formatYearMonth(yearMonth, "en-US", "long");
const range = (start: string, end: string) => `${long(start)} – ${end === "present" ? "present" : long(end)}`;
const list = (items: readonly string[]) => items.join(", ");
const lines = (...parts: (string | null | undefined | false)[]) => parts.filter((part): part is string => Boolean(part)).join("\n");

/** The sources Search's own entries point to, so its fallback answers carry the same chips. */
export function entrySource(content: Content, id: string): AskSource | null {
  const [kind, key] = id.split(":") as [string, string];
  if (kind === "section") return { label: name(key as SectionId), target: key, href: home(key) };
  if (kind === "role") {
    const role = content.experience.find((entry) => entry.id === key);
    // The current project has an entry of its own; it lives in its role.
    const building = content.experience.find((entry) => entry.id === content.currentFocus.building.experience);
    const owner = role ?? building;
    if (!owner) return null;
    return { label: at("experience", owner.org), target: evidenceTarget("role", owner.id), href: home(evidenceTarget("role", owner.id)) };
  }
  if (kind === "work") {
    const project = content.projects.find((entry) => entry.slug === key);
    return project ? { label: at("work", project.name), target: evidenceTarget("project", project.slug), href: `/work/${project.slug}` } : null;
  }
  if (kind === "paper") {
    const paper = content.publications.find((entry) => entry.slug === key);
    return paper ? { label: at("research", paper.short), target: evidenceTarget("paper", paper.slug), href: `/research/${paper.slug}` } : null;
  }
  if (kind === "skill") return { label: name("skills"), target: "skills", href: home("skills") };
  if (kind === "education") {
    const degree = content.education.find((entry) => entry.kind === "degree");
    return { label: at("credentials", "Education"), target: degree ? `pass-${degree.id}` : "credentials", href: home("credentials") };
  }
  if (kind === "honor") {
    const honor = content.achievements.find((entry) => entry.id === key);
    return honor ? { label: at("credentials", honor.title), target: `medal-${honor.id}`, href: home("credentials") } : null;
  }
  if (kind === "certificate") {
    const certificate = content.certificates.find((entry) => entry.id === key);
    return certificate ? { label: at("credentials", certificate.title), target: `pass-${certificate.id}`, href: home("credentials") } : null;
  }
  return null;
}

/** Every document, in a fixed order: who Akshat is, the work, the research, the projects, the skills, credentials, contact, the site. */
export function askDocuments(content: Content): AskDocument[] {
  const { profile, currentFocus } = content;
  const location = publicLocation(content);
  const degree = content.education.find((entry) => entry.kind === "degree");
  const conferences = new Map(content.conferences.map((conference) => [conference.id, conference]));
  const docs: AskDocument[] = [];

  docs.push({
    id: "about",
    label: name("about"),
    target: "about",
    href: home("about"),
    text: lines(
      `${profile.name} is an ${profile.role}.`,
      `Headline: ${profile.headline}`,
      ...profile.bio.map((paragraph) => paragraph.text),
      `Based in ${location.place} (${location.timeZoneLabel}).`,
      degree ? `Studying ${degree.degree} in ${degree.field} at ${degree.institution}, graduating ${long(degree.end)}.` : null,
      `Currently building ${currentFocus.building.name}: ${currentFocus.building.detail}.`,
      currentFocus.researching ? `Currently researching ${currentFocus.researching}.` : null,
      currentFocus.reading ? `Currently reading ${currentFocus.reading}.` : null,
    ),
  });

  for (const role of content.experience) {
    const target = evidenceTarget("role", role.id);
    docs.push({
      id: `role:${role.id}`,
      label: at("experience", role.org),
      target,
      href: home(target),
      text: lines(
        `${profile.name}: ${role.role} at ${role.org} (${role.kind}), ${range(role.start, role.end)}${role.end === "present" ? ", the current role" : ""}.`,
        role.location ? `Location: ${role.location}.` : null,
        role.summary.text,
        ...role.bullets.map((bullet) => bullet.text),
        role.stack.length > 0 ? `Stack: ${list(role.stack)}.` : null,
        role.confidential ? "The work is internal, so the portfolio shows only what the résumé says." : null,
      ),
    });
  }

  for (const paper of content.publications) {
    const conference = conferences.get(paper.presentedAt);
    const target = evidenceTarget("paper", paper.slug);
    docs.push({
      id: `paper:${paper.slug}`,
      label: at("research", paper.short),
      target,
      href: `/research/${paper.slug}`,
      text: lines(
        `Paper by ${profile.name}: ${paper.title}.`,
        `Status: ${publicationStatus(paper, conference).label}.`,
        conference ? `Venue: ${venueLine(conference)}.` : null,
        `In short: ${paper.tldr}`,
        `Keywords: ${list(paper.keywords)}.`,
        paper.coAuthors ? `Co-authors: ${list(paper.coAuthors)}.` : null,
        paper.abstract ? `Abstract: ${paper.abstract}` : null,
        paper.doi ? `DOI: ${paper.doi}.` : null,
      ),
    });
  }

  for (const project of content.projects) {
    const target = evidenceTarget("project", project.slug);
    docs.push({
      id: `work:${project.slug}`,
      label: at("work", project.name),
      target,
      href: `/work/${project.slug}`,
      text: lines(
        `Project by ${profile.name}: ${project.name}, ${project.tagline.text.charAt(0).toLowerCase()}${project.tagline.text.slice(1)}.`,
        `Category: ${project.category}.`,
        project.summary.text,
        project.stack ? `Stack: ${list(project.stack)}.` : null,
        project.outcome ? `Outcome: ${project.outcome.text}` : null,
        project.year ? `Year: ${project.year}.` : null,
        project.role ? `Role: ${project.role}.` : null,
      ),
    });
  }

  const skills = allSkills(content);
  const categories = [...new Set(skills.map((skill) => skill.category))];
  const used = skillEvidence(content).filter((skill) => skill.roles.length + skill.projects.length + skill.papers.length > 0);
  docs.push({
    id: "skills",
    label: name("skills"),
    target: "skills",
    href: home("skills"),
    text: lines(
      `${profile.name}'s skills, by category.`,
      ...categories.map((category) => `${category}: ${list(skills.filter((skill) => skill.category === category).map((skill) => skill.label))}.`),
      "Where the portfolio's own text names each skill:",
      ...used.map((skill) => `${skill.label}: ${list([...skill.roles, ...skill.projects, ...skill.papers].map((hit) => hit.title))}.`),
    ),
  });

  if (degree) {
    const schools = content.education.filter((entry) => entry.kind === "school");
    docs.push({
      id: "education",
      label: at("credentials", "Education"),
      target: `pass-${degree.id}`,
      href: home("credentials"),
      text: lines(
        `${degree.degree} in ${degree.field} at ${degree.institution}, ${range(degree.start, degree.end)}.`,
        `Grade: ${degree.grade.text}.`,
        degree.coursework.length > 0 ? `Coursework: ${list(degree.coursework)}.` : null,
        ...schools.map((school) => (school.kind === "school" ? `${school.level} (${school.board}): ${school.grade.text}, ${school.year}.` : null)),
      ),
    });
  }

  for (const honor of content.achievements) {
    docs.push({
      id: `honor:${honor.id}`,
      label: at("credentials", honor.title),
      target: `medal-${honor.id}`,
      href: home("credentials"),
      text: lines(
        `Honor: ${honor.title}${honor.org ? `, from ${honor.org}` : ""}, ${honor.years.join(" and ")}.`,
        honor.detail ? honor.detail.text : null,
      ),
    });
  }

  for (const certificate of content.certificates) {
    docs.push({
      id: `certificate:${certificate.id}`,
      label: at("credentials", certificate.title),
      target: `pass-${certificate.id}`,
      href: home("credentials"),
      text: lines(
        `Certificate: ${certificate.title}, from ${certificate.issuer}.`,
        certificate.skills.length > 0 ? `Skills covered: ${list(certificate.skills)}.` : null,
        certificate.proves ? `What it proves: ${certificate.proves}` : null,
      ),
    });
  }

  docs.push({
    id: "contact",
    label: name("contact"),
    target: "contact",
    href: home("contact"),
    text: lines(
      `To get in touch with ${profile.name}, write from the message form in the Contact section of this site, or by email at ${profile.email}.`,
      // No full stop after an address: it would read as part of it.
      `LinkedIn: ${profile.links.linkedin}`,
      `GitHub: ${profile.links.github}`,
      `Working hours: ${profile.workingHours.start}–${profile.workingHours.end} ${location.timeZoneLabel}, in ${location.place}.`,
      profile.availability ? `Availability: ${profile.availability}` : null,
      "The portfolio publishes no phone number.",
    ),
  });

  docs.push({
    id: "colophon",
    label: content.copy.footer.pages.colophon,
    target: "colophon",
    href: "/colophon",
    text: lines(
      "How this portfolio site is built.",
      // Its items have commas of their own.
      ...content.copy.colophon.rows.map((row) => `${row.label}: ${row.items.join("; ")}.`),
      `${content.copy.colophon.accessibility.label}: ${content.copy.colophon.accessibility.statement.join(" ")}`,
      `${content.copy.colophon.accessibility.gaps.label}: ${content.copy.colophon.accessibility.gaps.items.join(" ")}`,
    ),
  });

  return docs;
}
