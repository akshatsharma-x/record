/**
 * Frame-time thresholds, shared by the 3D tier probe (lib/tier.ts) and the research haze's
 * watchdog (lib/haze.ts). A tiny module of its own, so the haze doesn't bring the tier's
 * GPU classification into first-load JavaScript.
 */

/** Above this many milliseconds a frame, a device drops a tier: slower than ~40fps. */
export const SLOW_FRAME_MS = 24;
/** Above this, it drops straight to posters: slower than ~25fps. */
export const VERY_SLOW_FRAME_MS = 40;
