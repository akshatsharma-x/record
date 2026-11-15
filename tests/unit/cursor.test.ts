// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { CURSOR } from "@/lib/cursor/config";
import { blend, INK_THRESHOLD, inkFor, luminance, parseColor } from "@/lib/cursor/ink";
import { startsNavigation } from "@/lib/cursor/navigation";
import { NATIVE_SELECTORS, resolveElement } from "@/lib/cursor/resolve";
import { CURSOR_LARGE_KEY, CURSOR_SYSTEM_KEY, useCursorSettings } from "@/lib/cursor/settings";
import { createShakeDetector } from "@/lib/cursor/shake";

// ─── Shake to locate ─────────────────────────────────────────────────────────

/** Strokes of `travel` px, each taking `ms`, sampled every 8ms. */
function strokes(count: number, travel: number, ms: number, start = 0) {
  const points: [number, number][] = [];
  let t = start;
  let x = 500;
  for (let stroke = 0; stroke < count; stroke++) {
    const direction = stroke % 2 === 0 ? 1 : -1;
    for (let elapsed = 8; elapsed <= ms; elapsed += 8) points.push([x + direction * travel * (elapsed / ms), (t += 8)]);
    x += direction * travel;
  }
  return points;
}

function shaken(points: [number, number][]) {
  const detector = createShakeDetector();
  return points.some(([x, t]) => detector.push(x, t));
}

describe("shake to locate", () => {
  it("fires on four fast horizontal reversals inside 600ms", () => {
    expect(shaken(strokes(5, 120, 80))).toBe(true);
  });

  it("needs four reversals, not three", () => {
    expect(shaken(strokes(4, 120, 80))).toBe(false);
  });

  it("ignores slow sweeps and small jitter", () => {
    expect(shaken(strokes(8, 120, 400))).toBe(false);
    expect(shaken(strokes(8, CURSOR.shake.minTravel - 4, 24))).toBe(false);
  });

  it("ignores reversals spread over more than the window", () => {
    // Fast strokes, but 250ms each: the fourth reversal comes 750ms after the first.
    expect(shaken(strokes(5, 300, 250))).toBe(false);
  });

  it("starts a new stroke after a rest", () => {
    const detector = createShakeDetector();
    // A long rest, then a quick move: the rest isn't part of the stroke.
    expect(detector.push(500, 0)).toBe(false);
    const points = strokes(5, 120, 80, 5000);
    expect(points.some(([x, t]) => detector.push(x, t))).toBe(true);
  });

  it("fires once per shake", () => {
    const detector = createShakeDetector();
    const fired = strokes(5, 120, 80).filter(([x, t]) => detector.push(x, t));
    expect(fired).toHaveLength(1);
  });
});

// ─── States ──────────────────────────────────────────────────────────────────

function render(markup: string) {
  document.body.innerHTML = markup;
  return (selector: string) => document.querySelector(selector)!;
}

describe("the cursor's state", () => {
  it("is magnetic over links, buttons and labelled controls", () => {
    const $ = render(`
      <a id="link" href="/work"><span id="inner">Work</span></a>
      <button id="button">Send</button>
      <label id="label"><input type="checkbox"> Remember</label>
      <div role="tab" id="tab">Tab</div>`);
    expect(resolveElement($("#inner"))).toEqual({ kind: "magnetic", element: $("#link") });
    expect(resolveElement($("#button")).kind).toBe("magnetic");
    expect(resolveElement($("#label"))).toEqual({ kind: "magnetic", element: $("#label") });
    expect(resolveElement($("#tab")).kind).toBe("magnetic");
  });

  it("shows disabled controls as disabled", () => {
    const $ = render(`
      <button id="off" disabled>Send</button>
      <a id="inert" href="/" aria-disabled="true">Soon</a>
      <label id="label"><input type="radio" disabled> Option</label>`);
    expect(resolveElement($("#off")).kind).toBe("disabled");
    expect(resolveElement($("#inert")).kind).toBe("disabled");
    expect(resolveElement($("#label")).kind).toBe("disabled");
  });

  it("reads data-cursor, with labels for media and cards", () => {
    const $ = render(`
      <figure id="photo" data-cursor="open"><img id="image" alt=""></figure>
      <div id="reel" data-cursor="play" data-cursor-label="Watch"></div>
      <div id="timeline" data-cursor="drag"><span id="year">2026</span></div>
      <p id="quote" data-cursor="text">Quote</p>`);
    expect(resolveElement($("#image"))).toEqual({ kind: "media", element: $("#photo"), label: "Open" });
    expect(resolveElement($("#reel")).label).toBe("Watch");
    expect(resolveElement($("#year"))).toEqual({ kind: "drag", element: $("#timeline") });
    expect(resolveElement($("#quote")).kind).toBe("text");
  });

  it("lets the closest match win: a button inside a drag area is a button", () => {
    const $ = render(`<div data-cursor="drag"><button id="next">Next</button></div>`);
    expect(resolveElement($("#next")).kind).toBe("magnetic");
  });

  it("gives native zones the system cursor, whatever is inside them", () => {
    const $ = render(`
      <input id="text" type="text"> <input id="search" type="search"> <textarea id="area"></textarea>
      <select id="menu"><option id="option">One</option></select> <iframe id="frame"></iframe>
      <video id="video" controls></video>
      <div contenteditable="true"><a id="edited" href="/">Link</a></div>
      <div data-cursor="native"><button id="opted">Out</button></div>
      <div contenteditable="false"><p id="plain">Not editable</p></div>`);
    for (const id of ["text", "search", "area", "menu", "option", "frame", "video", "edited", "opted"]) {
      expect(resolveElement($(`#${id}`)).kind, id).toBe("native");
    }
    expect(resolveElement($("#plain")).kind).toBe("default");
  });

  it("treats checkboxes as controls and sliders as drag areas", () => {
    const $ = render(`<input id="box" type="checkbox"><input id="range" type="range">`);
    expect(resolveElement($("#box")).kind).toBe("magnetic");
    expect(resolveElement($("#range")).kind).toBe("drag");
  });

  it("is the default elsewhere", () => {
    const $ = render(`<main><p id="text">Words</p></main>`);
    expect(resolveElement($("#text"))).toEqual({ kind: "default", element: null });
    expect(resolveElement(null).kind).toBe("default");
  });
});

