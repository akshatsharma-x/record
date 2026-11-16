import { prefersReducedMotion } from "@/lib/reduced-motion";
import { particleAlpha, particles } from "@/lib/research";
import { SLOW_FRAME_MS } from "@/lib/frames";

/**
 * The PM2.5 illustration's haze (DESIGN.md §7.5), on an inexpensive 2D canvas: a few
 * hundred soft sprites at most, drawn only when the density changes. A change eases in
 * over a fraction of a second while the particles drift with it, then the canvas rests:
 * nothing loops, so nothing needs pausing.
 *
 * It holds its frame rate or falls back to stills. A watchdog times each transition's
 * frames, and below about 40fps (or with Save-Data or reduced motion) every change is
 * drawn at once, as a still. The canvas carries data-still when it has fallen back.
 */

/** How quickly the shown density follows the target: a time constant, in seconds. */
const EASE_SECONDS = 0.14;
/** Frames a transition must last before the watchdog judges the frame rate. */
const WATCH_FRAMES = 12;
/** Particles per this many CSS pixels of scene, within the bounds below. */
const AREA_PER_PARTICLE = 1100;
const MIN_PARTICLES = 90;
const MAX_PARTICLES = 220;
/** Device pixels per CSS pixel: the haze is all soft edges, so a sharper canvas would buy
    nothing but four times the pixels to fill. */
const MAX_DPR = 1;
/** The sprite's size in device pixels, and how opaque each particle gets at its fullest:
    faint, so they merge into a haze rather than read as dots. */
const SPRITE = 64;
const PEAK_ALPHA = 0.2;
/** How far, in scene widths per second, particles drift while the haze changes. */
const WIND = 0.06;

export interface HazeEngine {
  setDensity(density: number): void;
  destroy(): void;
}

interface SaveDataNavigator extends Navigator {
  connection?: { saveData?: boolean };
}

export function createHazeEngine(canvas: HTMLCanvasElement): HazeEngine {
  const context = canvas.getContext("2d");
  if (!context) return { setDensity: () => {}, destroy: () => {} };
  const ctx = context;

  let width = 0;
  let height = 0;
  let field = particles(MIN_PARTICLES);
  let sprite: HTMLCanvasElement | null = null;
  let target = 0;
  let shown = 0;
  let drift = 0;
  let frame = 0;
  let last = 0;
  let watched: number[] = [];
  let still = prefersReducedMotion() || Boolean((navigator as SaveDataNavigator).connection?.saveData);
  if (still) canvas.setAttribute("data-still", "");

  /** A soft round sprite in the canvas's own color (its CSS color), drawn once. */
  const paintSprite = () => {
    const [r, g, b] = (getComputedStyle(canvas).color.match(/\d+(\.\d+)?/g) ?? ["128", "128", "128"]).map(Number);
    const art = document.createElement("canvas");
    art.width = SPRITE;
    art.height = SPRITE;
    const paint = art.getContext("2d");
    if (!paint) return null;
    const gradient = paint.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.85)`);
    gradient.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.3)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    paint.fillStyle = gradient;
    paint.fillRect(0, 0, SPRITE, SPRITE);
    return art;
  };

  const draw = () => {
    if (!sprite || width === 0 || height === 0) return;
    ctx.clearRect(0, 0, width, height);
    for (const particle of field) {
      const alpha = particleAlpha(particle, shown) * PEAK_ALPHA;
      if (alpha < 0.01) continue;
      const radius = particle.r * height;
      // Closer (bigger) particles drift further, which reads as depth.
      const span = width + radius * 2;
      const x = ((((particle.x * width + drift * width * (0.4 + particle.r * 4)) % span) + span) % span) - radius;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - radius, particle.y * height - radius, radius * 2, radius * 2);
    }
    ctx.globalAlpha = 1;
  };

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = Math.max(1, Math.round(box.width * ratio));
    height = Math.max(1, Math.round(box.height * ratio));
    canvas.width = width;
    canvas.height = height;
    const count = Math.round((box.width * box.height) / AREA_PER_PARTICLE);
    field = particles(Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, count)));
    sprite = paintSprite();
    draw();
  };

  const tick = (now: number) => {
    frame = 0;
    const elapsed = last ? (now - last) / 1000 : 1 / 60;
    if (last) watched.push(now - last);
    last = now;
    shown += (target - shown) * (1 - Math.exp(-elapsed / EASE_SECONDS));
    drift += elapsed * WIND * Math.sign(target - shown);
    if (Math.abs(target - shown) < 0.002) shown = target;
    draw();
    if (watched.length >= WATCH_FRAMES) {
      const mean = watched.reduce((sum, value) => sum + value, 0) / watched.length;
      watched = [];
      if (mean > SLOW_FRAME_MS) {
        still = true;
        canvas.setAttribute("data-still", "");
        shown = target;
        draw();
      }
    }
    if (shown !== target && !still) frame = requestAnimationFrame(tick);
    else last = 0;
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let primed = false;
  return {
    setDensity(density) {
      target = density;
      // The first density is the frame the page shows: drawn as it is, not eased into.
      if (!primed || still || prefersReducedMotion()) {
        primed = true;
        shown = target;
        draw();
        return;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
