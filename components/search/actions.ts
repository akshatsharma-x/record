import {
  Check,
  CircleAlert,
  ExternalLink,
  Focus,
  Grid3x3,
  Keyboard,
  type LucideIcon,
  Mail,
  Moon,
  MousePointer2,
  MousePointerClick,
  Palette,
  Printer,
  Sun,
} from "lucide-react";
import { useCursorSettings } from "@/lib/cursor/settings";
import { island } from "@/lib/island/store";
import { togglePageMode, usePageModes } from "@/lib/page-modes";
import { FINISHES, type Finish } from "@/lib/preferences";
import type { Searchable } from "@/lib/search/match";
import type { SearchPayload } from "@/lib/search/types";
import { useShortcuts } from "@/lib/shortcuts";
import { usePreferences } from "@/lib/stores/preferences";

/**
 * Search's actions (DESIGN.md §6.3). Each confirms itself through the Island, which also
 * announces it. Part 13 adds more.
 */
export interface Action extends Searchable {
  kind: "action";
  icon: LucideIcon;
  /** A single-key shortcut that does the same thing. */
  hint?: string;
  /** "On" or "Off" for settings. */
  state?: string;
  /** Hidden until the query asks for it. */
  quiet?: boolean;
  /** Enter opens it, ⌘Enter in a new tab. */
  href?: string;
  run: () => void;
}

export interface ActionState {
  theme: "light" | "dark";
  finish: Finish;
  large: boolean;
  system: boolean;
  grid: boolean;
  focus: boolean;
  singleKey: boolean;
}

const onOff = (on: boolean) => (on ? "On" : "Off");

