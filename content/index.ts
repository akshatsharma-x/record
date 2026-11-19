/**
 * The validated content. Importing it parses content/data.ts, so a schema error throws
 * here with every bad field named, in `next dev` and in `next build` alike.
 */
import { data } from "./data.ts";
import { measured } from "./measured.ts";
import { parseContent, parseMeasurement } from "./schema.ts";

export const content = parseContent(data);

/** Lighthouse's latest measurement of the site (content/measured.ts), or null before the first. */
export const measurement = parseMeasurement(measured);

export type {
  Achievement,
  Certificate,
  Claim,
  Content,
  Degree,
  Education,
  Experience,
  Highlight,
  Measurement,
  Project,
  Publication,
  Skill,
} from "./schema.ts";
