import type { Content } from "@/content/schema";
import { command941 } from "@/lib/surprises/command-941";
import { commandClarity } from "@/lib/surprises/command-clarity";
import { commandCompare } from "@/lib/surprises/command-compare";
import { commandHello } from "@/lib/surprises/command-hello";
import { commandRetro } from "@/lib/surprises/command-retro";
import { commandSudo } from "@/lib/surprises/command-sudo";
import type { SecretCommand } from "./types";

/**
 * Search's secret commands (DESIGN.md §8): what /search-index.json serves, and how Search
 * knows one was typed. A secret never shows for part of its phrase, or for anything like
 * it; only the phrase itself, typed in full, brings it up as the Top hit.
 */

/** The commands that are on, in content's words; "retro" only once content has the edition's address. */
export function secretCommands(content: Content): SecretCommand[] {
  const words = content.copy.surprises.commands;
  const retro = content.profile.links.retrograde;
  const all: (SecretCommand | null)[] = [
    commandHello.on ? { id: "command-hello", ...words.hello } : null,
    command941.on ? { id: "command-941", ...words.nineFortyOne } : null,
    commandSudo.on ? { id: "command-sudo", ...words.sudo, href: "/#contact" } : null,
    commandCompare.on ? { id: "command-compare", ...words.compare, href: "/compare" } : null,
    commandRetro.on && retro ? { id: "command-retro", ...words.retro, href: retro } : null,
    commandClarity.on ? { id: "command-clarity", ...words.clarity } : null,
  ];
  return all.filter((command): command is SecretCommand => command !== null);
}

/** A phrase as Search compares it: trimmed, in lowercase, with single spaces. */
export function phraseOf(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The command typed exactly, or null. */
export function secretFor(query: string, secrets: readonly SecretCommand[]): SecretCommand | null {
  const typed = phraseOf(query);
  if (!typed) return null;
  return secrets.find((command) => phraseOf(command.phrase) === typed) ?? null;
}
