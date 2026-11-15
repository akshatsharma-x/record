import { describe, expect, it } from "vitest";
import { classifyGpu, classifyTier, type TierSignals } from "@/lib/tier";

const capable: TierSignals = {
  webgl2: true,
  renderer: "Apple GPU",
  deviceMemory: 8,
  cores: 8,
  saveData: false,
  reducedMotion: false,
  frameTime: 8.3,
};

describe("GPU classes", () => {
  it.each([
    ["Apple GPU", "high"],
    ["Apple M2 Pro", "high"],
    ["ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)", "high"],
    ["ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)", "mid"],
    ["Adreno (TM) 740", "high"],
    ["Adreno (TM) 506", "low"],
    ["Mali-G52", "mid"],
    ["Mali-T720", "low"],
    ["ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)", "software"],
    ["llvmpipe (LLVM 15.0.7, 256 bits)", "software"],
    [null, "unknown"],
  ] as const)("%s → %s", (renderer, expected) => {
    expect(classifyGpu(renderer)).toBe(expected);
  });
});

describe("tiers", () => {
  it("puts a modern Mac or iPhone at HIGH", () => {
    expect(classifyTier(capable)).toBe("HIGH");
  });

  it("turns 3D off without WebGL2, with a software renderer or with Save-Data", () => {
    expect(classifyTier({ ...capable, webgl2: false })).toBe("OFF");
    expect(classifyTier({ ...capable, renderer: "SwiftShader" })).toBe("OFF");
    expect(classifyTier({ ...capable, saveData: true })).toBe("OFF");
  });

  it("shows posters with reduced motion", () => {
    expect(classifyTier({ ...capable, reducedMotion: true })).toBe("LOW");
  });

  it("caps small devices", () => {
    expect(classifyTier({ ...capable, deviceMemory: 2 })).toBe("LOW");
    expect(classifyTier({ ...capable, cores: 2 })).toBe("LOW");
    expect(classifyTier({ ...capable, deviceMemory: 4 })).toBe("MID");
    expect(classifyTier({ ...capable, cores: 4 })).toBe("MID");
  });

  it("drops a tier when the frame-time probe is slow", () => {
    expect(classifyTier({ ...capable, frameTime: 30 })).toBe("MID");
    expect(classifyTier({ ...capable, frameTime: 50 })).toBe("LOW");
  });

  it("reads Safari's missing deviceMemory as unknown, not small", () => {
    expect(classifyTier({ ...capable, deviceMemory: undefined })).toBe("HIGH");
  });
});
