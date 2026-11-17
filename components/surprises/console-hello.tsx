"use client";

import { useEffect } from "react";

/**
 * One message in the DevTools console a session (DESIGN.md §8): the monogram, a hello for
 * engineers, the GitHub link and the email. Its words and styles load after the page, so
 * the first load carries only this; a page without a console never knows.
 */
export function ConsoleHello({ initials, greeting, github, email }: { initials: string; greeting: string; github: string; email: string }) {
  useEffect(() => {
    void import("@/lib/surprises/console-hello").then(({ sayHello }) => sayHello(initials, greeting, github, email));
  }, [initials, greeting, github, email]);
  return null;
}
