import { define } from "./define.ts";

/** Clicking the name morphs it into Devanagari, with what it means. Off until Akshat approves it. */
export const devanagariName = define({ id: "devanagari-name", section: "hero", on: false });

/**
 * The morph (DESIGN.md §8), attached to the name's heading once it's near, as a section's
 * behavior is (components/ui/behavior.tsx): a click turns the first name into अक्षत and
 * shows what it means; another turns it back. Purely optional, so it's the pointer's, and a
 * click that ends a text selection is left alone.
 */
export function attachNameMorph(name: HTMLElement): () => void {
  const note = name.parentElement?.querySelector(".hero-name-note");
  const onClick = () => {
    if (window.getSelection()?.toString()) return;
    const morphed = !name.hasAttribute("data-morphed");
    name.toggleAttribute("data-morphed", morphed);
    note?.toggleAttribute("data-shown", morphed);
  };
  name.addEventListener("click", onClick);
  return () => name.removeEventListener("click", onClick);
}
