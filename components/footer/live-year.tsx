"use client";

import { useNow } from "@/lib/use-now";

/**
 * The © line with the live year (DESIGN.md §7.9): the visitor's year, filled in after
 * hydration, so the HTML never holds a stale one. Before that, and without JavaScript, the
 * line reads without a year.
 */
export function LiveYear({ template }: { template: string }) {
  const now = useNow();
  const [before, after] = template.split("{year}");
  return (
    <>
      {before}
      {now ? (
        <span data-live="">
          {now.getFullYear()}
          {after}
        </span>
      ) : (
        after.trimStart()
      )}
    </>
  );
}
