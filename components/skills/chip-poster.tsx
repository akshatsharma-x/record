import type { CSSProperties, ReactNode } from "react";
import { CHIP, coreCells, explodedTop, explodedView, faceMatrix, LAYERS, points, slab } from "@/lib/chip";

const vars = (values: Record<string, number | string>) => values as CSSProperties;
const view = explodedView();
const u = CHIP.unit;
const h = (index: number) => (LAYERS[index].size / 2) * u;

/**
 * A grid of dots on a layer's face, in its local units: one dot, tiled by a pattern, so the
 * poster stays light (and so does the RSC payload that repeats it).
 */
function dots(index: number, n: number, inset: number, r: number, className: string) {
  const half = h(index) * (1 - inset);
  const step = (2 * half) / (n - 1);
  const id = `chip-dots-${index}`;
  return (
    <>
      <defs>
        <pattern id={id} x={-half - step / 2} y={-half - step / 2} width={step} height={step} patternUnits="userSpaceOnUse">
          <circle className={className} cx={step / 2} cy={step / 2} r={r} />
        </pattern>
      </defs>
      <rect x={-half - step / 2} y={-half - step / 2} width={2 * half + step} height={2 * half + step} fill={`url(#${id})`} />
    </>
  );
}

/** What's drawn on each layer's top face, in its local units (view units, middle at 0). */
const FACES: ((index: number) => ReactNode)[] = [
  // The die: a ring of cores around the engraved monogram.
  () => (
    <>
      {coreCells().map((cell, i) => (
        <rect
          key={i}
          className="chip-core"
          x={(cell.x - cell.size / 2) * u}
          y={(cell.z - cell.size / 2) * u}
          width={cell.size * u}
          height={cell.size * u}
          rx={cell.size * u * 0.18}
          style={vars({ "--ring": cell.ring })}
        />
      ))}
      <text className="chip-engraving" x="0" y="0" textAnchor="middle" dominantBaseline="central">
        AS
      </text>
    </>
  ),
  // The interposer: a field of micro-bumps.
  (index) => <>{dots(index, 9, 0.16, 2.2, "chip-bump")}</>,
  // The heat spreader: a recess where the die sits.
  (index) => <rect className="chip-recess" x={-h(index) * 0.62} y={-h(index) * 0.62} width={h(index) * 1.24} height={h(index) * 1.24} rx={h(index) * 0.08} />,
  // The routing: traces from the middle out to the edges.
  (index) => (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const side = i % 4;
        const along = -h(index) * 0.7 + Math.floor(i / 4) * h(index) * 0.7;
        const from = h(index) * 0.32;
        const to = h(index) * 0.9;
        const [x1, y1, x2, y2] = side === 0 ? [along, -from, along, -to] : side === 1 ? [from, along, to, along] : side === 2 ? [along, from, along, to] : [-from, along, -to, along];
        return <line key={i} className="chip-trace" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <rect className="chip-trace-pad" x={-h(index) * 0.32} y={-h(index) * 0.32} width={h(index) * 0.64} height={h(index) * 0.64} rx={4} />
    </>
  ),
  // The package: gold pads along its edges.
  (index) => (
    <>
      {Array.from({ length: 4 }, (_, side) =>
        Array.from({ length: 10 }, (_, i) => {
          const along = -h(index) * 0.72 + (i * h(index) * 1.44) / 9;
          const edge = h(index) * 0.86;
          const [x, y, w, hh] = side % 2 === 0 ? [along - 4, side === 0 ? -edge : edge - 6, 8, 6] : [side === 1 ? edge - 6 : -edge, along - 4, 6, 8];
          return <rect key={`${side}-${i}`} className="chip-pad" x={x} y={y} width={w} height={hh} rx={1.5} />;
        }),
      )}
    </>
  ),
  // The substrate: the contacts its solder balls sit under.
  (index) => <>{dots(index, 12, 0.1, 3.2, "chip-ball")}</>,
];

/**
 * The chip's poster (DESIGN.md §7.7): the exploded view the 3D scene settles into, drawn
 * in SVG from the same projection (lib/chip.ts), so it's crisp at any size. What LOW and OFF
 * tiers, reduced motion and no-JavaScript visitors see. Each layer slides out, like a card
 * from a deck, while its label is hovered or focused (styles/components.css).
 */
export function ChipPoster({ ids }: { ids: string[] }) {
  return (
    <svg
      className="chip-poster"
      viewBox={`${view.box.x} ${view.box.y} ${view.box.width} ${view.box.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Drawn bottom up, so each layer sits over the one beneath it. */}
      {LAYERS.map((layer, index) => ({ layer, index }))
        .reverse()
        .map(({ layer, index }) => {
          const top = explodedTop(index);
          const s = slab(layer, top);
          return (
            <g key={index} className="chip-layer" data-layer={ids[index]} data-index={index} style={vars({ "--slide": `${CHIP.slide * u}px` })}>
              <polygon className="chip-face chip-face-left" points={points(s.left)} />
              <polygon className="chip-face chip-face-right" points={points(s.right)} />
              <polygon className="chip-face chip-face-top" points={points(s.top)} />
              <g transform={faceMatrix(top)}>{FACES[index](index)}</g>
              <polyline className="chip-rim" points={points([s.top[3], s.top[0], s.top[1]])} />
            </g>
          );
        })}
    </svg>
  );
}
