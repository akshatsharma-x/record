import Image from "next/image";
import type { WorkPreview } from "@/content/derive";
import { cx } from "@/lib/cx";
import { COVER_SIZES } from "@/lib/work";
import { Preview } from "./previews";

/**
 * A project's cover: its living preview until content has screenshots, then the first
 * screenshot, with no code change (DESIGN.md §7.6). The tile, the case study's hero and the
 * next-project card all use it, so the cover can fly from one to the next.
 */
export function Cover({
  preview,
  screenshot,
  className,
}: {
  preview: WorkPreview;
  screenshot: { src: string; alt: string } | null;
  className?: string;
}) {
  return (
    <div className={cx("work-cover", className)} data-work-cover={screenshot ? "shot" : preview.kind}>
      {screenshot ? <Image className="work-shot" src={screenshot.src} alt={screenshot.alt} fill sizes={COVER_SIZES} /> : <Preview preview={preview} />}
    </div>
  );
}
