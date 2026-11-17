"use client";

import dynamic from "next/dynamic";

/** The live lines load after the page is up (DESIGN.md §10): only the browser can fill them in anyway. */
export const LazyContactClock = dynamic(() => import("./contact-clock").then((module) => module.ContactClock), {
  ssr: false,
  loading: () => <p className="contact-clock" aria-hidden="true" />,
});
