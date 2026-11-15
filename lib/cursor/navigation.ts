/**
 * Whether a click starts a route change inside the site, so the cursor shows its spinner
 * while the next page loads (DESIGN.md §6.1). Plain left clicks on same-origin links to a
 * different page qualify; new tabs, downloads, hash links and modified clicks don't.
 */
export function startsNavigation(
  event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented">,
  anchor: HTMLAnchorElement,
  location: Pick<Location, "href" | "origin" | "pathname" | "search">,
): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.hasAttribute("download") || anchor.getAttribute("aria-disabled") === "true") return false;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;
  const href = anchor.getAttribute("href");
  if (!href) return false;
  let url: URL;
  try {
    url = new URL(href, location.href);
  } catch {
    return false;
  }
  if (url.origin !== location.origin) return false;
  return url.pathname !== location.pathname || url.search !== location.search;
}
