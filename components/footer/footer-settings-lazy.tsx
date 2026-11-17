"use client";

import dynamic from "next/dynamic";

/**
 * The footer's settings load after the page is up, not with it (DESIGN.md §10): they're at
 * the very end, and each needs JavaScript to do anything. Their space is kept meanwhile.
 */
export const LazyFooterSettings = dynamic(() => import("./footer-settings").then((module) => module.FooterSettings), {
  ssr: false,
  loading: () => <div className="footer-settings" data-loading="" aria-hidden="true" />,
});
