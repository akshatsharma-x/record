"use client";

import { useEffect } from "react";
import { FINISH_STORAGE_KEY, isFinish, isThemeChoice, THEME_STORAGE_KEY } from "@/lib/preferences";
import { usePreferences } from "@/lib/stores/preferences";
import { resolveTheme } from "@/lib/theme";

/**
 * Keeps the preferences store in step with the document after hydration, follows the
 * system theme when the choice is "system", and picks up changes made in other tabs.
 */
export function PreferencesSync() {
  useEffect(() => {
    const root = document.documentElement;
    const { sync } = usePreferences.getState();
    sync();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (root.getAttribute("data-theme-choice") !== "system") return;
      root.setAttribute("data-theme", resolveTheme("system"));
      sync();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        const choice = isThemeChoice(event.newValue) ? event.newValue : "system";
        root.setAttribute("data-theme-choice", choice);
        root.setAttribute("data-theme", resolveTheme(choice));
        sync();
      } else if (event.key === FINISH_STORAGE_KEY && isFinish(event.newValue)) {
        root.setAttribute("data-finish", event.newValue);
        sync();
      }
    };

    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
