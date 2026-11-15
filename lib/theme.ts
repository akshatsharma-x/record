/**
 * Switching the theme and finish at runtime (client only). The choice lives in
 * localStorage (no cookies, §2 rule 2); lib/preferences.ts applies it before first paint.
 */
import { cssCurve, durations } from "./motion.ts";
import type { Finish, Theme, ThemeChoice } from "./preferences.ts";
import { DEFAULT_FINISH, FINISH_STORAGE_KEY, isFinish, isThemeChoice, THEME_STORAGE_KEY } from "./preferences.ts";
import { prefersReducedMotion } from "./reduced-motion.ts";

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(choice: ThemeChoice): Theme {
  return choice === "system" ? systemTheme() : choice;
}

/** What the document shows right now. */
export function readPreferences(): { themeChoice: ThemeChoice; theme: Theme; finish: Finish } {
  const root = document.documentElement;
  const choice = root.getAttribute("data-theme-choice");
  const finish = root.getAttribute("data-finish");
  return {
    themeChoice: isThemeChoice(choice) ? choice : "system",
    theme: root.getAttribute("data-theme") === "dark" ? "dark" : "light",
    finish: isFinish(finish) ? finish : DEFAULT_FINISH,
  };
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage off: the choice lasts for this page only.
  }
}

export interface Origin {
  x: number;
  y: number;
}

/**
 * Switches the theme. With View Transitions, the new theme is revealed in a circle that
 * grows from `origin`; without them, colors crossfade over 200ms; with reduced motion,
 * the switch is instant.
 */
export function applyThemeChoice(choice: ThemeChoice, origin?: Origin): Promise<void> {
  store(THEME_STORAGE_KEY, choice);
  const root = document.documentElement;
  const theme = resolveTheme(choice);
  const apply = () => {
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-choice", choice);
  };

  if (root.getAttribute("data-theme") === theme || prefersReducedMotion()) {
    apply();
    return Promise.resolve();
  }

  if (typeof document.startViewTransition === "function") {
    const center = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    root.setAttribute("data-theme-switching", "");
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        const radius = Math.hypot(
          Math.max(center.x, window.innerWidth - center.x),
          Math.max(center.y, window.innerHeight - center.y),
        );
        root.animate(
          {
            clipPath: [
              `circle(0px at ${center.x}px ${center.y}px)`,
              `circle(${radius}px at ${center.x}px ${center.y}px)`,
            ],
          },
          { duration: durations.uiLong, easing: cssCurve("inOut"), pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => undefined);
    return transition.finished
      .catch(() => undefined)
      .finally(() => root.removeAttribute("data-theme-switching"));
  }

  root.setAttribute("data-theme-fading", "");
  apply();
  return new Promise((resolve) =>
    window.setTimeout(() => {
      root.removeAttribute("data-theme-fading");
      resolve();
    }, durations.micro),
  );
}

/** Switches the finish. The accent, focus rings, selection and gradients follow at once. */
export function applyFinish(finish: Finish): void {
  store(FINISH_STORAGE_KEY, finish);
  document.documentElement.setAttribute("data-finish", finish);
}
