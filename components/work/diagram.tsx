import type { CSSProperties, ReactNode } from "react";
import type { CaseStudy } from "@/content/derive";
import { DIAGRAM } from "@/lib/architecture";

const vars = (values: Record<string, number | string>) => values as CSSProperties;

/** Room around the drawing for the boxes' strokes. */
const PAD = 2;

/**
 * A case study's architecture (DESIGN.md §7.6), drawn top to bottom from the project's own
 * facts: each box at the step of its longest path, the arrows between them, and the boxes
 * without arrows as chips beneath. It draws itself as it scrolls into view, step by step,
 * from one scroll-driven variable (styles/components.css, --draw); without scroll-driven
 * animations, or with reduced motion, it's simply drawn. Screen readers get the steps as a
 * list.
 */
export function Diagram({ id, diagram, caption, marks }: { id: string; diagram: CaseStudy["diagram"]; caption: string; marks: ReactNode }) {
  const { down, apart } = diagram;
  const steps = Math.max(0, ...down.nodes.map((node) => node.step)) + 1;
  const targets = (id: string) => down.edges.filter((edge) => edge.from === id).map((edge) => down.nodes.find((node) => node.id === edge.to)?.label);
  const arrow = DIAGRAM.gap.down / 4;
  return (
    <figure className="case-diagram" style={vars({ "--steps": steps })} aria-labelledby={id}>
      <svg
        className="case-diagram-svg"
        viewBox={`${-PAD} ${-PAD} ${down.width + 2 * PAD} ${down.height + 2 * PAD}`}
        width={down.width + 2 * PAD}
        aria-hidden="true"
      >
        {down.edges.map((edge) => {
          const end = edge.d.split(" ").at(-1)!.split(",").map(Number);
          return (
            <g key={`${edge.from}-${edge.to}`} className="case-edge" data-dashed={edge.dashed || undefined} style={vars({ "--step": edge.step })}>
              <path className="case-edge-line" d={edge.d} pathLength={1} />
              <path className="case-edge-head" d={`M${end[0] - arrow},${end[1] - arrow}L${end[0]},${end[1]}L${end[0] + arrow},${end[1] - arrow}`} />
            </g>
          );
        })}
        {down.nodes.map((node) => {
          const text = node.lines.length * DIAGRAM.lineHeight + (node.detail ? DIAGRAM.box.detail : 0);
          const top = (node.height - text) / 2;
          return (
            <g key={node.id} className="case-node" style={vars({ "--step": node.step })}>
              <rect className="case-node-box" x={node.x} y={node.y} width={node.width} height={node.height} rx="14" />
              <text className="case-node-label" x={node.x + node.width / 2} textAnchor="middle">
                {node.lines.map((line, i) => (
                  <tspan key={i} x={node.x + node.width / 2} y={node.y + top + (i + 0.75) * DIAGRAM.lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
              {node.detail ? (
                <text className="case-node-detail" x={node.x + node.width / 2} y={node.y + top + node.lines.length * DIAGRAM.lineHeight + DIAGRAM.box.detail * 0.75} textAnchor="middle">
                  {node.detail}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <ol className="sr-only">
        {down.nodes.map((node) => {
          const next = targets(node.id);
          return (
            <li key={node.id}>
              {node.label}
              {node.detail ? ` (${node.detail})` : ""}
              {next.length > 0 ? `, then ${next.join(" and ")}` : ""}
            </li>
          );
        })}
      </ol>
      {apart.length > 0 ? (
        <ul className="case-apart">
          {apart.map((node) => (
            <li key={node.id} className="case-apart-chip">
              {node.label}
              {node.detail ? <span className="case-apart-detail"> · {node.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption className="case-diagram-caption">
        <span id={id}>{caption}</span>
        {marks}
      </figcaption>
    </figure>
  );
}
