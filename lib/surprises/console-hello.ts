import { define } from "./define.ts";

/** One message in the DevTools console, once a session. */
export const consoleHello = define({ id: "console-hello", section: "global", on: true });

const SAID = "classyfolio:console-hello";

// The console's own styling: the monogram as a black badge, then the words, then the ways in.
const BADGE = "background:#000;color:#fff;font:600 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;padding:7px 9px;border-radius:999px";
const WORDS = "font:600 13px/1.6 -apple-system,BlinkMacSystemFont,sans-serif";
const QUIET = "font:13px/1.6 -apple-system,BlinkMacSystemFont,sans-serif;color:#6e6e73";

/** The message itself: the format string and its styles, for console.log. */
export function helloMessage(initials: string, greeting: string, github: string, email: string): string[] {
  return [`%c${initials}%c  ${greeting}\n%c${github}\n${email}`, BADGE, WORDS, QUIET];
}

/** Says it, the first time this session only. Returns whether it did. */
export function sayHello(initials: string, greeting: string, github: string, email: string): boolean {
  try {
    if (sessionStorage.getItem(SAID)) return false;
    sessionStorage.setItem(SAID, "1");
  } catch {
    return false;
  }
  console.log(...helloMessage(initials, greeting, github, email));
  return true;
}
