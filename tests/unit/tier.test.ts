import { describe, expect, it } from "vitest";
import { createGovernor, GOVERNOR } from "@/lib/governor";
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

describe("the governor (§10, Part 15)", () => {
  /** Feeds frames of the given lengths, back to back, each asked for by the one before. */
  function draw(lengths: number[], { from = 0, continuous = true } = {}) {
    const governor = createGovernor();
    let at = from;
    let trippedAt: number | null = null;
    for (const [i, ms] of lengths.entries()) {
      at += ms;
      if (governor.frame(at, ms, continuous || i > 0) && trippedAt === null) trippedAt = at;
    }
    return { governor, at, trippedAt };
  }
  const frames = (ms: number, seconds: number) => Array.from({ length: Math.round((seconds * 1000) / ms) }, () => ms);

  it("uses the brief's numbers: 24ms a frame, for two seconds", () => {
    expect(GOVERNOR.slowMs).toBe(24);
    expect(GOVERNOR.holdMs).toBe(2000);
  });

  it("leaves a stage that keeps up alone, at 60 Hz and at 120 Hz", () => {
    expect(draw(frames(1000 / 60, 30)).trippedAt).toBeNull();
    expect(draw(frames(1000 / 120, 30)).trippedAt).toBeNull();
  });

  it("drops to posters once frames have stayed slower than 24ms for two seconds, and not before", () => {
    const { trippedAt } = draw(frames(30, 5));
    expect(trippedAt).not.toBeNull();
    expect(trippedAt!).toBeGreaterThanOrEqual(2000);
    expect(trippedAt!).toBeLessThan(2000 + 30);
    expect(draw(frames(30, 1.9)).trippedAt).toBeNull();
  });

  it("catches a stage far too slow, too: a few frames a second", () => {
    expect(draw(frames(300, 4)).trippedAt).not.toBeNull();
  });

  it("goes by the average over the two seconds", () => {
    // 16 and 40, in turn, average 28ms: too slow. 16 and 30 average 23ms: fine.
    expect(draw(Array.from({ length: 200 }, (_, i) => (i % 2 ? 40 : 16))).trippedAt).not.toBeNull();
    expect(draw(Array.from({ length: 200 }, (_, i) => (i % 2 ? 30 : 16))).trippedAt).toBeNull();
    // One long hitch in a quick run doesn't.
    expect(draw([...frames(16, 1), 200, ...frames(16, 3)]).trippedAt).toBeNull();
  });

  it("doesn't count the stage at rest: a frame the one before didn't ask for starts a new run", () => {
    const governor = createGovernor();
    let at = 0;
    // Slow scrolling wakes a resting stage every 150ms, one frame at a time, for ten seconds.
    for (let i = 0; i < 66; i++) {
      at += 150;
      expect(governor.frame(at, 150, false)).toBe(false);
    }
  });

  it("needs the two seconds unbroken", () => {
    const governor = createGovernor();
    let at = 0;
    for (let round = 0; round < 4; round++) {
      // 1.5s of slow drawing, then the scene rests and a scroll wakes it.
      for (const [i, ms] of frames(30, 1.5).entries()) {
        at += ms;
        expect(governor.frame(at, ms, i > 0)).toBe(false);
      }
      at += 500;
    }
  });

  it("doesn't count a hidden tab's pause, and stays tripped once it has", () => {
    expect(draw([...frames(30, 1.5), 5000, ...frames(30, 1.5)]).trippedAt).toBeNull();
    const { governor, at } = draw(frames(30, 3));
    expect(governor.frame(at + 16, 16, true)).toBe(true);
  });
});

