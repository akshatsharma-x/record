/**
 * The 3D, as one lazy chunk (DESIGN.md §10, Part 16): the stage and every scene behind one
 * import, so they arrive together, in one wave, and never piecemeal as each scene comes
 * near. The stage asks for it when the page is first idle or first touched, on HIGH and
 * MID tiers only (./stage.tsx).
 */
export { default as StageCanvas } from "./stage-canvas";
export { default as StageViewport } from "./stage-view";
export { default as ChipScene } from "@/components/skills/chip-scene";
export { default as MedalScene } from "@/components/credentials/medal-scene";
