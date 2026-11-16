/**
 * The index links to /work/[slug] and /research/[slug], which arrive in Parts 9 and 8.
 * Until each page exists, its entries point at the home section that lists them, so no
 * search result leads to a 404. tests/unit/search.test.ts checks every link resolves.
 */
const PENDING: readonly [prefix: string, section: string][] = [
  ["/work/", "/#work"],
  ["/research/", "/#research"],
];

export function liveHref(href: string): string {
  for (const [prefix, section] of PENDING) if (href.startsWith(prefix)) return section;
  return href;
}
