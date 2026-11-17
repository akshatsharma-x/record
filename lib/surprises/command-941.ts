import { Clock } from "lucide-react";
import { calendarDateIn } from "../dates";
import { zoneOffset } from "../glance";
import { island } from "../island/store";
import type { SecretCommand } from "../search/types";
import { freezeClocks } from "../use-now";
import { define } from "./define.ts";

/** Search "9:41": every clock on the site shows 9:41 for five seconds. */
export const command941 = define({ id: "command-941", section: "search", on: true });

/** How long the clocks stay at 9:41. */
export const FROZEN_MS = 5000;

/** The instant it's 9:41 in the morning today, where Akshat's clocks are set. */
export function nineFortyOne(timeZone: string, now: Date = new Date()): Date {
  const today = calendarDateIn(timeZone, now);
  const offset = zoneOffset(timeZone, now);
  return new Date(Date.UTC(today.year, today.month - 1, today.day, 9, 41) - offset * 60_000);
}

export function run941(command: SecretCommand, timeZone: string): void {
  freezeClocks(nineFortyOne(timeZone), FROZEN_MS);
  island.show({ icon: Clock, title: command.answer ?? "" });
}
