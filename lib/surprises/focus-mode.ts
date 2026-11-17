import { define } from "./define.ts";

/** F: everything but the section under the pointer, or the focus, dims and softens. */
export const focusMode = define({ id: "focus-mode", section: "global", on: true });
