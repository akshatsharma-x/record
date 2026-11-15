/**
 * The validated content. Importing it parses content/data.ts, so a schema error throws
 * here with every bad field named, in `next dev` and in `next build` alike.
 */
import { data } from "./data.ts";
import { parseContent } from "./schema.ts";

export const content = parseContent(data);

export type {
  Achievement,
  Certificate,
  Claim,
  Content,
  Degree,
  Education,
  Experience,
  Highlight,
  Project,
  Publication,
  Skill,
} from "./schema.ts";
