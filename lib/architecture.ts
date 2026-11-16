/**
 * A case study's architecture diagram (DESIGN.md §7.6), laid out: each box in the column
 * of its longest path from a start, boxes in a column in content's order, arrows from one
 * side to the next. Boxes with no arrows stand apart, as chips under the drawing. Laid out
 * twice: across, for wide screens, and down, for phones. Pure, so tests pin it.
 *
 * Runs under plain Node for content/derive.ts: no path aliases.
 */

export interface DiagramNode {
  id: string;
  label: string;
  detail?: string;
}

export type DiagramEdge = [from: string, to: string] | [from: string, to: string, kind: "dashed"];

export interface PlacedNode extends DiagramNode {
  /** Its step: the column across, the row down. */
  step: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The label in at most two lines. */
  lines: string[];
}

export interface PlacedEdge {
  from: string;
  to: string;
  dashed: boolean;
  /** Its step, for drawing in order. */
  step: number;
  /** An SVG path written in "x,y" pairs. */
  d: string;
}

export interface DiagramLayout {
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

export const DIAGRAM = {
  box: { width: 168, height: 56, detail: 18 },
  gap: { across: 48, down: 28 },
  /** About this many characters fit a line of a box's label. */
  line: 18,
  /** A label line's height, for a 15px label (styles/tokens.css, --diagram-label). */
  lineHeight: 18,
} as const;

const round = (value: number) => Math.round(value * 10) / 10;
const pair = (x: number, y: number) => `${round(x)},${round(y)}`;

/** A label in lines of about DIAGRAM.line characters, at most two. */
export function lines(label: string): string[] {
  const words = label.split(/\s+/);
  const out: string[] = [];
  for (const word of words) {
    const last = out.at(-1);
    if (last !== undefined && (last + " " + word).length <= DIAGRAM.line) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out.length <= 2 ? out : [out[0], out.slice(1).join(" ")];
}

/** Each connected box's step: the length of the longest path to it from a box nothing points to. */
export function steps(nodes: readonly DiagramNode[], edges: readonly DiagramEdge[]): Map<string, number> {
  const incoming = new Map(nodes.map((node) => [node.id, [] as string[]]));
  for (const [from, to] of edges) incoming.get(to)?.push(from);
  const connected = new Set(edges.flatMap(([from, to]) => [from, to]));
  const memo = new Map<string, number>();
  const depth = (id: string, seen: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) throw new Error(`the diagram loops at "${id}"`);
    seen.add(id);
    const value = Math.max(-1, ...(incoming.get(id) ?? []).map((from) => depth(from, seen))) + 1;
    seen.delete(id);
    memo.set(id, value);
    return value;
  };
  return new Map(nodes.filter((node) => connected.has(node.id)).map((node) => [node.id, depth(node.id, new Set())]));
}

/** The boxes with no arrows: they stand apart from the drawing. */
export function apart(nodes: readonly DiagramNode[], edges: readonly DiagramEdge[]): DiagramNode[] {
  const connected = new Set(edges.flatMap(([from, to]) => [from, to]));
  return nodes.filter((node) => !connected.has(node.id));
}

/** The diagram laid out across (steps left to right) or down (steps top to bottom). */
export function layout(nodes: readonly DiagramNode[], edges: readonly DiagramEdge[], direction: "across" | "down"): DiagramLayout {
  const depth = steps(nodes, edges);
  const placed = nodes.filter((node) => depth.has(node.id));
  const columns = Math.max(0, ...depth.values()) + 1;
  const byStep = Array.from({ length: columns }, (_, step) => placed.filter((node) => depth.get(node.id) === step));
  const across = direction === "across";
  const { box, gap } = DIAGRAM;
  const tall = (node: DiagramNode) => box.height + (node.detail ? box.detail : 0);
  // Every box in a step gets the step's tallest height, so arrows meet them square.
  const stepHeight = byStep.map((group) => Math.max(...group.map(tall)));
  const widest = Math.max(...byStep.map((group) => group.length));
  const rowHeight = Math.max(...stepHeight);

  const out: PlacedNode[] = [];
  byStep.forEach((group, step) => {
    group.forEach((node, index) => {
      const offset = index - (group.length - 1) / 2;
      const x = across ? step * (box.width + gap.across) : (widest - 1) / 2 * (box.width + gap.across) + offset * (box.width + gap.across);
      const y = across
        ? (widest - 1) / 2 * (rowHeight + gap.down) + offset * (rowHeight + gap.down) + (rowHeight - stepHeight[step]) / 2
        : byStep.slice(0, step).reduce((sum, _, i) => sum + stepHeight[i] + gap.down, 0);
      out.push({ ...node, step, x: round(x), y: round(y), width: box.width, height: stepHeight[step], lines: lines(node.label) });
    });
  });

  const at = new Map(out.map((node) => [node.id, node]));
  const arrows: PlacedEdge[] = edges.flatMap(([from, to, kind]) => {
    const a = at.get(from);
    const b = at.get(to);
    if (!a || !b) return [];
    if (across) {
      const x1 = a.x + a.width;
      const y1 = a.y + a.height / 2;
      const x2 = b.x;
      const y2 = b.y + b.height / 2;
      const mid = (x1 + x2) / 2;
      return [{ from, to, dashed: kind === "dashed", step: a.step, d: `M${pair(x1, y1)}C${pair(mid, y1)} ${pair(mid, y2)} ${pair(x2, y2)}` }];
    }
    const x1 = a.x + a.width / 2;
    const y1 = a.y + a.height;
    const x2 = b.x + b.width / 2;
    const y2 = b.y;
    const mid = (y1 + y2) / 2;
    return [{ from, to, dashed: kind === "dashed", step: a.step, d: `M${pair(x1, y1)}C${pair(x1, mid)} ${pair(x2, mid)} ${pair(x2, y2)}` }];
  });

  const width = across ? columns * box.width + (columns - 1) * gap.across : widest * box.width + (widest - 1) * gap.across;
  const height = across ? widest * rowHeight + (widest - 1) * gap.down : stepHeight.reduce((sum, h) => sum + h, 0) + (columns - 1) * gap.down;
  return { width: round(width), height: round(height), nodes: out, edges: arrows };
}
