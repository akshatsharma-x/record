"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Color, type Mesh } from "three";
import { springAt, springs } from "@/lib/motion";

/** The finish accent as a three.js color. Safari reports color-mix() results as color(srgb …). */
function accentColor(): Color {
  const probe = document.createElement("span");
  probe.style.color = "var(--color-accent)";
  document.documentElement.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
  return srgb ? new Color().setRGB(Number(srgb[1]), Number(srgb[2]), Number(srgb[3])) : new Color(value);
}

const REST = { x: -0.45, y: 0.65 };
const TURN = Math.PI / 2;

/**
 * The kitchen's test cube: proof that the shared stage renders. It's tinted by the finish
 * and turns a quarter on hover, on the smooth spring, then rests (motion on intent, §5.6).
 */
export default function TestCube() {
  const mesh = useRef<Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [color, setColor] = useState(accentColor);
  const turn = useRef({ from: REST.y, to: REST.y, started: 0 });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColor(accentColor());
      invalidate();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-finish", "data-theme"] });
    return () => observer.disconnect();
  }, [invalidate]);

  const turnTo = (angle: number) => {
    const cube = mesh.current;
    if (!cube) return;
    turn.current = { from: cube.rotation.y, to: angle, started: performance.now() };
    invalidate();
  };

  useFrame(() => {
    const cube = mesh.current;
    const { from, to, started } = turn.current;
    if (!cube || !started) return;
    const progress = springAt(springs.smooth, (performance.now() - started) / 1000);
    cube.rotation.y = from + (to - from) * progress;
    if (Math.abs(1 - progress) > 0.001) invalidate();
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4.2]} fov={35} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <mesh
        ref={mesh}
        rotation={[REST.x, REST.y, 0]}
        onPointerOver={() => turnTo(REST.y + TURN)}
        onPointerOut={() => turnTo(REST.y)}
      >
        <boxGeometry args={[1.4, 1.4, 1.4]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
      </mesh>
    </>
  );
}
