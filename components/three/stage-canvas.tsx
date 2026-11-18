"use client";

import { View } from "@react-three/drei";
import { addAfterEffect, Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { createGovernor } from "@/lib/governor";
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
 * Times every frame the stage draws, and calls `onSlow` once drawing has stayed too slow
 * (lib/governor.ts). After each frame it notes whether a scene has already asked for the
 * next, so a frame that only follows the stage's rest isn't counted as a slow one.
 */
function Governor({ onSlow }: { onSlow: () => void }) {
  const governor = useMemo(() => createGovernor(), []);
  const get = useThree((state) => state.get);
  const asked = useRef(false);
  const fired = useRef(false);
  useEffect(() => addAfterEffect(() => void (asked.current = get().internal.frames > 0)), [get]);
  useFrame((_, delta) => {
    if (fired.current) return;
    if (governor.frame(performance.now(), delta * 1000, asked.current)) {
      fired.current = true;
      onSlow();
    }
  });
  return null;
}

/**
 * The one Canvas (lazy-loaded by StageProvider). Fixed to the viewport between the page
 * background and the content, ignoring the pointer itself: events come from the body, so
 * the content above stays fully interactive. drei's View tunnels each scene into it.
 */
export default function StageCanvas({ tier, onSlow }: { tier: Tier; onSlow: () => void }) {
  return (
    <Canvas
      className="stage-canvas"
      frameloop="demand"
      dpr={tier === "HIGH" ? [1, 2] : [1, 1.5]}
      gl={{ antialias: tier === "HIGH", alpha: true, powerPreference: "high-performance" }}
      eventSource={document.body}
      eventPrefix="client"
      style={{ position: "fixed", inset: 0, zIndex: "var(--layer-stage)", pointerEvents: "none" }}
    >
      <View.Port />
      <RedrawOnScroll />
      <Governor onSlow={onSlow} />
    </Canvas>
  );
}
