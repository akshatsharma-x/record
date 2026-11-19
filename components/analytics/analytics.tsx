"use client";

import { track } from "@vercel/analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSurface } from "@/lib/stores/surface";

/**
 * Vercel Web Analytics (DESIGN.md §2 rule 2, §11; Part 16): cookieless page views and a
 * handful of events, none of them holding anything a visitor wrote. Two are counted here:
 * each section reached, once a page view, and each case study opened, in its sheet or on its
 * own page. "Message sent" and "Ask used" are counted where they happen
 * (lib/contact-behavior.ts, components/search/use-ask.ts).
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    const study = /^\/work\/([\w-]+)$/.exec(pathname);
    if (study) track("Case study opened", { project: study[1] });
  }, [pathname]);

  useEffect(() => {
    const reached = new Set<string>();
    const report = (section: string | null) => {
      if (!section || reached.has(section)) return;
      reached.add(section);
      track("Section reached", { section });
    };
    report(useSurface.getState().section);
    return useSurface.subscribe((state) => report(state.section));
  }, [pathname]);

  return <VercelAnalytics />;
}
