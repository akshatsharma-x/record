import type { WorkPreview } from "@/content/derive";
import { cx } from "@/lib/cx";
import { Preview } from "./previews";
import { Shot } from "./shot";

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
  preview: WorkPreview | null;
  screenshot: { src: string; alt: string } | null;
  className?: string;
}) {
  // Content guarantees one or the other (content/schema.ts).
  return (
    <div className={cx("work-cover", className)} data-work-cover={screenshot ? "shot" : preview?.kind}>
      {screenshot ? <Shot screenshot={screenshot} /> : preview ? <Preview preview={preview} /> : null}
    </div>
  );
}
