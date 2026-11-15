import { describe, expect, it } from "vitest";
import { blendAt } from "@/lib/surface/controller";

// Three 1000px sections, stacked.
const sections = [
  { top: 0, bottom: 1000 },
  { top: 1000, bottom: 2000 },
  { top: 2000, bottom: 3000 },
];

describe("the surface blend", () => {
  it("holds the current surface for the first 80% of a section", () => {
    expect(blendAt(sections, 100)).toEqual({ from: 0, to: 0, progress: 0 });
    expect(blendAt(sections, 799)).toEqual({ from: 0, to: 0, progress: 0 });
  });

  it("crossfades to the next surface over the last 20%", () => {
    expect(blendAt(sections, 800)).toEqual({ from: 0, to: 1, progress: 0 });
    expect(blendAt(sections, 900)).toEqual({ from: 0, to: 1, progress: 0.5 });
    expect(blendAt(sections, 1950)).toEqual({ from: 1, to: 2, progress: 0.75 });
  });

  it("is fully the next surface at the boundary", () => {
    expect(blendAt(sections, 1000)).toEqual({ from: 1, to: 1, progress: 0 });
  });

  it("never fades past the last section", () => {
    expect(blendAt(sections, 2950)).toEqual({ from: 2, to: 2, progress: 0 });
    expect(blendAt(sections, 5000)).toEqual({ from: 2, to: 2, progress: 0 });
  });

  it("starts on the first section above it, and does nothing without sections", () => {
    expect(blendAt(sections, -50)).toEqual({ from: 0, to: 0, progress: 0 });
    expect(blendAt([], 500)).toEqual({ from: -1, to: -1, progress: 0 });
  });
});
