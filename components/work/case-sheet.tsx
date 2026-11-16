"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { presentSheet } from "@/lib/case-sheet";

/**
 * A case study over the page (DESIGN.md §7.6): a full-screen sheet in a top-layer
 * <dialog>, which the cursor rises above. It opens out of the tile it came from and closes
 * back into it (lib/case-sheet.ts). ×, Escape, the dimmed page and a downward drag on a
 * touch screen all go back a step, like the back button: leaving the route is what closes
 * it, so the URL and the sheet never disagree. The layout effect opens it before the first
 * paint, and its cleanup closes it before React hides or removes it.
 */
export function CaseSheet({ slug, titleId, children }: { slug: string; titleId: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const sheet = presentSheet(dialog, slug, () => router.back());
    return () => sheet.dismiss();
  }, [slug, router]);

  return (
    <dialog ref={ref} className="case-sheet" data-surface="light" data-case-sheet={slug} aria-labelledby={titleId}>
      <div className="case-dim" data-case-dim />
      <div className="case-panel" data-case-panel>
        <div className="case-chrome">
          <span className="case-grabber" aria-hidden="true" data-case-fade />
          <button type="button" className="case-close pressable" aria-label="Close" data-case-close data-case-fade>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
