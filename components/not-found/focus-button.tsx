"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { durations } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/reduced-motion";

/**
 * "Bring it into focus" (DESIGN.md §8): the out-of-focus page sharpens, then the visitor is
 * home. It's a link to "/", so it works without JavaScript; with reduced motion it simply
 * goes.
 */
export function FocusButton({ children }: { children: ReactNode }) {
  const router = useRouter();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const page = document.querySelector(".not-found");
    if (!page || prefersReducedMotion()) {
      router.push("/");
      return;
    }
    page.setAttribute("data-focusing", "");
    window.setTimeout(() => router.push("/"), durations.revealShort);
  };
  return (
    <Link href="/" className="not-found-action pressable" onClick={onClick}>
      {children}
    </Link>
  );
}
