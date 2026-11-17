"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { StageView } from "@/components/three/stage";
import { useNearScene } from "@/components/three/use-near-scene";

const ChipScene = dynamic(() => import("./chip-scene"), { ssr: false });

/**
 * The chip's window onto the shared stage (DESIGN.md §7.7, §10): the 3D scene on HIGH and
 * MID tiers with motion, else the poster. It asks for the stage only when the chip is
 * three screens away, and never swaps the poster for the scene while the chip is on screen
 * (components/three/use-near-scene.ts). #chip's data-scene says which edition it is, so the
 * scroll scene (a tall, sticky stage) exists only in 3D.
 */
export function ChipView({ poster, label }: { poster: ReactNode; label: string }) {
  const { near, scene } = useNearScene("chip");
  if (!near) {
    return (
      <div role="img" aria-label={label} data-cursor-ink="light" className="chip-view">
        <div className="absolute inset-0">{poster}</div>
      </div>
    );
  }
  return <StageView scene={ChipScene} poster={poster} label={label} ink="light" className="chip-view" hold={!scene} />;
}
