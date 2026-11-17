import type { SecretCommand } from "@/lib/search/types";
import { run941 } from "@/lib/surprises/command-941";
import { clarity } from "@/lib/surprises/command-clarity";
import { runHello } from "@/lib/surprises/command-hello";
import { runSudo } from "@/lib/surprises/command-sudo";
import { lastPointer } from "@/lib/surprises/pointer";

/**
 * Runs one of Search's secret commands (DESIGN.md §8), each the surprise in its own file:
 * the Island says hello, every clock reads 9:41, permission is granted on the way to
 * Contact, /compare or the RETROGRADE edition opens, or the page comes into focus.
 */
export function runSecret(command: SecretCommand, timeZone: string, go: (href: string) => void): void {
  switch (command.id) {
    case "command-hello":
      return runHello(command);
    case "command-941":
      return run941(command, timeZone);
    case "command-sudo":
      return runSudo(command, go);
    case "command-compare":
    case "command-retro":
      if (command.href) go(command.href);
      return;
    case "command-clarity":
      return clarity(lastPointer());
  }
}
