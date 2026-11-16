/**
 * Any other page closes the modal slot: a soft navigation keeps a slot's last page unless a
 * route matches it, so every route but an intercepted case study matches this, and renders
 * nothing (DESIGN.md §7.6). It renders nothing whatever the URL, so it never blocks a
 * navigation; it opts out of instant-navigation validation like the pages it sits beside.
 */
export const instant = false;

export default function CatchAll() {
  return null;
}
