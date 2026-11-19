import { afterEach, beforeEach, expect, it, vi } from "vitest";

/** The shared frame (lib/frame.ts, Part 16): reads, then writes, once each, a frame at a time. */

let callbacks: FrameRequestCallback[] = [];
const frame = () => {
  const now = callbacks;
  callbacks = [];
  for (const callback of now) callback(performance.now());
};

beforeEach(() => {
  callbacks = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => callbacks.push(callback));
  vi.resetModules();
});
afterEach(() => vi.unstubAllGlobals());

it("runs every read before any write, whatever order they were asked in", async () => {
  const { measure, mutate } = await import("@/lib/frame");
  const order: string[] = [];
  mutate(() => order.push("write 1"));
  measure(() => order.push("read 1"));
  mutate(() => order.push("write 2"));
  measure(() => order.push("read 2"));
  expect(order).toEqual([]);
  frame();
  expect(order).toEqual(["read 1", "read 2", "write 1", "write 2"]);
});

it("runs a job asked for twice in one frame once", async () => {
  const { measure, mutate } = await import("@/lib/frame");
  const read = vi.fn();
  const write = vi.fn();
  for (let i = 0; i < 5; i++) {
    measure(read);
    mutate(write);
  }
  frame();
  expect(read).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledTimes(1);
  expect(callbacks).toHaveLength(0);
});

it("runs a write a read asks for in the same frame, and asks for no frame it doesn't need", async () => {
  const { measure, mutate } = await import("@/lib/frame");
  const order: string[] = [];
  measure(() => {
    order.push("read");
    mutate(() => order.push("write"));
  });
  frame();
  expect(order).toEqual(["read", "write"]);
  expect(callbacks).toHaveLength(0);
});

it("leaves for the next frame whatever the writes ask for, and reads a read asks for", async () => {
  const { measure, mutate } = await import("@/lib/frame");
  const order: string[] = [];
  const again = () => order.push("next write");
  measure(() => {
    order.push("read");
    measure(() => order.push("next read"));
  });
  mutate(() => {
    order.push("write");
    mutate(again);
  });
  frame();
  expect(order).toEqual(["read", "write"]);
  frame();
  expect(order).toEqual(["read", "write", "next read", "next write"]);
});

it("keeps going when one job throws, and still reports it", async () => {
  const { measure, mutate } = await import("@/lib/frame");
  const reported = new Promise<unknown>((resolve) => vi.stubGlobal("queueMicrotask", (task: () => void) => {
    try {
      task();
    } catch (error) {
      resolve(error);
    }
  }));
  const after = vi.fn();
  measure(() => {
    throw new Error("a broken scene");
  });
  mutate(after);
  frame();
  expect(after).toHaveBeenCalledTimes(1);
  expect(await reported).toEqual(new Error("a broken scene"));
});
