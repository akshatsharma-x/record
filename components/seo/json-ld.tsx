/**
 * Structured data in the page (DESIGN.md §10, Part 16; lib/structured-data.ts), as Next's
 * JSON-LD guide writes it: a script of type application/ld+json, which browsers never run,
 * so the CSP has nothing to allow. "<" is escaped, so no string in it can close the script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
