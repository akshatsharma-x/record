import { Hand } from "lucide-react";
import { island } from "../island/store";
import type { SecretCommand } from "../search/types";
import { define } from "./define.ts";

/** Search "hello": the Island answers. */
export const commandHello = define({ id: "command-hello", section: "search", on: true });

export function runHello(command: SecretCommand): void {
  island.show({ icon: Hand, title: command.answer ?? "", tone: "accent" });
}
