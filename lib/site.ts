import type { Metadata } from "next";
import { content } from "@/content";

/**
 * The site's own address (DESIGN.md §10, Part 16), for canonical URLs, the sitemap, robots
 * and share cards. Akshat's domain once content has it (`profile.links.site`, a
 * TODO(akshat)); until then the project's production address on Vercel
 * (VERCEL_PROJECT_PRODUCTION_URL, which every Vercel build has, a preview's too, so a
 * preview's canonical is still the production page); and localhost on this machine.
 */
export function siteUrl(): URL {
  const own = content.profile.links.site;
  if (own) return new URL(own);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? "3000"}`);
}

/** A path on the site, as an absolute URL. */
export function absolute(path: string): string {
  return new URL(path, siteUrl()).toString();
}

interface Page {
  /** The page's path, from the site's root: its canonical address. */
  path: string;
  title: string;
  description: string;
  /** What a share card calls it; a person's profile, an article or simply a page. */
  type?: "website" | "article" | "profile";
}

/**
 * What every page says about itself to search engines and share sheets: its canonical
 * address, and its Open Graph and X cards (the card's image is the route's own
 * opengraph-image). Without it a page would inherit the home page's.
 */
export function pageMetadata({ path, title, description, type = "website" }: Page): Metadata {
  const { profile } = content;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      title,
      description,
      siteName: profile.name,
      locale: "en_IN",
      ...(type === "profile" ? { firstName: profile.name.split(" ")[0], lastName: profile.name.split(" ").slice(1).join(" ") } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
