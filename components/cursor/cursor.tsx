"use client";

import { useEffect, useRef } from "react";
import type { CursorController } from "@/lib/cursor/controller";
import { CURSOR_LARGE_KEY, CURSOR_SYSTEM_KEY, useCursorSettings } from "@/lib/cursor/settings";

/**
 * The custom cursor runs wherever a fine pointer that can hover is attached (DESIGN.md
 * §6.1): a mouse or a trackpad, an iPad's included, though its main pointer is a finger.
 * Touch still gets the native behavior: the engine yields to any pointer that isn't a mouse.
 */
const FINE_POINTER = "(any-hover: hover) and (any-pointer: fine)";
const FORCED_COLORS = "(forced-colors: active)";

/**
 * Mounts the custom cursor (lib/cursor/controller.ts) wherever it can be guaranteed: a
 * fine pointer that hovers, no forced colors, a browser with the popover top layer, and a
 * visitor who hasn't chosen "Use system cursor". The engine is a separate chunk, so touch
 * devices never download it. Renders nothing; the engine builds its own top-layer root.
 */
export function Cursor() {
  const system = useCursorSettings((state) => state.system);
  const large = useCursorSettings((state) => state.large);
  const controller = useRef<CursorController | null>(null);

  // Settings come from localStorage after hydration, and follow other tabs.
  useEffect(() => {
    useCursorSettings.getState().sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CURSOR_LARGE_KEY || event.key === CURSOR_SYSTEM_KEY) {
        useCursorSettings.getState().sync();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    // Read the store, not the render: on the first pass the saved setting has just synced.
    if (useCursorSettings.getState().system) return;
    if (typeof HTMLElement.prototype.showPopover !== "function") return;
    const fine = window.matchMedia(FINE_POINTER);
    const forced = window.matchMedia(FORCED_COLORS);
    const wanted = () => fine.matches && !forced.matches;
    let cancelled = false;
    let loading = false;

    const update = () => {
      if (wanted() && !controller.current && !loading) {
        loading = true;
        import("@/lib/cursor/controller")
          .then(({ createCursor }) => {
            if (cancelled || controller.current || !wanted()) return;
            controller.current = createCursor({ large: useCursorSettings.getState().large });
          })
          .catch(() => undefined)
          .finally(() => {
            loading = false;
          });
      } else if (!wanted() && controller.current) {
        controller.current.destroy();
        controller.current = null;
      }
    };

    update();
    fine.addEventListener("change", update);
    forced.addEventListener("change", update);
    return () => {
      cancelled = true;
      fine.removeEventListener("change", update);
      forced.removeEventListener("change", update);
      controller.current?.destroy();
      controller.current = null;
    };
  }, [system]);

  useEffect(() => {
    controller.current?.setLarge(large);
  }, [large]);

  return null;
}
