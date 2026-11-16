/**
 * Where a role, project or paper is (DESIGN.md §7.7): the id its section gives it on the
 * home page, for "Show me where" to light up and jump to, and the page to read about it.
 *
 * Runs under plain Node for content/derive.ts: no path aliases.
 */
export type EvidenceKind = "role" | "project" | "paper";

/** The element on the home page: the role's panel title in the edit, the project's tile, the paper's chapter. */
export function evidenceTarget(kind: EvidenceKind, id: string): string {
  if (kind === "project") return `work-${id}-title`;
  return `${id}-title`;
}

/** Where to read about it: the role in the edit, the case study, the paper's page. */
export function evidenceHref(kind: EvidenceKind, id: string): string {
  if (kind === "role") return `/#${evidenceTarget(kind, id)}`;
  if (kind === "project") return `/work/${id}`;
  return `/research/${id}`;
}
