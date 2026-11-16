import { type NextRequest, NextResponse } from "next/server";
import { data } from "./content/data";

/** Every paper with a page (app/research/[slug]), read straight from content: no parsing here. */
const PAPERS = new Set(data.publications.map((paper) => paper.slug));

/**
 * A page that doesn't exist answers 404 before anything renders. The paper pages are
 * prerendered, but an unknown slug would otherwise get the route's shell, which starts
 * streaming with a 200 and can only mark itself noindex (DESIGN.md §7.5).
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2];
  if (slug && PAPERS.has(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
}

export const config = {
  matcher: "/research/:slug",
};
