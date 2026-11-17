import * as THREE from "three";

/**
 * A color token as three.js reads it, from the CSS variable on the root, so 3D scenes use
 * the same palette (and the same finish) as the page. Safari reports color-mix() results
 * as color(srgb …).
 */
export function token(name: string): THREE.Color {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.documentElement.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
  return srgb ? new THREE.Color().setRGB(Number(srgb[1]), Number(srgb[2]), Number(srgb[3]), THREE.SRGBColorSpace) : new THREE.Color(value);
}

/** A three.js color as CSS, for drawing on a canvas. */
export const css = (color: THREE.Color) => `#${color.getHexString()}`;
