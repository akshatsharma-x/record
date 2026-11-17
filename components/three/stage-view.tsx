"use client";

import { View } from "@react-three/drei";
import { type ComponentType, Suspense } from "react";

/** The 3D half of a StageView (lazy-loaded): tracks its box and renders the scene into it. */
export default function StageViewport({ scene: Scene, sceneProps }: { scene: ComponentType<object>; sceneProps?: object }) {
  return (
    <View className="absolute inset-0">
      <Suspense fallback={null}>
        <Scene {...sceneProps} />
      </Suspense>
    </View>
  );
}
