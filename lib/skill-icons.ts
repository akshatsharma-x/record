/**
 * The skills' logos (DESIGN.md §4.10): Simple Icons (CC0), in monochrome, by the slug
 * content gives a skill. They're one sprite (app/skill-icons.svg, made from the package's
 * SVG files at build time), so the logos are a cached file the cloud and the core tiles
 * reference, not markup in every page, and the package's thousands of logos never reach a
 * bundle.
 */
export const SKILL_ICONS_URL = "/skill-icons.svg";
