import { create } from "zustand";
import type { Finish, Theme, ThemeChoice } from "../preferences.ts";
import { DEFAULT_FINISH } from "../preferences.ts";
import type { Origin } from "../theme.ts";
import { applyFinish, applyThemeChoice, readPreferences } from "../theme.ts";

/**
 * The visitor's theme and finish. The document is the source of truth (the head script
 * sets it before paint); this store mirrors it for UI such as the theme toggle and the
 * swatches. It starts from server-safe defaults and syncs on mount (PreferencesSync), so
 * hydration never mismatches.
 */
export interface PreferencesState {
  themeChoice: ThemeChoice;
  theme: Theme;
  finish: Finish;
  sync(): void;
  setTheme(choice: ThemeChoice, origin?: Origin): Promise<void>;
  setFinish(finish: Finish): void;
}

export const usePreferences = create<PreferencesState>((set) => ({
  themeChoice: "system",
  theme: "light",
  finish: DEFAULT_FINISH,
  sync: () => set(readPreferences()),
  setTheme: async (choice, origin) => {
    const done = applyThemeChoice(choice, origin);
    set(readPreferences());
    await done;
    set(readPreferences());
  },
  setFinish: (finish) => {
    applyFinish(finish);
    set(readPreferences());
  },
}));
