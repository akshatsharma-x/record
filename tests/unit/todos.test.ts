import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { todoComments } from "@/content/todos";

const source = readFileSync(path.join(process.cwd(), "content", "data.ts"), "utf8");
const lines = source.split("\n");

describe("TODO(akshat) comments", () => {
  it("marks every null field in content/data.ts", () => {
    const unmarked = lines.flatMap((line, i) => {
      if (!/:\s*null\b/.test(line)) return [];
      // The marker sits on the same line or in the comment block directly above.
      let above = i - 1;
      const comments: string[] = [];
      while (above >= 0 && /^\s*\/\//.test(lines[above])) comments.push(lines[above--]);
      return [line, ...comments].some((text) => text.includes("TODO(akshat)")) ? [] : [`line ${i + 1}: ${line.trim()}`];
    });
    expect(unmarked).toEqual([]);
  });

  it("reads each comment with what it annotates", () => {
    const todos = todoComments(source);
    expect(todos.length).toBeGreaterThanOrEqual(41);
    expect(todos.every((todo) => todo.context.length > 0)).toBe(true);
    expect(todos.find((todo) => todo.context.startsWith("cityConfirmed"))?.note).toContain("inferred from the university");
  });

  it("joins a note that continues onto the next comment line", () => {
    const todos = todoComments(
      ["  // TODO(akshat): for each certificate, the title,", "  // the issuer and the date.", "  certificates: [],"].join(
        "\n",
      ),
    );
    expect(todos).toEqual([
      { line: 1, note: "for each certificate, the title, the issuer and the date.", context: "certificates: []," },
    ]);
  });
});
