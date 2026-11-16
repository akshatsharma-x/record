"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useState } from "react";
import { StageView, useStage } from "@/components/three/stage";

const ChipScene = dynamic(() => import("./chip-scene"), { ssr: false });

/**
 * The chip's window onto the shared stage (DESIGN.md §7.7, §10): the 3D scene on HIGH and
 * MID tiers with motion, else the poster. It asks for the stage only when the chip is
 * three screens away, so three.js and the tier's probe never weigh on the page's load, and
 * it never swaps the poster for the scene while the chip is on screen. It tells the chip
 * which edition it is, so the scroll scene (a tall, sticky stage) exists only in 3D.
 */
export function ChipView({ poster, label }: { poster: ReactNode; label: string }) {
  const { active } = useStage();
  const [near, setNear] = useState(false);
  const [scene, setScene] = useState(false);

  useEffect(() => {
    const chip = document.getElementById("chip");
    if (!chip || typeof IntersectionObserver === "undefined") return;
    const approach = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        approach.disconnect();
        setNear(true);
      },
      { rootMargin: "300%" },
    );
    approach.observe(chip);
    return () => approach.disconnect();
  }, []);

  useEffect(() => {
    const chip = document.getElementById("chip");
    if (!chip || !active || scene) return;
    // Only while the chip is off screen does the poster give way to the scene.
    const view = new IntersectionObserver((entries) => {
      if (entries.some((entry) => !entry.isIntersecting)) {
        view.disconnect();
        setScene(true);
      }
    });
    view.observe(chip);
    return () => view.disconnect();
  }, [active, scene]);

  useEffect(() => {
    document.getElementById("chip")?.setAttribute("data-scene", active && scene ? "3d" : "poster");
  }, [active, scene]);

  if (!near) {
    return (
      <div role="img" aria-label={label} data-cursor-ink="light" className="chip-view">
        <div className="absolute inset-0">{poster}</div>
      </div>
    );
  }
  return <StageView scene={ChipScene} poster={poster} label={label} ink="light" className="chip-view" hold={!scene} />;
}
