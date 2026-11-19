"use client";

import dynamic from "next/dynamic";
import { type ComponentType, createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cx } from "@/lib/cx";
import { TIER_SESSION_KEY } from "@/lib/frames";
import type { Tier } from "@/lib/tier";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * The shared 3D stage (DESIGN.md §10, §11): one fixed Canvas for the whole site, so there's
 * one WebGL context. It sits between the page background and the content (§4.9), renders
 * only on demand, and loads, with three.js, only on HIGH and MID tiers. Everyone else
 * (LOW, OFF, reduced motion, no JavaScript) sees each view's poster.
 */

/** Fired by the kitchen's tier selector so the stage re-detects. */
export const TIER_CHANGE_EVENT = "classyfolio:tier";

/** The 3D chunk: the stage and every scene (./bundle.ts). */
const loadBundle = () => import("./bundle");
const StageCanvas = dynamic(() => loadBundle().then((bundle) => bundle.StageCanvas), { ssr: false });
const StageViewport = dynamic(() => loadBundle().then((bundle) => bundle.StageViewport), { ssr: false });

interface StageState {
  tier: Tier | null;
  /** True when 3D renders: a view is on the page, the tier is capable and motion is full. */
  active: boolean;
  /** A StageView announces itself, so pages without 3D never probe or load three.js. */
  register: () => () => void;
}

const StageContext = createContext<StageState>({ tier: null, active: false, register: () => () => {} });

export function useStage(): StageState {
  return useContext(StageContext);
}

export function StageProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [views, setViews] = useState(0);
  const [tier, setTier] = useState<Tier | null>(null);
  // The tier is settled, and the 3D chunk fetched where it's capable, once a scene comes
  // within three screens (its view registers then: components/three/use-near-scene.ts), so
  // it's ready before anyone reaches it and never fetched by a visitor who doesn't come near.
  // Part 16 fetched it at the first touch of the page, or after ten idle seconds: 270 KB
  // for visitors who never reached a scene, evaluated in the middle of the statement's
  // scrub (Part 17).
  const wanted = views > 0;

  useEffect(() => {
    if (tier === "HIGH" || tier === "MID") void loadBundle();
  }, [tier]);

  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    // The tier's GPU classification loads with the first 3D view, not with the page.
    const detect = () =>
      void import("@/lib/tier")
        .then(({ detectTier }) => detectTier(reducedMotion))
        .then((next) => {
          if (alive) setTier(next);
        });
    detect();
    window.addEventListener(TIER_CHANGE_EVENT, detect);
    return () => {
      alive = false;
      window.removeEventListener(TIER_CHANGE_EVENT, detect);
    };
  }, [reducedMotion, wanted]);

  const register = useCallback(() => {
    setViews((count) => count + 1);
    return () => setViews((count) => count - 1);
  }, []);
  // The governor found drawing too slow: posters, for the rest of the session.
  const slow = useCallback(() => {
    setTier("LOW");
    try {
      sessionStorage.setItem(TIER_SESSION_KEY, "LOW");
    } catch {
      // Fine: the posters stand for this page, at least.
    }
  }, []);
  const active = views > 0 && !reducedMotion && (tier === "HIGH" || tier === "MID");
  const value = useMemo(() => ({ tier, active, register }), [tier, active, register]);
  return (
    <StageContext.Provider value={value}>
      {children}
      {active && tier ? <StageCanvas tier={tier} onSlow={slow} /> : null}
    </StageContext.Provider>
  );
}

interface StageViewProps<P extends object> {
  /**
   * The scene, lazy-loaded so three.js stays out of the main bundle. Create it once at
   * module level: `const Cube = dynamic(() => import("./test-cube"), { ssr: false })`.
   */
  scene: ComponentType<P>;
  /** What the scene is given, when one scene draws several things (each medal, say). */
  sceneProps?: P;
  /** What LOW and OFF tiers, reduced motion and no-JavaScript visitors see. */
  poster: ReactNode;
  /** What the scene shows, for screen readers. */
  label: string;
  className?: string;
  /**
   * The cursor's ink over this scene. WebGL pixels can't be read back, so a scene declares
   * whether it's mostly light ("dark" ink) or mostly dark ("light" ink). Default: the tone.
   */
  ink?: "light" | "dark";
  /** Keep showing the poster even once 3D could take over (so it never swaps in view). */
  hold?: boolean;
}

/**
 * A window onto the shared stage. It reserves its own space, so loading never shifts layout.
 * The stage sits beneath the content (§4.9), so keep the view itself transparent: an
 * opaque background on it, or on anything above it, hides the scene.
 */
export function StageView<P extends object>({ scene, sceneProps, poster, label, className, ink, hold }: StageViewProps<P>) {
  const { active, register } = useStage();
  useEffect(() => register(), [register]);
  return (
    <div role="img" aria-label={label} data-cursor-ink={ink} className={cx("relative", className)}>
      {active && !hold ? (
        <StageViewport scene={scene as ComponentType<object>} sceneProps={sceneProps} />
      ) : (
        <div className="absolute inset-0">{poster}</div>
      )}
    </div>
  );
}
