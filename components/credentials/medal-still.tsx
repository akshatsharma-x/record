import { backEngraving, type Engraving, faceEngraving, inset, MEDAL, type MedalShape, outline, svgPath } from "@/lib/medals";

const SIZE = 240;
const RADIUS = 100;
const y = (value: number) => Math.round((SIZE / 2 - value * RADIUS) * 100) / 100;

function Engraved({ engraving, className }: { engraving: Engraving; className: string }) {
  return (
    <g className={className} textAnchor="middle" dominantBaseline="central">
      {engraving.rule ? (
        <line
          className="medal-rule"
          x1={SIZE / 2 - engraving.rule.half * RADIUS}
          x2={SIZE / 2 + engraving.rule.half * RADIUS}
          y1={y(engraving.rule.y)}
          y2={y(engraving.rule.y)}
        />
      ) : null}
      {engraving.runs.map((run) => (
        <text
          key={`${run.text}-${run.y}`}
          className={run.caps ? "medal-caps" : undefined}
          x={SIZE / 2}
          y={y(run.y)}
          fontSize={Math.round(run.size * RADIUS * 10) / 10}
          fontWeight={run.weight}
        >
          {run.text}
        </text>
      ))}
    </g>
  );
}

/**
 * One face of the still: the brushed body and its bevel, the rim's step down to the field,
 * then the field itself (the enamel on the front, bare metal on the back) and what's
 * engraved there. Its shapes and gradients are the medal's own, drawn once (Defs).
 */
function Face({ id, side, engraving }: { id: string; side: "front" | "back"; engraving: Engraving }) {
  const ref = (name: string) => `#medal-${id}-${name}`;
  const fill = (name: string) => `url(#medal-${id}-${name})`;
  return (
    <svg className="medal-face" data-face={side} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <use href={ref("body")} fill={fill("metal")} />
      <use href={ref("body")} fill={fill("brush")} />
      <use href={ref("body")} className="medal-bevel" stroke={fill("bevel")} />
      <use href={ref("rim")} className="medal-step" stroke={fill("step")} />
      {side === "front" ? (
        <>
          <use href={ref("field")} className="medal-enamel" />
          <use href={ref("field")} fill={fill("gloss")} />
        </>
      ) : (
        <>
          <use href={ref("field")} fill={fill("metal")} />
          <use href={ref("field")} fill={fill("brush")} />
        </>
      )}
      <use href={ref("field")} className="medal-step" stroke={fill("step")} />
      {/* Engraved: a shadow a hair below, then the letters. */}
      <Engraved engraving={engraving} className={side === "front" ? "medal-cut medal-cut-shadow" : "medal-cut medal-cut-light"} />
      <Engraved engraving={engraving} className={side === "front" ? "medal-cut medal-inlay" : "medal-cut medal-etch"} />
    </svg>
  );
}

/** A medal's shapes and gradients, once for both faces. */
function Defs({ id, shape }: { id: string; shape: MedalShape }) {
  const edge = outline(shape, MEDAL.stillSamples);
  const key = `medal-${id}`;
  return (
    <svg className="medal-defs" aria-hidden="true" focusable="false">
      <defs>
        <path id={`${key}-body`} d={svgPath(edge, SIZE, RADIUS)} />
        <path id={`${key}-rim`} d={svgPath(inset(edge, MEDAL.rim), SIZE, RADIUS)} />
        <path id={`${key}-field`} d={svgPath(inset(edge, MEDAL.field), SIZE, RADIUS)} />
        <linearGradient id={`${key}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop className="medal-stop-hi" offset="0" />
          <stop className="medal-stop-mid" offset="0.42" />
          <stop className="medal-stop-lo" offset="0.7" />
          <stop className="medal-stop-hi" offset="1" />
        </linearGradient>
        <linearGradient id={`${key}-bevel`} x1="0" y1="0" x2="1" y2="1">
          <stop className="medal-stop-light" offset="0" />
          <stop className="medal-stop-clear" offset="0.5" />
          <stop className="medal-stop-dark" offset="1" />
        </linearGradient>
        <linearGradient id={`${key}-step`} x1="0" y1="0" x2="1" y2="1">
          <stop className="medal-stop-dark" offset="0" />
          <stop className="medal-stop-clear" offset="0.5" />
          <stop className="medal-stop-light" offset="1" />
        </linearGradient>
        {/* Brushed in circles: rings that repeat out from the middle. */}
        <radialGradient id={`${key}-brush`} cx="0.5" cy="0.5" r="0.012" spreadMethod="repeat">
          <stop className="medal-stop-clear" offset="0" />
          <stop className="medal-stop-grain" offset="0.5" />
          <stop className="medal-stop-clear" offset="1" />
        </radialGradient>
        <linearGradient id={`${key}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop className="medal-stop-gloss" offset="0" />
          <stop className="medal-stop-clear" offset="0.55" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * A medal's still (DESIGN.md §7.8): its face and its back, drawn in SVG from the same
 * outlines and engravings as the 3D medal (lib/medals.ts), so LOW and OFF tiers, reduced
 * motion and no JavaScript see the same object, crisp at any size. The words are in the
 * DOM beside it, so the drawing itself is hidden from assistive tech.
 */
export function MedalStill({ id, shape, face, line, back }: { id: string; shape: MedalShape; face: string; line: string; back: string }) {
  return (
    <div className="medal-still">
      <Defs id={id} shape={shape} />
      <Face id={id} side="front" engraving={faceEngraving(shape, face, line)} />
      <Face id={id} side="back" engraving={backEngraving(shape, back)} />
    </div>
  );
}
