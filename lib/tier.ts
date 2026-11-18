/**
 * Device tiers for 3D (DESIGN.md §10). HIGH and MID get the shared WebGL stage; LOW and
 * OFF get posters. `classifyTier` is pure and unit-tested; `detectTier` gathers the
 * signals in the browser, runs a one-second frame-time probe and caches the answer for
 * the session.
 */
import { SLOW_FRAME_MS, TIER_SESSION_KEY, VERY_SLOW_FRAME_MS } from "./frames";

export const TIERS = ["HIGH", "MID", "LOW", "OFF"] as const;
export type Tier = (typeof TIERS)[number];

export type GpuClass = "high" | "mid" | "low" | "software" | "unknown";

export interface TierSignals {
  webgl2: boolean;
  /** The unmasked renderer string, or null when the browser hides it. Safari says "Apple GPU". */
  renderer: string | null;
  /** navigator.deviceMemory in GB (Chromium only). */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency. */
  cores?: number;
  saveData?: boolean;
  reducedMotion: boolean;
  /** Average milliseconds per frame over the probe. */
  frameTime?: number;
}

export { SLOW_FRAME_MS, VERY_SLOW_FRAME_MS };

export function classifyGpu(renderer: string | null): GpuClass {
  if (!renderer) return "unknown";
  const r = renderer.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(r)) return "software";
  if (/apple (m\d|gpu)|apple a1[5-9]|geforce (rtx|gtx (9|1[0-9]))|rtx|radeon (rx|pro)|adreno \(?tm\)? (6[4-9]|7)\d|mali-g(7[1-9]|[89]\d|\d{3})|xclipse/.test(r)) {
    return "high";
  }
  if (/intel.*(iris|uhd|arc|xe)|apple a1[1-4]|adreno \(?tm\)? (5[4-9]|6[0-3])\d|mali-g(5\d|6\d)|radeon/.test(r)) return "mid";
  if (/intel.*hd graphics|adreno|mali|powervr|videocore|tegra/.test(r)) return "low";
  return "unknown";
}

const ORDER: Tier[] = ["OFF", "LOW", "MID", "HIGH"];
const lower = (tier: Tier, steps = 1): Tier => ORDER[Math.max(0, ORDER.indexOf(tier) - steps)];
const cap = (tier: Tier, ceiling: Tier): Tier => (ORDER.indexOf(tier) > ORDER.indexOf(ceiling) ? ceiling : tier);

export function classifyTier(signals: TierSignals): Tier {
  const gpu = classifyGpu(signals.renderer);
  if (!signals.webgl2 || gpu === "software" || signals.saveData) return "OFF";
  if (signals.reducedMotion) return "LOW";
  if ((signals.deviceMemory !== undefined && signals.deviceMemory <= 2) || (signals.cores !== undefined && signals.cores <= 2)) {
    return "LOW";
  }

  let tier: Tier = gpu === "high" ? "HIGH" : gpu === "low" ? "LOW" : "MID";
  if ((signals.deviceMemory !== undefined && signals.deviceMemory <= 4) || (signals.cores !== undefined && signals.cores <= 4)) {
    tier = cap(tier, "MID");
  }
  if (signals.frameTime !== undefined) {
    if (signals.frameTime > VERY_SLOW_FRAME_MS) tier = cap(tier, "LOW");
    else if (signals.frameTime > SLOW_FRAME_MS) tier = lower(tier);
  }
  return tier;
}

// ─── Browser ─────────────────────────────────────────────────────────────────

interface NavigatorSignals extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Everything but the frame-time probe. */
export function readSignals(reducedMotion: boolean): TierSignals {
  const nav = navigator as NavigatorSignals;
  let webgl2 = false;
  let renderer: string | null = null;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl) {
      webgl2 = true;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    renderer,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    saveData: nav.connection?.saveData,
    reducedMotion,
  };
}

/** Average frame time over `duration` milliseconds of requestAnimationFrame. */
export function probeFrameTime(duration = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let start = 0;
    const step = (time: number) => {
      if (!start) start = time;
      else frames += 1;
      if (time - start >= duration) resolve(frames > 0 ? (time - start) / frames : Infinity);
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export { TIER_SESSION_KEY };
export const TIER_OVERRIDE_KEY = "classyfolio:tier-override";

function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

/** A tier forced for testing (dev builds only), from ?tier= or the kitchen's selector. */
export function tierOverride(): Tier | null {
  if (process.env.NODE_ENV === "production") return null;
  const fromQuery = new URLSearchParams(window.location.search).get("tier")?.toUpperCase();
  if (isTier(fromQuery)) return fromQuery;
  try {
    const stored = sessionStorage.getItem(TIER_OVERRIDE_KEY);
    return isTier(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Detects the tier once per session. Reduced motion is always re-checked. */
export async function detectTier(reducedMotion: boolean): Promise<Tier> {
  const forced = tierOverride();
  if (forced) return forced;
  if (reducedMotion) return classifyTier({ ...readSignals(true) });
  try {
    const cached = sessionStorage.getItem(TIER_SESSION_KEY);
    if (isTier(cached)) return cached;
  } catch {
    // No session storage: probe every time.
  }
  const signals = readSignals(false);
  const quick = classifyTier(signals);
  const tier = quick === "OFF" || quick === "LOW" ? quick : classifyTier({ ...signals, frameTime: await probeFrameTime() });
  try {
    sessionStorage.setItem(TIER_SESSION_KEY, tier);
  } catch {
    // Fine: it's only a cache.
  }
  return tier;
}
