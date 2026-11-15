/**
 * The dot's ink (DESIGN.md §6.1): near-black over light, near-white over dark, always with
 * an outline in the other ink, so one of the two contrasts with anything. The ink follows
 * what's actually painted under the hotspot, top layer first (elementsFromPoint): a
 * data-cursor-ink declaration; the pixels of an image, a video or a 2D canvas; the nearest
 * background color, faded by its opacity and blended over what's behind it; and, when
 * nothing paints, the surface of the section (under the surface controller, sections are
 * transparent and a fixed backdrop paints them). Gradients fall back to the tone.
 */
export type Ink = "dark" | "light";
export type RGBA = [r: number, g: number, b: number, a: number];

/** The luminance where black and white contrast equally with a background: √(1.05 × 0.05) − 0.05. */
export const INK_THRESHOLD = Math.sqrt(1.05 * 0.05) - 0.05;

function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an sRGB color with 0–255 channels. */
export function luminance([r, g, b]: readonly number[]): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function inkFor(backgroundLuminance: number): Ink {
  return backgroundLuminance > INK_THRESHOLD ? "dark" : "light";
}

function alphaOf(value: string | undefined): number {
  if (value === undefined) return 1;
  return value.endsWith("%") ? parseFloat(value) / 100 : parseFloat(value);
}

/** Parses a color: #rgb, #rrggbb, rgb(), rgba() or color(srgb …). Channels 0–255, alpha 0–1. */
export function parseColor(value: string): RGBA | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join("") : hex[1];
    const n = parseInt(digits, 16);
    return [n >> 16, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(value.trim());
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alphaOf(rgb[4])];
  const srgb = /^color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(value.trim());
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, alphaOf(srgb[4])];
  return null;
}

let probe: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (probe === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    probe = canvas.getContext("2d", { willReadFrequently: true });
  }
  return probe;
}

/** Any CSS color, through the canvas: for spaces parseColor doesn't read (oklch, display-p3). */
function paintColor(value: string): RGBA | null {
  const ctx = context();
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

type Media = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

function isMedia(element: Element): element is Media {
  return element instanceof HTMLImageElement || element instanceof HTMLVideoElement || element instanceof HTMLCanvasElement;
}

function sourceSize(media: Media): [number, number] {
  if (media instanceof HTMLVideoElement) return [media.videoWidth, media.videoHeight];
  if (media instanceof HTMLImageElement) return [media.naturalWidth, media.naturalHeight];
  return [media.width, media.height];
}

/**
 * The ink for the pixels under (x, y), averaged over the dot's footprint, or null if they
 * can't be read: not loaded yet, cross-origin, or a WebGL canvas whose buffer is gone.
 */
export function sampleMedia(media: Media, x: number, y: number, radius: number): Ink | null {
  if (media instanceof HTMLImageElement && !media.complete) return null;
  if (media instanceof HTMLVideoElement && media.readyState < 2) return null;
  const [width, height] = sourceSize(media);
  const rect = media.getBoundingClientRect();
  if (!width || !height || !rect.width || !rect.height) return null;

  // Map the viewport point into the source, honoring object-fit (centered).
  const fit = media instanceof HTMLCanvasElement ? "fill" : getComputedStyle(media).objectFit;
  let scaleX = rect.width / width;
  let scaleY = rect.height / height;
  if (fit === "cover" || fit === "contain" || fit === "scale-down" || fit === "none") {
    let scale = fit === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    if (fit === "none") scale = 1;
    if (fit === "scale-down") scale = Math.min(1, scale);
    scaleX = scale;
    scaleY = scale;
  }
  const left = rect.left + (rect.width - width * scaleX) / 2;
  const top = rect.top + (rect.height - height * scaleY) / 2;
  const u = (x - radius - left) / scaleX;
  const v = (y - radius - top) / scaleY;
  const size = (2 * radius) / scaleX;
  if (u + size < 0 || v + size < 0 || u > width || v > height) return null;

  const ctx = context();
  if (!ctx) return null;
  try {
    ctx.clearRect(0, 0, 4, 4);
    ctx.drawImage(media, u, v, size, (2 * radius) / scaleY, 0, 0, 4, 4);
    const data = ctx.getImageData(0, 0, 4, 4).data;
    let sum = 0;
    let alpha = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += luminance([data[i], data[i + 1], data[i + 2]]);
      alpha += data[i + 3];
    }
    if (alpha / (data.length / 4) < 128) return null;
    return inkFor(sum / (data.length / 4));
  } catch {
    return null;
  }
}

/** The surface's tone: --tone-dark is 1 inside dark tones (styles/tokens.css). */
export function toneInk(element: Element): Ink {
  return getComputedStyle(element).getPropertyValue("--tone-dark").trim() === "1" ? "light" : "dark";
}

export interface InkReading {
  ink: Ink;
  /** True when the ink came from pixels that can change under a still pointer. */
  sampled: boolean;
}

function readColor(value: string): RGBA | null {
  if (!value || value === "transparent") return null;
  return parseColor(value) ?? paintColor(value);
}

/** `top` painted over an opaque `bottom`, by top's alpha. */
export function blend(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
}

function surfaceOf(element: Element): RGBA | null {
  return readColor(getComputedStyle(element).getPropertyValue("--color-surface").trim());
}

function settle(top: RGBA | null, backdrop: RGBA | null, fallback: Element | null): InkReading {
  if (top && backdrop) return { ink: inkFor(luminance(blend(top, backdrop))), sampled: false };
  if (top) return { ink: inkFor(luminance(top)), sampled: false };
  if (backdrop) return { ink: inkFor(luminance(backdrop)), sampled: false };
  return { ink: fallback ? toneInk(fallback) : "dark", sampled: false };
}

/** The ink for the dot at (x, y). `start` is the element under the pointer. */
export function inkAt(start: Element | null, x: number, y: number, radius: number): InkReading {
  const stack = document.elementsFromPoint(x, y);
  if (stack.length === 0 && start) stack.push(start);
  /** The nearest background, if it's translucent: it still needs what's behind it. */
  let top: RGBA | null = null;
  for (const element of stack) {
    if (!top) {
      const declared = element.getAttribute("data-cursor-ink");
      if (declared === "light" || declared === "dark") return { ink: declared, sampled: false };
      if (isMedia(element)) {
        const ink = sampleMedia(element, x, y, radius);
        if (ink) return { ink, sampled: true };
        continue;
      }
    }
    const style = getComputedStyle(element);
    if (style.backgroundImage !== "none") return top ? settle(top, surfaceOf(element), element) : settle(null, null, element);
    const color = readColor(style.backgroundColor);
    if (color && color[3] >= 0.5) {
      const opacity = parseFloat(style.opacity);
      const layer: RGBA = [color[0], color[1], color[2], color[3] * (Number.isFinite(opacity) ? opacity : 1)];
      if (top) return settle(top, blend(layer, surfaceOf(element) ?? [255, 255, 255, 1]), element);
      if (layer[3] >= 0.95) return settle(layer, null, element);
      top = layer;
      continue;
    }
    // A transparent section: the surface controller's backdrop paints it.
    if (element.hasAttribute("data-section")) return settle(top, surfaceOf(element), element);
  }
  return settle(top, start ? surfaceOf(start) : null, start);
}
