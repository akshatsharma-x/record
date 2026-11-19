import type { MetadataRoute } from "next";
import { content } from "@/content";
import { iconColors } from "@/lib/og";

/** The web app manifest (Part 16): the name, the monogram's icons and the dark surface they sit on. */
export default function manifest(): MetadataRoute.Manifest {
  const { profile } = content;
  const colors = iconColors();
  return {
    name: profile.name,
    short_name: profile.name.split(" ")[0],
    description: profile.headline,
    start_url: "/",
    display: "standalone",
    background_color: colors.background,
    theme_color: colors.theme,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
