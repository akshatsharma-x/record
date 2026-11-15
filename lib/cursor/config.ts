/**
 * Cursor behavior (DESIGN.md §6.1, Part 3). Sizes live in styles/tokens.css (--cursor-*);
 * the engine reads them from there, so CSS and JavaScript never disagree.
 */
export const CURSOR = {
  /** Shake to locate: at least this many fast horizontal reversals inside the window. */
  shake: {
    reversals: 4,
    windowMs: 600,
    /** A stroke must travel this far (px) and this fast (px/ms) to count. */
    minTravel: 24,
    minSpeed: 0.6,
    /** A gap this long between moves ends the stroke: resting isn't shaking. */
    pauseMs: 120,
    /** How long the dot stays grown before it springs back. */
    growMs: 700,
  },
  /** After this long without movement, one soft ring pulses from the dot. */
  idleMs: 3000,
  /** If no animation frame arrives this long while the pointer moves, use the system cursor. */
  watchdogMs: 500,
  /** Moves at least this far apart (ms) count as the pointer genuinely moving, not a backlog. */
  watchdogSpacingMs: 12,
  watchdogMoves: 8,
  /** A route change shows the spinner only if it takes longer than this, so instant ones don't flash. */
  navigatingDelayMs: 120,
  /** How often to check whether the route has changed, and when to give up. */
  navigatingPollMs: 100,
  navigatingTimeoutMs: 8000,
  /** Images and video are sampled again after this long, as the pointer moves over them. */
  sampleEveryMs: 150,
  /** Bigger targets don't morph the shape around themselves; they keep the dot. */
  magnetMax: { width: 480, height: 160 },
  /** The shape counts as settled within this many pixels. */
  restPx: 0.05,
} as const;

/** The labels a media or card target can carry (data-cursor="open" | "play" | "view"). */
export const MEDIA_LABELS = { open: "Open", play: "Play", view: "View" } as const;
export type MediaCursor = keyof typeof MEDIA_LABELS;
