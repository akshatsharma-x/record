/**
 * Every surprise (DESIGN.md §8), in the order /colophon lists them: section by section, then
 * Search's, then the site's own. Each is a file of its own in this folder.
 */
import { heroLens } from "./hero-lens.ts";
import { devanagariName } from "./devanagari-name.ts";
import { glanceFlips } from "./glance-flips.ts";
import { editShuttle } from "./edit-shuttle.ts";
import { clearSkies } from "./clear-skies.ts";
import { coreRipple } from "./core-ripple.ts";
import { showMeWhere } from "./show-me-where.ts";
import { medalGlint } from "./medal-glint.ts";
import { dockBounce } from "./dock-bounce.ts";
import { delivered } from "./delivered.ts";
import { commandHello } from "./command-hello.ts";
import { command941 } from "./command-941.ts";
import { commandSudo } from "./command-sudo.ts";
import { commandCompare } from "./command-compare.ts";
import { commandRetro } from "./command-retro.ts";
import { commandClarity } from "./command-clarity.ts";
import { designGrid } from "./design-grid.ts";
import { focusMode } from "./focus-mode.ts";
import { resumeEdition } from "./resume-edition.ts";
import { consoleHello } from "./console-hello.ts";
import { comparePage } from "./compare-page.ts";
import { notFound } from "./not-found.ts";
import type { Surprise } from "./define.ts";

export const SURPRISES: readonly Surprise[] = [
  heroLens,
  devanagariName,
  glanceFlips,
  editShuttle,
  clearSkies,
  coreRipple,
  showMeWhere,
  medalGlint,
  dockBounce,
  delivered,
  commandHello,
  command941,
  commandSudo,
  commandCompare,
  commandRetro,
  commandClarity,
  designGrid,
  focusMode,
  resumeEdition,
  consoleHello,
  comparePage,
  notFound,
];

export type SurpriseId = (typeof SURPRISES)[number]["id"];
