"use client";

import { usePathname } from "next/navigation";
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
  const controller = useRef<ReturnType<typeof createSurfaceController> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!from.current || !to.current) return;
    controller.current = createSurfaceController({
      from: from.current,
      to: to.current,
      onChange: (state) => useSurface.setState(state),
    });
    return () => {
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);

  // A client-side navigation brings new sections: measure them.
  useEffect(() => {
    controller.current?.refresh();
  }, [pathname]);

  return (
    <div className="surface-backdrop" aria-hidden="true">
      <div ref={from} data-backdrop-surface="light" />
      <div ref={to} data-backdrop-surface="light" style={{ opacity: 0 }} />
    </div>
  );
}
