/**
 * The home page's sections in story order (DESIGN.md §3.1). `nav` marks the seven Island
 * links (§3.3). DESIGN.md doesn't say which anchor "Overview" points to; #top is the
 * provisional reading until Part 4 builds the Island.
 *
 * Runs under plain Node for the prebuild content check: no path aliases.
 */
export const SECTIONS = [
  { id: "top", name: "Overview", nav: true },
  { id: "about", name: "About", nav: false },
  { id: "highlights", name: "Highlights", nav: false },
  { id: "experience", name: "Experience", nav: true },
  { id: "research", name: "Research", nav: true },
  { id: "work", name: "Work", nav: true },
  { id: "skills", name: "Skills", nav: true },
  { id: "credentials", name: "Credentials", nav: true },
  { id: "contact", name: "Contact", nav: true },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const SECTION_IDS = SECTIONS.map((section) => section.id) as [SectionId, ...SectionId[]];
