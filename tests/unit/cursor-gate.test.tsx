// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

/**
 * Where the custom cursor runs (DESIGN.md §6.1, Part 15): wherever a fine pointer that can
 * hover is attached, so an iPad with a trackpad gets it although its main pointer is a
 * finger, and never under forced colors. Each device here answers matchMedia as it would.
 */

const createCursor = vi.fn(() => ({ destroy: vi.fn(), setLarge: vi.fn() }));
vi.mock("@/lib/cursor/controller", () => ({ createCursor }));

type Device = Record<string, boolean>;

/** What each device's media features say. */
const DEVICES: Record<string, Device> = {
  mac: { "hover: hover": true, "pointer: fine": true, "any-hover: hover": true, "any-pointer: fine": true },
  "iPad with a trackpad": { "hover: hover": false, "pointer: fine": false, "any-hover: hover": true, "any-pointer: fine": true },
  "iPad, touch only": { "hover: hover": false, "pointer: fine": false, "any-hover: hover": false, "any-pointer: fine": false },
  iPhone: { "hover: hover": false, "pointer: fine": false, "any-hover: hover": false, "any-pointer: fine": false },
};

/** A media query list for a query of "(a) and (b)" features, as the device answers them. */
function mediaFor(device: Device, forced: boolean) {
  return (query: string) => {
    const features = Array.from(query.matchAll(/\(([^)]+)\)/g), (match) => match[1].trim());
    const matches = features.every((feature) => (feature === "forced-colors: active" ? forced : feature === "forced-colors: none" ? !forced : device[feature] === true));
    return { matches, media: query, addEventListener: () => {}, removeEventListener: () => {} };
  };
}

beforeEach(() => {
  createCursor.mockClear();
  HTMLElement.prototype.showPopover ??= function showPopover() {};
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function mounts(device: Device, forced = false): Promise<boolean> {
  vi.stubGlobal("matchMedia", vi.fn(mediaFor(device, forced)));
  const { Cursor } = await import("@/components/cursor/cursor");
  render(<Cursor />);
  // The engine is a lazy chunk: give the import its turn.
  await new Promise((resolve) => setTimeout(resolve, 20));
  return createCursor.mock.calls.length > 0;
}

it("runs on a Mac", async () => {
  await waitFor(async () => expect(await mounts(DEVICES.mac)).toBe(true));
});

it("runs on an iPad with a trackpad, though its main pointer is a finger", async () => {
  expect(await mounts(DEVICES["iPad with a trackpad"])).toBe(true);
});

it("stays out of the way on touch alone", async () => {
  expect(await mounts(DEVICES["iPad, touch only"])).toBe(false);
  expect(await mounts(DEVICES.iPhone)).toBe(false);
});

it("leaves forced colors the system's cursor", async () => {
  expect(await mounts(DEVICES.mac, true)).toBe(false);
  expect(await mounts(DEVICES["iPad with a trackpad"], true)).toBe(false);
});

it("hides the native cursor under the same conditions it runs in", () => {
  const css = readFileSync(path.join(process.cwd(), "styles", "components.css"), "utf8");
  const source = readFileSync(path.join(process.cwd(), "components", "cursor", "cursor.tsx"), "utf8");
  const gate = source.match(/const FINE_POINTER = "([^"]+)"/)?.[1];
  expect(gate).toBe("(any-hover: hover) and (any-pointer: fine)");
  // The rule that hides the native cursor while the custom one runs.
  const hides = css.match(/@media ([^{]+) \{\s*html\.cursor-custom,/)?.[1];
  expect(hides).toBe(`${gate} and (forced-colors: none)`);
});
