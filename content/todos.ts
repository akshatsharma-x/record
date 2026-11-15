/**
 * Reads the TODO(akshat) comments out of a source file, for /dev/content. A note that
 * continues onto following comment lines is joined into one.
 */
export interface TodoComment {
  /** 1-based line of the TODO(akshat) marker. */
  line: number;
  /** What Akshat needs to provide or decide. Empty when the marker stands alone. */
  note: string;
  /** The code the comment annotates: the same line, or the next line of code. */
  context: string;
}

const MARKER = /\/\/\s*TODO\(akshat\)(?::\s*(.*))?$/;
const COMMENT = /^\s*\/\//;

export function todoComments(source: string): TodoComment[] {
  const lines = source.split("\n");
  const found: TodoComment[] = [];
  lines.forEach((text, i) => {
    const match = MARKER.exec(text);
    if (!match) return;
    let note = (match[1] ?? "").trim();
    let next = i + 1;
    // A comment-only line can continue onto the next comment lines.
    if (COMMENT.test(text)) {
      while (next < lines.length && COMMENT.test(lines[next]) && !MARKER.test(lines[next])) {
        note = `${note} ${lines[next].replace(COMMENT, "").trim()}`.trim();
        next += 1;
      }
    }
    const code = text.slice(0, match.index).trim();
    const context = code || (lines.slice(next).find((line) => line.trim() && !COMMENT.test(line)) ?? "").trim();
    found.push({ line: i + 1, note, context });
  });
  return found;
}