function host(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function finishAction(finish: (typeof FINISHES)[number], quiet: boolean): Action {
  return {
    kind: "action",
    id: `action:finish-${finish.id}`,
    title: `Use the ${finish.name} finish`,
    subtitle: "The accent color",
    keywords: ["finish", "accent", "color", finish.name],
    body: "",
    icon: Palette,
    quiet,
    run: () => {
      usePreferences.getState().setFinish(finish.id);
      island.show({ icon: Palette, title: `Finish: ${finish.name}`, tone: "accent" });
    },
  };
}

export function buildActions(profile: SearchPayload["profile"] | null, state: ActionState): Action[] {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  const index = FINISHES.findIndex((finish) => finish.id === state.finish);
  const nextFinish = FINISHES[(index + 1) % FINISHES.length];
  const actions: Action[] = [];

  if (profile) {
    actions.push(
      {
        kind: "action",
        id: "action:copy-email",
        title: "Copy email",
        subtitle: profile.email,
        keywords: ["email", "mail", "contact", "address"],
        body: "",
        icon: Mail,
        run: () => {
          void navigator.clipboard
            .writeText(profile.email)
            .then(() => island.show({ icon: Check, title: "Email copied", detail: profile.email, tone: "success" }))
            .catch(() => island.show({ icon: CircleAlert, title: "Couldn't copy the email", detail: profile.email, tone: "error" }));
        },
      },
      {
        kind: "action",
        id: "action:linkedin",
        title: "Open LinkedIn",
        subtitle: host(profile.linkedin),
        keywords: ["linkedin", "profile", "social"],
        body: "",
        icon: ExternalLink,
        href: profile.linkedin,
        run: () => window.open(profile.linkedin, "_blank", "noopener,noreferrer"),
      },
      {
        kind: "action",
        id: "action:github",
        title: "Open GitHub",
        subtitle: host(profile.github),
        keywords: ["github", "code", "repositories", "git"],
        body: "",
        icon: ExternalLink,
        href: profile.github,
        run: () => window.open(profile.github, "_blank", "noopener,noreferrer"),
      },
    );
  }

  actions.push(
    {
      kind: "action",
      id: "action:theme",
      title: "Toggle theme",
      subtitle: `Switch to the ${nextTheme} theme`,
      keywords: ["theme", "dark", "light", "appearance", "mode"],
      body: "",
      icon: nextTheme === "dark" ? Moon : Sun,
      run: () => {
        void usePreferences
          .getState()
          .setTheme(nextTheme, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
        island.show({ icon: nextTheme === "dark" ? Moon : Sun, title: nextTheme === "dark" ? "Dark theme" : "Light theme" });
      },
    },
    {
      kind: "action",
      id: "action:finish",
      title: "Change finish",
      subtitle: `Next: ${nextFinish.name}`,
      keywords: ["finish", "accent", "color", "colour", ...FINISHES.map((finish) => finish.name)],
      body: "",
      icon: Palette,
      run: () => {
        usePreferences.getState().setFinish(nextFinish.id);
        island.show({ icon: Palette, title: `Finish: ${nextFinish.name}`, tone: "accent" });
      },
    },
    ...FINISHES.filter((finish) => finish.id !== state.finish).map((finish) => finishAction(finish, true)),
    {
      kind: "action",
      id: "action:larger-cursor",
      title: "Larger cursor",
      subtitle: "Make the pointer 1.5× its size",
      keywords: ["cursor", "pointer", "bigger", "size", "accessibility"],
      body: "",
      icon: MousePointer2,
      state: onOff(state.large),
      run: () => {
        useCursorSettings.getState().setLarge(!state.large);
        island.show({ icon: MousePointer2, title: `Larger cursor ${state.large ? "off" : "on"}` });
      },
    },
    {
      kind: "action",
      id: "action:system-cursor",
      title: "Use system cursor",
      subtitle: "The operating system's own pointer",
      keywords: ["cursor", "pointer", "native", "default"],
      body: "",
      icon: MousePointerClick,
      state: onOff(state.system),
      run: () => {
        useCursorSettings.getState().setSystem(!state.system);
        island.show({ icon: MousePointerClick, title: `System cursor ${state.system ? "off" : "on"}` });
      },
    },
    {
      kind: "action",
      id: "action:grid",
      title: "Show grid",
      subtitle: "The layout grid over the page",
      keywords: ["grid", "columns", "layout", "design"],
      body: "",
      icon: Grid3x3,
      hint: "G",
      state: onOff(state.grid),
      run: () => {
        const on = togglePageMode("grid");
        island.show({ icon: Grid3x3, title: `Grid ${on ? "on" : "off"}` });
      },
    },
    {
      kind: "action",
      id: "action:focus",
      title: "Focus mode",
      subtitle: "Dim everything but the section you're reading",
      keywords: ["focus", "reading", "dim", "distraction"],
      body: "",
      icon: Focus,
      hint: "F",
      state: onOff(state.focus),
      run: () => {
        const on = togglePageMode("focus");
        island.show({ icon: Focus, title: `Focus mode ${on ? "on" : "off"}` });
      },
    },
    {
      kind: "action",
      id: "action:print",
      title: "Print the résumé edition",
      subtitle: "A one-page résumé, set for paper",
      keywords: ["print", "resume", "résumé", "cv", "pdf", "paper"],
      body: "",
      icon: Printer,
      run: () => window.print(),
    },
    {
      kind: "action",
      id: "action:shortcuts",
      title: "Single-key shortcuts",
      subtitle: "/ for Search, G for the grid, F for focus mode",
      keywords: ["shortcuts", "keyboard", "keys", "slash"],
      body: "",
      icon: Keyboard,
      state: onOff(state.singleKey),
      run: () => {
        useShortcuts.getState().setSingleKey(!state.singleKey);
        island.show({ icon: Keyboard, title: `Single-key shortcuts ${state.singleKey ? "off" : "on"}` });
      },
    },
  );
  return actions;
}

/** The live state the actions describe, from the stores that own it. */
export function useActionState(): ActionState {
  const theme = usePreferences((state) => state.theme);
  const finish = usePreferences((state) => state.finish);
  const large = useCursorSettings((state) => state.large);
  const system = useCursorSettings((state) => state.system);
  const grid = usePageModes((state) => state.grid);
  const focus = usePageModes((state) => state.focus);
  const singleKey = useShortcuts((state) => state.singleKey);
  return { theme, finish, large, system, grid, focus, singleKey };
}
