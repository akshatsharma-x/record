import { create } from "zustand";

export type SurfaceName = "light" | "light-alt" | "dark";
export type Tone = "light" | "dark";

/**
 * The surface the visitor is looking at (DESIGN.md §4.2), written by the surface
 * controller. The Island (Part 4) reads the section and its name.
 */
export interface SurfaceState {
  /** The surface whose text tokens are active: it switches at the crossfade's midpoint. */
  surface: SurfaceName;
  /** Light or dark once the theme is applied: in the dark theme, every surface is dark. */
  tone: Tone;
  /** The id of the section under the probe line, if any. */
  section: string | null;
  /** That section's display name (data-section-name), for the Island (§6.2). */
  name: string | null;
  /** 0–1 through the crossfade into the next section. */
  progress: number;
}

export const useSurface = create<SurfaceState>(() => ({
  surface: "light",
  tone: "light",
  section: null,
  name: null,
  progress: 0,
}));
