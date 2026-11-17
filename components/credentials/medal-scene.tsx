"use client";

import { Environment, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { token } from "@/components/three/token";
import { MEDAL_MOTION } from "@/lib/medal-motion";
import { medalState, onMedals } from "@/lib/medal-state";
import { brushing, faces, geometries, glintTexture, type MedalPalette, studio } from "@/lib/medal-textures";
import { MEDAL } from "@/lib/medals";
import type { MedalSceneProps } from "./medal-view";

/**
 * A medal in 3D (DESIGN.md §7.8), procedural, with nothing downloaded: a bevelled
 * extrusion of its outline (lib/medals.ts) in brushed metal under a clearcoat, a raised rim
 * on each side, the finish's accent in the enamel of its face and both faces engraved
 * through a canvas, all lit by one studio of light panels the medals share (no HDR). The
 * DOM turns it (lib/credentials-behavior.ts, lib/medal-motion.ts); this draws it where it
 * is, and only while it moves.
 */

/** The camera: far enough that the medal and its glint fit the view, narrow for little distortion. */
const CAMERA = { fov: 26, distance: 5.25 } as const;
/** Where the face is, and how far the fields sit above it. */
const FACE = MEDAL.depth / 2 + MEDAL.bevel;
const LIFT = 0.003;

function palette(): MedalPalette {
  return {
    metal: token("--medal-metal"),
    enamel: token("--color-accent-fill"),
    inlay: token("--medal-inlay"),
    etch: token("--medal-etch"),
    accent: token("--color-accent"),
  };
}

/** Where the glint flashes: on the rim, up and to the right, in the camera's space. */
const GLINT_AT = new THREE.Vector3(0.6, 0.62, 0.3);

export default function MedalScene({ id, shape, face, line, back }: MedalSceneProps) {
  const [colors, setColors] = useState(palette);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const medal = useRef<THREE.Group>(null);
  const glint = useRef<THREE.Sprite>(null);
  const key = useRef<THREE.DirectionalLight>(null);

  const shapes = useMemo(() => geometries(shape), [shape]);
  const maps = useMemo(() => faces(shape, face, line, back, colors), [shape, face, line, back, colors]);
  const brushed = useMemo(() => brushing(), []);
  const sparkle = useMemo(() => glintTexture(), []);

  const materials = useMemo(() => {
    const metal = new THREE.MeshPhysicalMaterial({
      color: colors.metal,
      metalness: 1,
      roughness: 0.34,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      anisotropy: 0.65,
      anisotropyMap: brushed,
    });
    // The letters are a bright inlay with a little sheen, the enamel around them is glass.
    const enamel = new THREE.MeshPhysicalMaterial({
      map: maps.front,
      metalness: 0.4,
      metalnessMap: maps.frontMask,
      roughness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.14,
      bumpMap: maps.frontMask,
      bumpScale: -0.12,
    });
    const rear = new THREE.MeshPhysicalMaterial({
      map: maps.back,
      metalness: 1,
      roughness: 0.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      bumpMap: maps.backMask,
      bumpScale: 0.6,
    });
    return { metal, enamel, rear };
  }, [colors, maps, brushed]);

  useEffect(
    () => () => {
      for (const geometry of Object.values(shapes)) geometry.dispose();
    },
    [shapes],
  );
  useEffect(
    () => () => {
      for (const map of Object.values(maps)) map.dispose();
    },
    [maps],
  );
  useEffect(
    () => () => {
      for (const material of Object.values(materials)) material.dispose();
    },
    [materials],
  );
  // The studio's reflections, made once and shared by every medal.
  const reflections = useMemo(() => studio(gl, colors.accent), [gl, colors]);

  // It mounts three screens ahead: compile its shaders then, not in the first frame it's seen.
  useEffect(() => {
    void gl.compileAsync(scene, camera).then(() => invalidate());
  }, [gl, scene, camera, invalidate, materials]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColors(palette());
      invalidate();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-finish", "data-theme"] });
    const stop = onMedals((which) => {
      if (which === id) invalidate();
    });
    return () => {
      observer.disconnect();
      stop();
    };
  }, [id, invalidate]);

  useFrame(() => {
    const group = medal.current;
    if (!group) return;
    const { motion, glint: thrown } = medalState(id);
    group.rotation.set(motion.tilt, motion.angle, 0);
    // A hard flick throws a glint: it flares and fades on the rim while the key light peaks.
    const age = thrown ? (performance.now() - thrown) / 1000 : Number.POSITIVE_INFINITY;
    const t = age / MEDAL_MOTION.glint;
    const flare = t < 1 ? Math.sin(Math.PI * t) : 0;
    if (glint.current) {
      glint.current.visible = flare > 0;
      glint.current.scale.setScalar(0.15 + 0.85 * flare);
      glint.current.material.rotation = t * 0.8;
      glint.current.material.opacity = flare;
    }
    if (key.current) key.current.intensity = 1.6 + 2.4 * flare;
    if (t < 1) invalidate();
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={CAMERA.fov} position={[0, 0, CAMERA.distance]} near={0.1} far={20} />
      <Environment map={reflections} />
      <directionalLight ref={key} position={[2.5, 3, 4]} intensity={1.6} />
      <group ref={medal}>
        <mesh geometry={shapes.body} material={materials.metal} />
        <mesh geometry={shapes.rim} material={materials.metal} position={[0, 0, FACE - LIFT]} />
        <mesh geometry={shapes.rim} material={materials.metal} position={[0, 0, -FACE + LIFT]} rotation-y={Math.PI} />
        <mesh geometry={shapes.field} material={materials.enamel} position={[0, 0, FACE + LIFT]} />
        <mesh geometry={shapes.field} material={materials.rear} position={[0, 0, -FACE - LIFT]} rotation-y={Math.PI} />
      </group>
      <sprite ref={glint} position={GLINT_AT} visible={false}>
        <spriteMaterial map={sparkle} blending={THREE.AdditiveBlending} depthTest={false} transparent toneMapped={false} />
      </sprite>
    </>
  );
}
