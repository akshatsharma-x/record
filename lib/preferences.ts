/**
 * Theme and finish preferences (DESIGN.md §4.2–§4.3): the names, the storage keys and the
 * script that applies them before the first paint. No React and no DOM access at import,
 * so Server Components (the root layout) can use it.
 */
export const THEME_STORAGE_KEY = "classyfolio:theme";
export const FINISH_STORAGE_KEY = "classyfolio:finish";

export const THEME_CHOICES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type Theme = "light" | "dark";

/** The finishes, like a product's colors (§4.3). */
export const FINISHES = [
  { id: "contrail", name: "Contrail" },
  { id: "pink-city", name: "Pink City" },
  { id: "saffron", name: "Saffron" },
  { id: "monsoon", name: "Monsoon" },
] as const;
export type Finish = (typeof FINISHES)[number]["id"];
export const DEFAULT_FINISH: Finish = "contrail";

const FINISH_IDS: readonly string[] = FINISHES.map((finish) => finish.id);

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

export function isFinish(value: unknown): value is Finish {
  return typeof value === "string" && FINISH_IDS.includes(value);
}

/**
 * Runs synchronously in <head>, before anything paints. ES5 and static, so a strict CSP
 * can allow it by hash (Part 16).
 */
export const PREFERENCES_SCRIPT = `(function(){var d=document.documentElement,t,f;try{t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});f=localStorage.getItem(${JSON.stringify(FINISH_STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark")t="system";var k=t;if(t==="system")k=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-theme",k);d.setAttribute("data-theme-choice",t);if(${JSON.stringify(
  FINISH_IDS,
)}.indexOf(f)>-1)d.setAttribute("data-finish",f)})()`;
