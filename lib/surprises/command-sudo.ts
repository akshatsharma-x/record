import { ShieldCheck } from "lucide-react";
import { island } from "../island/store";
import { durations } from "../motion";
import type { SecretCommand } from "../search/types";
import { define } from "./define.ts";

/** Search "sudo hire akshat": "Permission granted.", then a jump to Contact. */
export const commandSudo = define({ id: "command-sudo", section: "search", on: true });

/** Grants it, then goes once the Island has said so. */
export function runSudo(command: SecretCommand, go: (href: string) => void): void {
  island.show({ icon: ShieldCheck, title: command.answer ?? "", tone: "success" });
  window.setTimeout(() => go(command.href ?? "/#contact"), durations.revealLong);
}
