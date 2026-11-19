import { monogram } from "@/lib/og";

/** The monogram as the site's icon (lib/og.tsx): a favicon, and the manifest's two. */
const SIZES = [32, 192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((size) => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return monogram(Number(await id));
}
