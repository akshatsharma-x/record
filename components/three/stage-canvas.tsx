"use client";

import { View } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { Tier } from "@/lib/tier";

/** Views follow their DOM boxes, so a demand-driven stage redraws when the page moves. */
function RedrawOnScroll() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const redraw = () => invalidate();
    window.addEventListener("scroll", redraw, { passive: true });
    window.addEventListener("resize", redraw);
    return () => {
      window.removeEventListener("scroll", redraw);
      window.removeEventListener("resize", redraw);
    };
  }, [invalidate]);
  return null;
}

/**
 * The one Canvas (lazy-loaded by StageProvider). Fixed to the viewport between the page
 * background and the content, ignoring the pointer itself: events come from the body, so
 * the content above stays fully interactive. drei's View tunnels each scene into it.
 */
export default function StageCanvas({ tier }: { tier: Tier }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={tier === "HIGH" ? [1, 2] : [1, 1.5]}
      gl={{ antialias: tier === "HIGH", alpha: true, powerPreference: "high-performance" }}
      eventSource={document.body}
      eventPrefix="client"
      style={{ position: "fixed", inset: 0, zIndex: "var(--layer-stage)", pointerEvents: "none" }}
    >
      <View.Port />
      <RedrawOnScroll />
    </Canvas>
  );
}
