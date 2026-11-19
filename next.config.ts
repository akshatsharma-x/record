import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Dev-only routes (/dev/content now, /dev/kitchen in Part 2) are named `page.dev.tsx`.
 * Only the dev server treats `.dev.tsx` as a page extension, so production builds don't
 * contain those routes at all and their URLs return 404 (DESIGN.md §3.2).
 */
/**
 * The security headers (DESIGN.md §10, Part 16), on every response of a production build.
 * The policy's script rule here is the lenient half: each prerendered page carries the strict
 * one itself, its inline scripts by hash (scripts/csp.ts), and a browser enforces both. Not
 * under next dev, whose React needs eval and whose reloads need a socket.
 */
const POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: POLICY },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // The portrait's tilt reads the motion sensors (Part 5), so they stay allowed.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // As Vercel sends it; subdomains and preloading are for whoever owns the domain to decide.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

export default function config(phase: string): NextConfig {
  const devServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    async headers() {
      return devServer ? [] : [{ source: "/:path*", headers: SECURITY_HEADERS }];
    },
    cacheComponents: true,
    partialPrefetching: true,
    pageExtensions: devServer ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
    // The hero portrait's layers (Part 5) ship as AVIF where browsers accept it, else WebP.
    images: { formats: ["image/avif", "image/webp"], qualities: [60, 75] },
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
