// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APERTURE } from "@/lib/hero";
import { durations } from "@/lib/motion";
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
  sessionStorage.clear();
  for (const name of ["data-theme", "data-theme-choice", "data-finish", "data-motion"]) root().removeAttribute(name);
  root().style.removeProperty("--aperture-blur");
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

  it("restores the aperture for the session, so the plate never flashes the default blur", () => {
    prefersDark(false);
    sessionStorage.setItem(APERTURE.storageKey, "0");
    runHeadScript();
    expect(root().style.getPropertyValue("--aperture-blur")).toBe(`${APERTURE.blur[0]}px`);

    for (const unreadable of ["99", ""]) {
      root().style.removeProperty("--aperture-blur");
      sessionStorage.setItem(APERTURE.storageKey, unreadable);
      runHeadScript();
      expect(root().style.getPropertyValue("--aperture-blur")).toBe("");
    }
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

  it("wipes a new finish out from the swatch in 600ms, then tidies up", async () => {
    prefersDark(false, false);
    root().setAttribute("data-finish", "contrail");
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    vi.stubGlobal("innerWidth", 1000);
    vi.stubGlobal("innerHeight", 800);
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return { ready: Promise.resolve(), finished, updateCallbackDone: Promise.resolve(), skipTransition() {} };
    });
    Object.assign(document, { startViewTransition });
    const animate = vi.fn();
    root().animate = animate;

    const done = applyFinish("pink-city", { x: 100, y: 700 });
    expect(root().getAttribute("data-finish")).toBe("pink-city");
    expect(root().hasAttribute("data-finish-wiping")).toBe(true);
    expect(root().style.getPropertyValue("--wipe-x")).toBe("100px");
    expect(root().style.getPropertyValue("--wipe-y")).toBe("700px");
    await Promise.resolve();
    await Promise.resolve();
    expect(animate).toHaveBeenCalledTimes(1);
    const [keyframes, options] = animate.mock.calls[0];
    // From the swatch to the farthest corner, edge included.
    expect(keyframes["--wipe-r"][0]).toBe("0px");
    expect(parseFloat(keyframes["--wipe-r"][1])).toBeGreaterThanOrEqual(Math.hypot(900, 700));
    expect(options).toMatchObject({ duration: durations.revealShort, pseudoElement: "::view-transition-new(root)" });
    expect(durations.revealShort).toBe(600);

    finish();
    await done;
    expect(root().hasAttribute("data-finish-wiping")).toBe(false);
    expect(root().style.getPropertyValue("--wipe-x")).toBe("");
    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("changes the finish instantly with reduced motion, even from a swatch", async () => {
    prefersDark(false, true);
    root().setAttribute("data-finish", "contrail");
    const startViewTransition = vi.fn();
    Object.assign(document, { startViewTransition });
    await applyFinish("saffron", { x: 1, y: 1 });
    expect(root().getAttribute("data-finish")).toBe("saffron");
    expect(startViewTransition).not.toHaveBeenCalled();
    Reflect.deleteProperty(document, "startViewTransition");
  });
});
