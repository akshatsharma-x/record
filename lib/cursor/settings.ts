import { create } from "zustand";

/**
 * The visitor's cursor settings (DESIGN.md §6.1): "Larger cursor" (1.5×) and "Use system
 * cursor". Persisted in localStorage; Search (Part 4) and the footer (Part 12) offer them.
 * The store starts from server-safe defaults and syncs after hydration.
 */
export const CURSOR_LARGE_KEY = "classyfolio:cursor-large";
export const CURSOR_SYSTEM_KEY = "classyfolio:cursor-system";

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function write(key: string, on: boolean): void {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    // Storage off: the setting lasts for this page only.
  }
}

export interface CursorSettings {
  large: boolean;
  system: boolean;
  sync(): void;
  setLarge(large: boolean): void;
  setSystem(system: boolean): void;
}

export const useCursorSettings = create<CursorSettings>((set) => ({
  large: false,
  system: false,
  sync: () => set({ large: read(CURSOR_LARGE_KEY), system: read(CURSOR_SYSTEM_KEY) }),
  setLarge: (large) => {
    write(CURSOR_LARGE_KEY, large);
    set({ large });
  },
  setSystem: (system) => {
    write(CURSOR_SYSTEM_KEY, system);
    set({ system });
  },
}));
