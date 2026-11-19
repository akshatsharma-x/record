import { APPLE_ICON, monogram, OG } from "@/lib/og";

/** The monogram for Apple's home screens and iMessage's small previews: edge to edge, since iOS rounds it. */
export const size = APPLE_ICON.size;
export const contentType = OG.contentType;

export default function AppleIcon() {
  return monogram(size.width, { bleed: true });
}
