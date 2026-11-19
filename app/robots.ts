import type { MetadataRoute } from "next";
import { absolute, siteUrl } from "@/lib/site";

/** Robots (Part 16): every page, none of the endpoints, and where the sitemap is. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: absolute("/sitemap.xml"),
    host: siteUrl().origin,
  };
}
