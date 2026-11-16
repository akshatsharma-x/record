"use client";

import { type ElementType, type HTMLAttributes, type ReactNode, useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import { attachTilt } from "@/lib/tilt";

interface TiltCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children?: ReactNode;
}

/**
 * Depth on hover (DESIGN.md §6.6): the card tilts toward the pointer, at most 6°, under a
 * specular highlight that follows it, like a tvOS poster (lib/tilt.ts). Pointer only: off
 * for touch and for reduced motion.
 */
export function TiltCard({ as: Tag = "div", className, children, ...rest }: TiltCardProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) return attachTilt(ref.current);
  }, []);

  return (
    <Tag ref={ref} className={cx("tilt", className)} {...rest}>
      {children}
      <span className="tilt-specular" aria-hidden="true" />
    </Tag>
  );
}
