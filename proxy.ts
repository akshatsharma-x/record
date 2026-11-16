import { type NextRequest, NextResponse } from "next/server";
import { data } from "./content/data";

/** Every page with a slug, read straight from content: no parsing here. */
const PAGES: Record<string, Set<string>> = {
  research: new Set(data.publications.map((paper) => paper.slug)),
  work: new Set(data.projects.map((project) => project.slug)),
};

/**
 * A page that doesn't exist answers 404 before anything renders. The paper pages and the
 * case studies are prerendered, but an unknown slug would otherwise get the route's shell,
 * which starts streaming with a 200 and can only mark itself noindex (DESIGN.md §7.5, §7.6).
 */
export function proxy(request: NextRequest) {
  const [, section, slug] = request.nextUrl.pathname.split("/");
  if (section && slug && PAGES[section]?.has(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
}

export const config = {
  matcher: ["/research/:slug", "/work/:slug"],
};
