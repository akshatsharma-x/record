import type { MetadataRoute } from "next";
import { content } from "@/content";
import { caseStudies, research } from "@/content/derive";
import { absolute } from "@/lib/site";

/** Every page there is (Part 16): the home page, each case study and paper, and the three sheets. No dates: content keeps none that say when a page changed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", ...caseStudies(content).map((study) => study.href), ...research(content).map((paper) => paper.href), "/specs", "/compare", "/colophon"];
  return pages.map((path) => ({ url: absolute(path), changeFrequency: "monthly", priority: path === "/" ? 1 : 0.7 }));
}
