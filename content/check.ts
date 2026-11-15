/**
 * The build-time content check. `npm run build` runs it first (prebuild) with plain Node:
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON content/check.ts
 *
 * A schema error fails the build and names each bad field. Warnings print but don't fail.
 */
import { data } from "./data.ts";
import { counts, gaps, warnings } from "./derive.ts";
import { ContentError, parseContent } from "./schema.ts";

try {
  const content = parseContent(data);
  const c = counts(content);
  console.log(
    `✓ Content is valid: ${c.internships} internships · ${c.papers} papers · ${c.projects} projects · ` +
      `${c.skills} skills · ${c.certificates} certificates · ${c.achievements} achievements`,
  );
  const list = warnings(content);
  if (list.length > 0) {
    console.warn(`⚠ ${list.length} content warnings (these don't fail the build):`);
    for (const warning of list) console.warn(`  · ${warning.path}: ${warning.message}`);
  }
  console.log(`  ${gaps(content).length} gaps are marked TODO(akshat). Proofread them at /dev/content.`);
} catch (error) {
  if (error instanceof ContentError) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  throw error;
}
