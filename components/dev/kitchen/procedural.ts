/**
 * Test imagery for the cursor playground (dev only): a photograph-like dusk landscape and a
 * slow pan across it as video. Everything is generated from numbers, so the kitchen needs
 * no asset files and stays free of color strings. Deterministic: the same picture every run.
 */

type RGB = [number, number, number];

const SKY: [number, RGB][] = [
  [0, [18, 34, 78]],
  [0.3, [58, 82, 150]],
  [0.5, [170, 140, 170]],
  [0.62, [248, 178, 122]],
];

const RIDGES: { base: number; waves: [number, number, number][]; color: RGB }[] = [
  { base: 0.6, waves: [[0.04, 3.1, 0.4], [0.02, 7.3, 1.9], [0.008, 19, 0.2]], color: [104, 86, 132] },
  { base: 0.68, waves: [[0.05, 2.3, 2.2], [0.025, 6.1, 0.7], [0.01, 23, 1.1]], color: [58, 54, 92] },
  { base: 0.78, waves: [[0.06, 1.7, 1.3], [0.03, 5.2, 2.9], [0.012, 17, 0.5]], color: [20, 28, 40] },
];

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function sky(v: number): RGB {
  for (let i = 1; i < SKY.length; i++) {
    const [stop, color] = SKY[i];
    const [previous, from] = SKY[i - 1];
    if (v <= stop) return mix(from, color, (v - previous) / (stop - previous));
  }
  return SKY[SKY.length - 1][1];
}

/** A small seeded generator, so the grain is the same every time. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export function paintPhoto(width: number, height: number): ImageData {
  const image = new ImageData(width, height);
  const grain = random(7);
  const sun = { x: 0.7 * width, y: 0.56 * height };
  const horizon = 0.86;
  for (let py = 0; py < height; py++) {
    const v = py / height;
    for (let px = 0; px < width; px++) {
      const u = px / width;
      let color = sky(Math.min(v, 0.62));
      // The sun and its glow.
      const distance = Math.hypot(px - sun.x, py - sun.y) / height;
      color = mix(color, [255, 228, 186], Math.max(0, 1 - distance / 0.32) ** 2.2 * 0.8);
      if (distance < 0.045) color = [255, 240, 214];
      // Three ridges, far to near.
      for (const ridge of RIDGES) {
        let line = ridge.base;
        for (const [amplitude, frequency, phase] of ridge.waves) line += amplitude * Math.sin(u * frequency * Math.PI + phase);
        if (v > line) color = mix(ridge.color, color, Math.max(0, 0.25 - (v - line) * 2));
      }
      // A lake that mirrors the sky, darker.
      if (v > horizon) {
        const mirrored = sky(Math.max(0, 2 * horizon - v - 0.1));
        const ripple = 0.5 + 0.5 * Math.sin(v * 220 + Math.sin(u * 13) * 2);
        color = mix([14, 20, 34], mirrored, 0.35 + 0.2 * ripple);
      }
      const noise = (grain() - 0.5) * 10;
      const index = (py * width + px) * 4;
      image.data[index] = color[0] + noise;
      image.data[index + 1] = color[1] + noise;
      image.data[index + 2] = color[2] + noise;
      image.data[index + 3] = 255;
    }
  }
  return image;
}

/** The photo as an object URL (revoke it when done). */
export async function photoUrl(width = 960, height = 600): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.putImageData(paintPhoto(width, height), 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? URL.createObjectURL(blob) : "";
}

/**
 * A slow pan across the photo as a live MediaStream, for <video>. Returns null where
 * canvas capture isn't supported. Call stop() to end it.
 */
export function panningVideo(width = 640, height = 400): { stream: MediaStream; stop(): void } | null {
  const canvas = document.createElement("canvas");
  if (typeof canvas.captureStream !== "function") return null;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const source = document.createElement("canvas");
  source.width = width * 2;
  source.height = height * 1.25;
  source.getContext("2d")?.putImageData(paintPhoto(source.width, source.height), 0, 0);
  let frame = 0;
  const started = performance.now();
  const draw = (now: number) => {
    const t = ((now - started) / 1000) % 24;
    const sway = (1 - Math.cos((t / 24) * 2 * Math.PI)) / 2;
    context.drawImage(source, sway * (source.width - width), sway * (source.height - height), width, height, 0, 0, width, height);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  const stream = canvas.captureStream(30);
  return {
    stream,
    stop() {
      cancelAnimationFrame(frame);
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
