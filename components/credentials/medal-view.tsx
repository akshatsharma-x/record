"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { StageView } from "@/components/three/stage";
import { useNearScene } from "@/components/three/use-near-scene";
import type { MedalShape } from "@/lib/medals";

const MedalScene = dynamic(() => import("./medal-scene"), { ssr: false });

export interface MedalSceneProps {
  id: string;
  shape: MedalShape;
  face: string;
  line: string;
  back: string;
}

/**
 * A medal's window onto the shared stage (DESIGN.md §7.8, §10): the 3D medal on HIGH and
 * MID tiers with motion, else its still. Like the chip, it asks for the stage three screens
 * ahead and swaps only while the medal is off screen; unlike it, the swap also waits for a
 * moment when the page is still, one medal at a time, so building a scene never lands in
 * a scroll. Its data-scene tells the behavior which edition the drag and the flip drive.
 */
export function MedalView({ medal, still, label }: { medal: MedalSceneProps; still: ReactNode; label: string }) {
  const { near, scene } = useNearScene(`medal-${medal.id}`, { quiet: true });
  if (!near) {
    return (
      <div role="img" aria-label={label} className="medal-view">
        <div className="absolute inset-0">{still}</div>
      </div>
    );
  }
  return <StageView scene={MedalScene} sceneProps={medal} poster={still} label={label} ink="light" className="medal-view" hold={!scene} />;
}
