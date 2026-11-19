"use client";

import dynamic from "next/dynamic";

/** The analytics (./analytics.tsx), in a chunk of their own, after the page: nothing on the first load waits for them. */
const Analytics = dynamic(() => import("./analytics"), { ssr: false });

export function LazyAnalytics() {
  return <Analytics />;
}
