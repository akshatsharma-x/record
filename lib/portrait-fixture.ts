import type { Portrait } from "../content/schema.ts";

/**
 * The stand-in portrait (scripts/portrait-fixture.mjs) as content, for building and
 * testing the hero's portrait edition until Akshat's photo exists. Only /dev/hero and
 * builds made with CLASSYFOLIO_PORTRAIT_FIXTURE=1 (Lighthouse runs) use it.
 */
export const PORTRAIT_FIXTURE: Portrait = {
  alt: "A stand-in studio portrait: a figure in a dark sweater, lit softly from the left.",
  subject: { src: "/_fixtures/portrait/subject.png", width: 2400, height: 3200 },
  plate: { src: "/_fixtures/portrait/plate.png", width: 2400, height: 3200 },
  headTop: 0.175,
};

/** The portrait the home page uses: Akshat's, or the stand-in for fixture builds. */
export function portraitFor(photo: Portrait | null): Portrait | null {
  return photo ?? (process.env.CLASSYFOLIO_PORTRAIT_FIXTURE === "1" ? PORTRAIT_FIXTURE : null);
}
