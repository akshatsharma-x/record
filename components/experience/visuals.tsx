import type { CSSProperties, ReactNode } from "react";
import { type EditVisual, partsOf } from "@/content/derive";

/**
 * The roles' visuals in "the edit" (DESIGN.md §7.4): abstract, never a screenshot, drawn
 * in SVG. Each draws only figures the role's text or notes state, labeled as they word
 * them. Server-rendered, so they cost no JavaScript. Each rests on its final frame and
 * plays once (in about four seconds) when its role becomes active in the viewer
 * (styles/components.css); off-screen it pauses.
 *
 * Path data is written "x,y" with commas, never as runs of spaced digits.
 */

const VIEW = "0 0 400 320";
const round = (value: number) => Math.round(value * 100) / 100;
const point = (x: number, y: number) => `${round(x)},${round(y)}`;
const vars = (values: Record<string, number | string>) => values as CSSProperties;

function Svg({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <svg className="role-visual" data-visual={kind} viewBox={VIEW} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {children}
    </svg>
  );
}

/** A figure as SVG text whose digits the edit's counter can count (components/experience/edit-controller.tsx). */
function Figure({ token, className, ...position }: { token: string; className: string; x: number; y: number; textAnchor?: "start" | "middle" | "end" }) {
  return (
    <text className={className} {...position}>
      {partsOf(token).map((part, i) =>
        part.kind === "text" ? (
          <tspan key={i}>{part.text}</tspan>
        ) : (
          <tspan key={i} data-count={part.value} data-decimals={part.decimals} data-group={part.group ? "" : undefined}>
            {part.group ? part.value.toLocaleString("en-US") : part.value.toFixed(part.decimals)}
          </tspan>
        ),
      )}
    </text>
  );
}

/** The same scatter every time, for the tangle and the blocks' starting places. */
function scatter(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

// ─── United Airlines: tangle to map ──────────────────────────────────────────

const NODES: [number, number][] = [
  [56, 92],
  [128, 56],
  [204, 96],
  [92, 168],
  [168, 160],
  [228, 214],
  [124, 238],
];
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 5],
  [3, 6],
  [6, 5],
];

function TangleToMap({ calls, documents, costLabel }: Extract<EditVisual, { kind: "tangle-to-map" }>) {
  const random = scatter(20260601);
  // Each edge is a code-like stroke centered on the origin; it starts knotted near the
  // middle and settles on its edge of the graph.
  const strokes = EDGES.map(([a, b], i) => {
    const [x1, y1] = NODES[a];
    const [x2, y2] = NODES[b];
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return {
      length,
      style: vars({
        "--k": i,
        "--x": `${round((x1 + x2) / 2)}px`,
        "--y": `${round((y1 + y2) / 2)}px`,
        "--r": `${round(angle)}deg`,
        "--x0": `${round(132 + (random() - 0.5) * 56)}px`,
        "--y0": `${round(152 + (random() - 0.5) * 56)}px`,
        "--r0": `${round(random() * 720 - 360)}deg`,
      }),
    };
  });
  // The graph's two right-most nodes send one pulse each to the documents.
  const sources = [NODES[2], NODES[5]].slice(0, calls);
  const columns = 2;
  const rows = Math.ceil(documents / columns);
  const docs = Array.from({ length: documents }, (_, j) => ({
    x: 296 + (j % columns) * 52,
    y: 72 + Math.floor(j / columns) * (156 / Math.max(1, rows - 1)),
    source: Math.floor((j * sources.length) / documents),
  }));
  return (
    <Svg kind="tangle-to-map">
      {strokes.map((stroke, i) => (
        <line key={`edge-${i}`} className="rv-stroke" x1={round(-stroke.length / 2)} x2={round(stroke.length / 2)} y1="0" y2="0" style={stroke.style} />
      ))}
      {NODES.map(([x, y], i) => (
        <circle key={`node-${i}`} className="rv-node" cx={x} cy={y} r={i === 4 ? 9 : 6} style={vars({ "--k": i })} />
      ))}
      {docs.map((doc, j) => {
        const [sx, sy] = sources[doc.source];
        return (
          <path
            key={`link-${j}`}
            className="rv-link"
            d={`M${point(sx + 8, sy)}C${point(sx + 48, sy)} ${point(doc.x - 40, doc.y)} ${point(doc.x - 4, doc.y)}`}
            pathLength={1}
            style={vars({ "--k": j })}
          />
        );
      })}
      {sources.map(([x, y], i) => (
        <circle key={`pulse-${i}`} className="rv-pulse" cx={x} cy={y} r="13" style={vars({ "--k": i })} />
      ))}
      {docs.map((doc, j) => (
        <g key={`doc-${j}`} className="rv-doc" style={vars({ "--k": j })}>
          <rect className="rv-sheet" x={doc.x - 4} y={doc.y - 20} width="34" height="40" rx="5" />
          <line className="rv-line" x1={doc.x + 3} x2={doc.x + 23} y1={doc.y - 9} y2={doc.y - 9} />
          <line className="rv-line" x1={doc.x + 3} x2={doc.x + 19} y1={doc.y} y2={doc.y} />
          <line className="rv-line" x1={doc.x + 3} x2={doc.x + 15} y1={doc.y + 9} y2={doc.y + 9} />
        </g>
      ))}
      <g className="rv-cost">
        <Figure className="rv-figure" token={costLabel} x={388} y={282} textAnchor="end" />
        <text className="rv-label" x="388" y="300" textAnchor="end">
          per run
        </text>
      </g>
    </Svg>
  );
}

