import { MEDIA_LABELS, type MediaCursor } from "./config.ts";

/**
 * What the cursor should be over an element (DESIGN.md §6.1). States come from data-cursor
 * attributes and element roles. Native zones win outright; otherwise the closest match up
 * the tree wins, so a button inside a drag area is still a button.
 *
 *   data-cursor="open" | "play" | "view"   media or card: a glass circle with the label
 *   data-cursor="drag"                     drag area: a circle with ‹ ›
 *   data-cursor="magnetic" | "text" | "default" | "native"
 *   data-cursor-label="…"                  replaces a media label
 *   data-cursor-ink="light" | "dark"       the dot's ink over imagery it can't sample (ink.ts)
 */
export type CursorKind = "default" | "magnetic" | "text" | "media" | "drag" | "disabled" | "native";

export interface Resolution {
  kind: CursorKind;
  element: Element | null;
  label?: string;
}

/**
 * Where the system cursor does the job better: typing (the native I-beam), native menus,
 * embedded pages and video controls. styles/components.css exempts exactly these, and their
 * descendants, from `cursor: none`; tests/unit/cursor.test.ts keeps the two lists equal.
 */
export const NATIVE_SELECTORS = [
  "iframe",
  "select",
  "textarea",
  "video[controls]",
  "audio[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[data-cursor='native']",
  "input:not([type='checkbox'], [type='radio'], [type='submit'], [type='button'], [type='reset'], [type='range'], [type='color'], [type='file'], [type='image'], [type='hidden'])",
] as const;

const NATIVE = NATIVE_SELECTORS.join(", ");

const INTERACTIVE = [
  "a[href]",
  "button",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='menuitem']",
  "[role='option']",
  "input[type='checkbox']",
  "input[type='radio']",
  "input[type='submit']",
  "input[type='button']",
  "input[type='reset']",
  "input[type='color']",
  "input[type='file']",
  "input[type='image']",
].join(", ");

function isDisabled(element: Element): boolean {
  if (element.matches(":disabled, [aria-disabled='true']")) return true;
  if (element instanceof HTMLLabelElement) return Boolean(element.control?.matches(":disabled"));
  return false;
}

function interactive(element: Element): Resolution {
  return { kind: isDisabled(element) ? "disabled" : "magnetic", element };
}

export function resolveElement(start: Element | null): Resolution {
  if (!start) return { kind: "default", element: null };
  const native = start.closest(NATIVE);
  if (native) return { kind: "native", element: native };

  const top = start.ownerDocument.documentElement;
  for (let element: Element | null = start; element && element !== top; element = element.parentElement) {
    const declared = element.getAttribute("data-cursor");
    if (declared) {
      if (declared in MEDIA_LABELS) {
        const label = element.getAttribute("data-cursor-label") ?? MEDIA_LABELS[declared as MediaCursor];
        return { kind: "media", element, label };
      }
      if (declared === "drag" || declared === "text" || declared === "default") return { kind: declared, element };
      if (declared === "magnetic") return interactive(element);
    }
    if (element instanceof HTMLLabelElement) {
      if (element.control) return interactive(element);
      continue;
    }
    if (element.matches(INTERACTIVE)) return interactive(element);
    if (element.matches("input[type='range']")) return { kind: "drag", element };
  }
  return { kind: "default", element: null };
}

/** Whether an element holds text of its own, so the caret test is worth running. */
export function hasOwnText(element: Element): boolean {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
  }
  return false;
}

/** Chrome and Firefox have caretPositionFromPoint; Safari only the older caretRangeFromPoint. */
interface CaretApis {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
}

/** The computed line height of an element in pixels. */
export function lineHeightOf(element: Element): number {
  const style = getComputedStyle(element);
  const lineHeight = parseFloat(style.lineHeight);
  return Number.isFinite(lineHeight) ? lineHeight : parseFloat(style.fontSize) * 1.2;
}

/**
 * The line height of the text under a point, or null if the point isn't over a glyph.
 * Uses the caret APIs, then checks the character's own box, so the margins and gaps of a
 * paragraph don't count as text.
 */
export function textLineAt(x: number, y: number): number | null {
  const doc = document as unknown as CaretApis;
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    node = position?.offsetNode ?? null;
    offset = position?.offset ?? 0;
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    node = range?.startContainer ?? null;
    offset = range?.startOffset ?? 0;
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.parentElement) return null;
  const text = node as Text;
  const parent = text.parentElement!;
  const style = getComputedStyle(parent);
  const select = style.userSelect || style.getPropertyValue("-webkit-user-select");
  if (select === "none" || style.visibility === "hidden") return null;

  const range = document.createRange();
  for (const [from, to] of [
    [offset - 1, offset],
    [offset, offset + 1],
  ]) {
    if (from < 0 || to > text.length) continue;
    range.setStart(text, from);
    range.setEnd(text, to);
    for (const rect of Array.from(range.getClientRects())) {
      if (x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top && y <= rect.bottom) return lineHeightOf(parent);
    }
  }
  return null;
}
