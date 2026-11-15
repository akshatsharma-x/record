import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Dev-only routes (/dev/content now, /dev/kitchen in Part 2) are named `page.dev.tsx`.
 * Only the dev server treats `.dev.tsx` as a page extension, so production builds don't
 * contain those routes at all and their URLs return 404 (DESIGN.md §3.2).
 */
export default function config(phase: string): NextConfig {
  const devServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    cacheComponents: true,
    partialPrefetching: true,
    pageExtensions: devServer ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