// ─── EY: route segments ──────────────────────────────────────────────────────

function RouteSegments() {
  // The client: a window whose App Router segments slot in, then fill with UI.
  const segments = [
    { label: "app/", x: 32, y: 60, w: 220, h: 22 },
    { label: "layout", x: 32, y: 90, w: 60, h: 154 },
    { label: "page", x: 100, y: 90, w: 152, h: 154 },
  ];
  // The token leaves the API and settles in the client's title bar.
  const token = { x: 196, y: 31, w: 52, h: 22 };
  const api = { x: 300, y: 40, w: 80, h: 40 };
  return (
    <Svg kind="route-segments">
      <rect className="rv-window" x="20" y="24" width="244" height="232" rx="12" />
      {[0, 1, 2].map((i) => (
        <circle key={i} className="rv-dot" cx={38 + i * 12} cy="42" r="3.5" />
      ))}
      {segments.map((segment, i) => (
        <g key={segment.label} className="rv-segment" style={vars({ "--k": i })}>
          <rect className="rv-region" x={segment.x} y={segment.y} width={segment.w} height={segment.h} rx="6" />
          <text className="rv-code" x={segment.x + 8} y={segment.y + 15}>
            {segment.label}
          </text>
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={`card-${i}`} className="rv-card" x="112" y={124 + i * 30} width={i === 2 ? 88 : 128} height="18" rx="4" style={vars({ "--k": i })} />
      ))}
      <path className="rv-wire" d={`M${point(api.x, api.y + api.h / 2)}L${point(264, api.y + api.h / 2)}`} />
      <rect className="rv-api" x={api.x} y={api.y} width={api.w} height={api.h} rx="8" />
      <text className="rv-label" x={api.x + api.w / 2} y={api.y + 25} textAnchor="middle">
        API
      </text>
      <g
        className="rv-token"
        style={vars({ "--dx": `${api.x + api.w / 2 - token.w / 2 - token.x}px`, "--dy": `${api.y + api.h / 2 - token.h / 2 - token.y}px` })}
      >
        <rect className="rv-token-pill" x={token.x} y={token.y} width={token.w} height={token.h} rx={token.h / 2} />
        <text className="rv-code rv-token-text" x={token.x + token.w / 2} y={token.y + 16} textAnchor="middle">
          JWT
        </text>
      </g>
      <path className="rv-wire" d={`M${point(264, 206)}L${point(284, 206)}`} />
      <g className="rv-table">
        <rect className="rv-db" x="284" y="132" width="104" height="148" rx="8" />
        <text className="rv-label" x="336" y="156" textAnchor="middle">
          PostgreSQL
        </text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={`row-${i}`} className="rv-row" x="296" y={172 + i * 24} width="80" height="14" rx="3" style={vars({ "--k": i })} />
        ))}
      </g>
    </Svg>
  );
}

// ─── Truechip: module blocks ─────────────────────────────────────────────────

