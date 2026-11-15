"use client";

import { useEffect, useRef } from "react";
import { useSurface } from "@/lib/stores/surface";
import { createSurfaceController } from "@/lib/surface/controller";

/**
 * Mounts the surface controller (lib/surface/controller.ts) and its fixed backdrop: two
 * layers whose opacity crossfades between section surfaces. Pages without sections leave
 * it idle. Writes the current surface to the store the cursor and the Island read.
 */
export function SurfaceController() {
  const from = useRef<HTMLDivElement>(null);
  const to = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!from.current || !to.current) return;
    const controller = createSurfaceController({
      from: from.current,
      to: to.current,
      onChange: (state) => useSurface.setState(state),
    });
    return () => controller.destroy();
  }, []);

  return (
    <div className="surface-backdrop" aria-hidden="true">
      <div ref={from} data-backdrop-surface="light" />
      <div ref={to} data-backdrop-surface="light" style={{ opacity: 0 }} />
    </div>
  );
}
