"use client";

import { Focus, Grid3x3 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { island, useIsland } from "@/lib/island/store";
import { togglePageMode, usePageModes } from "@/lib/page-modes";
import { openSearch, toggleSearch, useSearch } from "@/lib/search/store";
import { isEditable, useShortcuts } from "@/lib/shortcuts";
import { warmSearch } from "./warm";

const SearchDialog = dynamic(() => import("./search-dialog"), { ssr: false });

/**
 * Search's keyboard entry points (DESIGN.md §6.3). ⌘K or Ctrl K toggles it anywhere, even
 * while typing. The single-key shortcuts ("/" for Search, G for the grid, F for focus
 * mode) only fire outside text fields and modal dialogs, and can be turned off (WCAG
 * 2.1.4). The dialog's code loads on first intent and stays mounted once opened.
 */
export function Search() {
  const open = useSearch((state) => state.open);
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    useShortcuts.getState().sync();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === "Meta" || event.key === "Control") {
        warmSearch();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        warmSearch();
        toggleSearch();
        return;
      }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (!useShortcuts.getState().singleKey || isEditable(event.target)) return;
      if (document.querySelector("dialog:modal")) return;
      const key = event.key.toLowerCase();
      if (event.key === "/") {
        event.preventDefault();
        warmSearch();
        openSearch();
      } else if (key === "g") {
        const on = togglePageMode("grid");
        island.show({ icon: Grid3x3, title: `Grid ${on ? "on" : "off"}` });
      } else if (key === "f") {
        const on = togglePageMode("focus");
        island.show({ icon: Focus, title: `Focus mode ${on ? "on" : "off"}` });
      } else if (event.key === "Escape" && usePageModes.getState().focus && !useIsland.getState().expanded) {
        togglePageMode("focus");
        island.show({ icon: Focus, title: "Focus mode off" });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return mounted ? <SearchDialog /> : null;
}