function ModuleBlocks({ modules, modulesLabel, coverage, coverageLabel, defectsLabel, defects }: Extract<EditVisual, { kind: "module-blocks" }>) {
  const random = scatter(20251201);
  const columns = Math.min(5, modules);
  const blocks = Array.from({ length: modules }, (_, i) => {
    const x = 44 + (i % columns) * 36;
    const y = 64 + Math.floor(i / columns) * 36;
    return { x, y, style: vars({ "--k": i, "--dx": `${round((random() - 0.5) * 160)}px`, "--dy": `${round((random() - 0.5) * 120)}px` }) };
  });
  // The defect line drops by the stated share, on a relative scale with no invented counts.
  const top = 232;
  const drop = (defects / 100) * 64;
  const line = `M${point(44, top)}C${point(124, top)} ${point(150, top + drop)} ${point(230, top + drop)}L${point(372, top + drop)}`;
  return (
    <Svg kind="module-blocks">
      {blocks.map((block, i) => (
        <rect key={i} className="rv-block" x={block.x} y={block.y} width="30" height="30" rx="6" style={block.style} />
      ))}
      <Figure className="rv-figure" token={modulesLabel} x={44} y={160} />
      <text className="rv-label" x="44" y="178">
        modules
      </text>
      <g className="rv-coverage" style={vars({ "--to": coverage })}>
        <circle className="rv-ring-track" cx="316" cy="104" r="48" pathLength={100} />
        <circle className="rv-ring-arc" cx="316" cy="104" r="48" pathLength={100} />
        <Figure className="rv-figure" token={coverageLabel} x={316} y={110} textAnchor="middle" />
        <text className="rv-label" x="316" y="176" textAnchor="middle">
          coverage
        </text>
      </g>
      <path className="rv-axis" d={`M${point(44, 212)}L${point(44, top + 72)}L${point(372, top + 72)}`} />
      <path className="rv-defects" d={line} pathLength={1} />
      <text className="rv-label" x="372" y={top + drop - 10} textAnchor="end">
        <tspan className="rv-figure-small">{defectsLabel}</tspan> fewer defects
      </text>
    </Svg>
  );
}

// ─── WalkingTree: dashboard ──────────────────────────────────────────────────

/** Bar heights for the dashboard's chart: unlabeled skeleton bars, a UI idiom, not data. */
const SKELETON = [0.55, 0.8, 0.45, 0.9, 0.65, 0.75];

function Dashboard({ usersLabel }: Extract<EditVisual, { kind: "dashboard" }>) {
  return (
    <Svg kind="dashboard">
      <rect className="rv-window" x="24" y="24" width="352" height="264" rx="12" />
      <rect className="rv-bar-head" x="40" y="40" width="120" height="12" rx="6" />
      <g className="rv-panel" style={vars({ "--k": 0 })}>
        <rect className="rv-region" x="40" y="68" width="140" height="200" rx="8" />
        {SKELETON.map((height, i) => (
          <rect
            key={i}
            className="rv-column"
            x={54 + i * 20}
            y={round(252 - height * 150)}
            width="12"
            height={round(height * 150)}
            rx="3"
            style={vars({ "--k": i })}
          />
        ))}
      </g>
      <g className="rv-panel" style={vars({ "--k": 1 })}>
        <rect className="rv-region" x="196" y="68" width="164" height="200" rx="8" />
        <text className="rv-label" x="212" y="96">
          daily active users
        </text>
        <path className="rv-axis" d={`M${point(212, 116)}L${point(212, 248)}L${point(344, 248)}`} />
        {/* The line rises to the level the footnote states and holds there, its figure riding
            on it: it reaches 2,500+ without inventing a history. */}
        <g className="rv-reach" style={vars({ "--lift": `${248 - 176}px` })}>
          <path className="rv-level" d={`M${point(212, 176)}L${point(336, 176)}`} pathLength={1} />
          <circle className="rv-level-dot" cx="336" cy="176" r="5" />
          <Figure className="rv-figure" token={usersLabel} x={336} y={160} textAnchor="end" />
        </g>
      </g>
    </Svg>
  );
}

export function RoleVisual({ visual }: { visual: EditVisual }) {
  switch (visual.kind) {
    case "tangle-to-map":
      return <TangleToMap {...visual} />;
    case "route-segments":
      return <RouteSegments />;
    case "module-blocks":
      return <ModuleBlocks {...visual} />;
    case "dashboard":
      return <Dashboard {...visual} />;
  }
}
