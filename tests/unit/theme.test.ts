// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FINISH_STORAGE_KEY, PREFERENCES_SCRIPT, THEME_STORAGE_KEY } from "@/lib/preferences";
import { applyFinish, applyThemeChoice } from "@/lib/theme";

function prefersDark(dark: boolean, reducedMotion = false) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("prefers-color-scheme: dark") ? dark : query.includes("prefers-reduced-motion") ? reducedMotion : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

function runHeadScript() {
  new Function(PREFERENCES_SCRIPT)();
}

const root = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  for (const name of ["data-theme", "data-theme-choice", "data-finish", "data-motion"]) root().removeAttribute(name);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the head script (before first paint)", () => {
  it("follows the system when nothing is saved", () => {
    prefersDark(true);
    runHeadScript();
    expect(root().getAttribute("data-theme")).toBe("dark");
    expect(root().getAttribute("data-theme-choice")).toBe("system");
  });

  it("applies a saved theme over the system preference", () => {
    prefersDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    runHeadScript();
    expect(root().getAttribute("data-theme")).toBe("light");
    expect(root().getAttribute("data-theme-choice")).toBe("light");
  });

  it("applies a saved finish and ignores unknown values", () => {
    prefersDark(false);
    localStorage.setItem(FINISH_STORAGE_KEY, "saffron");
    runHeadScript();
    expect(root().getAttribute("data-finish")).toBe("saffron");

    root().removeAttribute("data-finish");
    localStorage.setItem(FINISH_STORAGE_KEY, "neon");
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    runHeadScript();
    expect(root().hasAttribute("data-finish")).toBe(false);
    expect(root().getAttribute("data-theme-choice")).toBe("system");
  });

  it("survives storage being unavailable", () => {
    prefersDark(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(runHeadScript).not.toThrow();
    expect(root().getAttribute("data-theme")).toBe("light");
  });
});

describe("switching at runtime", () => {
  it("switches instantly with reduced motion, and persists the choice", async () => {
    prefersDark(false, true);
    root().setAttribute("data-theme", "light");
    await applyThemeChoice("dark", { x: 10, y: 10 });
    expect(root().getAttribute("data-theme")).toBe("dark");
    expect(root().hasAttribute("data-theme-switching")).toBe(false);
    expect(root().hasAttribute("data-theme-fading")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("crossfades without View Transitions", async () => {
    prefersDark(false, false);
    root().setAttribute("data-theme", "light");
    const done = applyThemeChoice("dark");
    expect(root().hasAttribute("data-theme-fading")).toBe(true);
    expect(root().getAttribute("data-theme")).toBe("dark");
    await done;
    expect(root().hasAttribute("data-theme-fading")).toBe(false);
  });

  it("saves the finish and applies it to <html>", () => {
    applyFinish("monsoon");
    expect(root().getAttribute("data-finish")).toBe("monsoon");
    expect(localStorage.getItem(FINISH_STORAGE_KEY)).toBe("monsoon");
  });
});
