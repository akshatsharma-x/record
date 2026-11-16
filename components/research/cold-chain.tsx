import { type CSSProperties, useId } from "react";
import { Button } from "@/components/ui/button";
import { CHAIN, chainStops, smoothPath, tracePoints } from "@/lib/research";

const vars = (values: Record<string, number | string>) => values as CSSProperties;
const riskWord = (risk: number) => (risk < 0.34 ? "low" : risk < 0.67 ? "moderate" : "high");
const lower = (text: string) => (/^\p{Lu}\p{Ll}/u.test(text) ? text[0].toLowerCase() + text.slice(1) : text);

/** "Temperature excursions weigh most, then dwell time, then distance." */
function whySentence(factors: readonly string[], weights: readonly number[]): string {
  const order = factors.map((factor, i) => ({ factor, weight: weights[i] })).sort((a, b) => b.weight - a.weight);
  const [first, ...rest] = order.map((entry, i) => (i === 0 ? entry.factor : lower(entry.factor)));
  return `Illustrative factors: ${first} weigh${first.endsWith("s") ? "" : "s"} most${rest.map((factor) => `, then ${factor}`).join("")}.`;
}

/**
 * The food-waste paper's idea (DESIGN.md §7.5): a cold chain from farm to retail with a
 * dial of illustrative risk at each stop and the temperature along the way. As its
 * chapter plays, --play draws the route and the trace, and each stop's dial comes up as
 * the route reaches it (styles/components.css). Hovering, focusing or tapping a stop opens
 * "Why?": illustrative attribution bars for the factors behind its risk. Every shape is an
 * illustration, and nothing is a number.
 *
 * All of it is rendered here, on the server, every stop's "Why?" included; the browser
 * only says which one is open (lib/research-behavior.ts, attachChain).
 */
export function ColdChain({ stops, factors }: { stops: readonly string[]; factors: readonly string[] }) {
  const id = useId();
  const model = chainStops(stops.length, factors.length);
  const { left, right } = CHAIN.route;
  const { top, bottom, safeTop, safeBottom } = CHAIN.trace;
  const excursion = left + CHAIN.excursion * (right - left);
  const route = smoothPath(model);
  const trace = smoothPath(tracePoints(1, 48));

  return (
    <div className="chain" id={id}>
      {/* The stage holds the drawing and its "Why?", so the pointer can move onto a panel. */}
      <div className="chain-stage">
        <div className="chain-scene" style={vars({ "--aspect": `${CHAIN.view.width} / ${CHAIN.view.height}` })}>
          <svg className="chain-svg" viewBox={`0 0 ${CHAIN.view.width} ${CHAIN.view.height}`} aria-hidden="true">
            <text className="chain-label" x={left} y={top - 14}>
              Temperature
            </text>
            <rect className="chain-safe" x={left} y={safeTop} width={right - left} height={safeBottom - safeTop} rx="6" />
            <text className="chain-label" x={right} y={safeBottom + 22} textAnchor="end">
              Safe range
            </text>
            <path className="chain-trace" d={trace} pathLength={1} />
            <g className="chain-excursion" style={vars({ "--at": CHAIN.excursion })}>
              <line className="chain-excursion-mark" x1={excursion} x2={excursion} y1={top - 4} y2={bottom} />
              <text className="chain-label chain-excursion-label" x={excursion + 8} y={top + 8}>
                Excursion
              </text>
            </g>
            {model.map((stop, i) => (
              <line
                key={`guide-${i}`}
                className="chain-guide"
                x1={stop.x}
                x2={stop.x}
                y1={stop.y + 40}
                y2={top - 30}
                style={vars({ "--at": stop.at })}
              />
            ))}
            <path className="chain-route" d={route} pathLength={1} />
            {model.map((stop, i) => (
              <g key={stops[i]} className="chain-stop" data-stop={i} style={vars({ "--at": stop.at, "--risk": stop.risk })}>
                <g transform={`translate(${stop.x},${stop.y - 40})`}>
                  <path className="chain-dial-track" d="M-20,0A20,20,0,0,1,20,0" />
                  <path className="chain-dial-fill" d="M-20,0A20,20,0,0,1,20,0" pathLength={1} />
                  <line className="chain-needle" x1="0" y1="0" x2="0" y2="-15" />
                  <circle className="chain-hub" r="3" />
                </g>
                <circle className="chain-node" cx={stop.x} cy={stop.y} r="8" />
                <text className="chain-name" x={stop.x} y={stop.y + 30} textAnchor="middle">
                  {stops[i]}
                </text>
              </g>
            ))}
          </svg>

          {model.map((stop, i) => (
            <button
              key={stops[i]}
              type="button"
              className="chain-hit"
              data-stop={i}
              data-cursor="default"
              style={vars({ "--x": stop.x / CHAIN.view.width, "--y": (stop.y - 14) / CHAIN.view.height })}
              aria-label={`${stops[i]}: illustrative risk ${riskWord(stop.risk)}`}
              aria-describedby={`${id}-why-${i}`}
              aria-pressed="false"
            />
          ))}
          {model.map((stop, i) => (
            <p key={stops[i]} id={`${id}-why-${i}`} hidden>
              {whySentence(factors, stop.attribution)}
            </p>
          ))}
        </div>

        {/* Each stop's words are its description; these panels are what the eye reads. */}
        {model.map((stop, i) => (
          <div
            key={stops[i]}
            className="chain-why"
            data-stop={i}
            data-side={stop.at > 0.5 ? "left" : "right"}
            aria-hidden="true"
            style={vars({ "--x": stop.x / CHAIN.view.width, "--y": stop.y / CHAIN.view.height })}
          >
            <p className="chain-why-title">
              Why? <span>{stops[i]}</span>
            </p>
            <ul className="chain-bars">
              {factors.map((factor, j) => (
                <li key={factor} className="chain-bar-row">
                  <span>{factor}</span>
                  <span className="chain-bar" style={vars({ "--w": stop.attribution[j] })} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="illustration-steps">
        <Button variant="secondary" data-chain-step="">
          Step through
        </Button>
        <p className="sr-only" aria-live="polite" data-chain-said="" data-overview={`The whole chain, ${stops[0]} to ${stops.at(-1)}.`} />
      </div>
    </div>
  );
}
