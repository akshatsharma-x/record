// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ISLAND_TIMING, island, resetIsland, setIslandExpanded, useIsland } from "@/lib/island/store";
import { isEditable } from "@/lib/shortcuts";

const showing = () => useIsland.getState().current?.title ?? null;

describe("Island activities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetIsland();
  });
  afterEach(() => {
    resetIsland();
    vi.useRealTimers();
  });

  it("show for 2.2 seconds, then the pill returns", () => {
    island.show({ title: "Email copied" });
    expect(showing()).toBe("Email copied");
    vi.advanceTimersByTime(ISLAND_TIMING.activity - 1);
    expect(showing()).toBe("Email copied");
    vi.advanceTimersByTime(1);
    expect(showing()).toBeNull();
  });

  it("queue when they fire rapidly, each getting its full time", () => {
    island.show({ title: "Email copied" });
    island.show({ title: "Citation copied" });
    island.show({ title: "Finish: Pink City" });
    expect(useIsland.getState().queue.map((activity) => activity.title)).toEqual(["Citation copied", "Finish: Pink City"]);
    const seen = [showing()];
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(ISLAND_TIMING.activity);
      seen.push(showing());
    }
    expect(seen).toEqual(["Email copied", "Citation copied", "Finish: Pink City", null]);
  });

  it("say the same thing once, keeping it up instead", () => {
    island.show({ title: "Email copied", detail: "a@b.c" });
    vi.advanceTimersByTime(2000);
    island.show({ title: "Email copied", detail: "a@b.c" });
    expect(useIsland.getState().queue).toHaveLength(0);
    vi.advanceTimersByTime(2000);
    expect(showing()).toBe("Email copied");
    vi.advanceTimersByTime(ISLAND_TIMING.activity);
    expect(showing()).toBeNull();
  });

  it("wait while the Island is expanded, then get their full time", () => {
    island.show({ title: "Message sent" });
    setIslandExpanded(true);
    vi.advanceTimersByTime(ISLAND_TIMING.activity * 3);
    expect(showing()).toBe("Message sent");
    setIslandExpanded(false);
    vi.advanceTimersByTime(ISLAND_TIMING.activity - 1);
    expect(showing()).toBe("Message sent");
    vi.advanceTimersByTime(1);
    expect(showing()).toBeNull();
  });

  it("default to a neutral tone and get unique keys", () => {
    island.show({ title: "One" });
    island.show({ title: "Two", tone: "success" });
    const { current, queue } = useIsland.getState();
    expect(current?.tone).toBe("neutral");
    expect(queue[0].tone).toBe("success");
    expect(current?.key).not.toBe(queue[0].key);
  });
});

describe("single-key shortcuts", () => {
  it("never fire while typing", () => {
    document.body.innerHTML = `
      <input id="text"><input id="check" type="checkbox"><textarea id="area"></textarea>
      <div contenteditable="true"><span id="edited">x</span></div><button id="button">Go</button>`;
    const $ = (id: string) => document.getElementById(id);
    expect(isEditable($("text"))).toBe(true);
    expect(isEditable($("area"))).toBe(true);
    expect(isEditable($("edited"))).toBe(true);
    expect(isEditable($("check"))).toBe(false);
    expect(isEditable($("button"))).toBe(false);
    expect(isEditable(document.body)).toBe(false);
  });
});