describe("native zones", () => {
  it("are exempted from cursor: none in CSS exactly as the engine lists them", () => {
    const css = readFileSync(path.join(process.cwd(), "styles", "components.css"), "utf8");
    const rule = /html\.cursor-custom body :not\(:is\((.+?)\), :is\(\1\) \*\)/.exec(css);
    expect(rule, "the cursor: none rule").not.toBeNull();
    expect(rule![1]).toBe(NATIVE_SELECTORS.join(", "));
    expect(css).toContain(`:where(html.cursor-custom) :where(:is(${rule![1]}), :is(${rule![1]}) *)`);
  });
});

// ─── Ink ─────────────────────────────────────────────────────────────────────

describe("the dot's ink", () => {
  it("reads the colors browsers compute", () => {
    expect(parseColor("rgb(29, 29, 31)")).toEqual([29, 29, 31, 1]);
    expect(parseColor("rgba(0, 0, 0, 0.4)")).toEqual([0, 0, 0, 0.4]);
    expect(parseColor("rgb(255 255 255 / 72%)")).toEqual([255, 255, 255, 0.72]);
    expect(parseColor("color(srgb 0 0.4 0.8)")).toEqual([0, 102, 204, 1]);
    expect(parseColor("color(srgb 1 1 1 / 0.5)")).toEqual([255, 255, 255, 0.5]);
    expect(parseColor("#06c")).toEqual([0, 102, 204, 1]);
    expect(parseColor("oklch(0.5 0.1 200)")).toBeNull();
  });

  it("is dark over light and light over dark, split where both contrast equally", () => {
    expect(INK_THRESHOLD).toBeCloseTo(0.179, 3);
    expect(inkFor(luminance([255, 255, 255]))).toBe("dark");
    expect(inkFor(luminance([0, 0, 0]))).toBe("light");
    // Mid-gray (#808080) is just lighter than the split: dark ink, 3.8:1.
    expect(inkFor(luminance([128, 128, 128]))).toBe("dark");
    // Contrail on light (#0066CC) takes light ink: dark ink would be 2.9:1.
    expect(inkFor(luminance([0, 102, 204]))).toBe("light");
  });

  it("blends a translucent background over what's behind it", () => {
    // A disabled accent button at 40% over white reads as light.
    const faded = blend([0, 102, 204, 0.4], [255, 255, 255, 1]);
    expect(inkFor(luminance(faded))).toBe("dark");
  });
});

// ─── Navigating ──────────────────────────────────────────────────────────────

describe("the navigating spinner", () => {
  const here = { href: "https://akshat.dev/work", origin: "https://akshat.dev", pathname: "/work", search: "" };
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  const link = (attributes: string) => {
    document.body.innerHTML = `<a ${attributes}>Link</a>`;
    return document.querySelector("a")!;
  };

  it("starts for a plain click on a link to another page of the site", () => {
    expect(startsNavigation(click, link(`href="/about"`), here)).toBe(true);
    expect(startsNavigation(click, link(`href="/work?year=2026"`), here)).toBe(true);
    expect(startsNavigation(click, link(`href="https://akshat.dev/research"`), here)).toBe(true);
  });

  it("doesn't start for the same page, other sites, new tabs, downloads or modified clicks", () => {
    expect(startsNavigation(click, link(`href="#experience"`), here)).toBe(false);
    expect(startsNavigation(click, link(`href="/work#cartographer"`), here)).toBe(false);
    expect(startsNavigation(click, link(`href="https://github.com/"`), here)).toBe(false);
    expect(startsNavigation(click, link(`href="/about" target="_blank"`), here)).toBe(false);
    expect(startsNavigation(click, link(`href="/about" download`), here)).toBe(false);
    expect(startsNavigation(click, link(`href="/about" aria-disabled="true"`), here)).toBe(false);
    expect(startsNavigation({ ...click, metaKey: true }, link(`href="/about"`), here)).toBe(false);
    expect(startsNavigation({ ...click, button: 1 }, link(`href="/about"`), here)).toBe(false);
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

describe("cursor settings", () => {
  beforeEach(() => {
    localStorage.clear();
    useCursorSettings.setState({ large: false, system: false });
  });

  it("start at the defaults: the custom cursor at its normal size", () => {
    useCursorSettings.getState().sync();
    expect(useCursorSettings.getState()).toMatchObject({ large: false, system: false });
  });

  it("persist, and are read back after a reload", () => {
    useCursorSettings.getState().setLarge(true);
    useCursorSettings.getState().setSystem(true);
    expect(localStorage.getItem(CURSOR_LARGE_KEY)).toBe("1");
    expect(localStorage.getItem(CURSOR_SYSTEM_KEY)).toBe("1");
    useCursorSettings.setState({ large: false, system: false });
    useCursorSettings.getState().sync();
    expect(useCursorSettings.getState()).toMatchObject({ large: true, system: true });
    useCursorSettings.getState().setSystem(false);
    expect(localStorage.getItem(CURSOR_SYSTEM_KEY)).toBeNull();
  });
});
