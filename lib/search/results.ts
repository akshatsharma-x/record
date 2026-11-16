import { type Prepared, rank, type Searchable } from "./match.ts";
import type { SearchEntry } from "./types.ts";

/**
 * How Search arranges matches (DESIGN.md §6.3): one Top hit, then groups in a fixed order.
 * Roles and projects are both Work. Education, honors and certificates get a Credentials
 * group of their own, because none of the others fits them.
 */
export type GroupId = "sections" | "work" | "research" | "skills" | "credentials" | "actions";

export const GROUPS: readonly { id: GroupId; name: string; limit: number }[] = [
  { id: "sections", name: "Sections", limit: 9 },
  { id: "work", name: "Work", limit: 6 },
  { id: "research", name: "Research", limit: 4 },
  { id: "skills", name: "Skills", limit: 6 },
  { id: "credentials", name: "Credentials", limit: 4 },
  { id: "actions", name: "Actions", limit: 8 },
];

export type Kind = SearchEntry["kind"] | "action";

export function groupOf(kind: Kind): GroupId {
  switch (kind) {
    case "section":
      return "sections";
    case "role":
    case "work":
      return "work";
    case "paper":
      return "research";
    case "skill":
      return "skills";
    case "education":
    case "honor":
    case "certificate":
      return "credentials";
    case "action":
      return "actions";
  }
}

export interface Item extends Searchable {
  kind: Kind;
  /** Only shown when the query asks for it. */
  quiet?: boolean;
  /** Shown when nothing is typed yet. */
  suggested?: boolean;
}

export interface Composed<T extends Item> {
  top: T | null;
  groups: { id: GroupId; name: string; items: T[] }[];
}

/** A match must score at least this well to be the Top hit. */
export const TOP_HIT = 0.4;

export function compose<T extends Item>(items: readonly Prepared<T>[], query: string): Composed<T> {
  const typed = query.trim();
  let ordered: T[];
  let top: T | null = null;
  if (!typed) {
    ordered = items.map((prepared) => prepared.item).filter((item) => item.suggested);
  } else {
    const hits = rank(items, typed);
    if (hits[0] && hits[0].score >= TOP_HIT) top = hits[0].item;
    ordered = hits.map((hit) => hit.item).filter((item) => item !== top);
  }
  const groups = GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    items: ordered.filter((item) => groupOf(item.kind) === group.id && (typed || !item.quiet)).slice(0, group.limit),
  })).filter((group) => group.items.length > 0);
  return { top, groups };
}
