import Image from "next/image";
import { blurOf } from "@/lib/blur";
import { COVER_SIZES } from "@/lib/work";

/**
 * A screenshot, resolving from its blur placeholder (DESIGN.md §5.4), made at build. Its own
 * module so a unit test, which renders synchronously, can draw the picture alone
 * (tests/unit/setup.tsx).
 */
export async function Shot({ screenshot }: { screenshot: { src: string; alt: string } }) {
  const blur = await blurOf(screenshot.src);
  return (
    <Image
      className="work-shot"
      src={screenshot.src}
      alt={screenshot.alt}
      fill
      sizes={COVER_SIZES}
      {...(blur ? { placeholder: "blur", blurDataURL: blur } : {})}
    />
  );
}
