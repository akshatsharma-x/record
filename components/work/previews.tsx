import type { CSSProperties, ReactNode } from "react";
import type { WorkPreview } from "@/content/derive";

/**
 * The work tiles' living previews (DESIGN.md §7.6): each project's idea in a few seconds of
 * SVG and CSS, no video and no JavaScript. Each rests on its final frame and plays once
 * when its tile is hovered or focused, or first comes into view on a touch screen (the
 * work controller sets data-playing; styles/components.css). Labeled in the project's own
 * words; the only figures are the ones its text states.
 *
 * Path data is written "x,y" with commas, never as runs of spaced digits.
 */

const vars = (values: Record<string, number | string>) => values as CSSProperties;
const round = (value: number) => Math.round(value * 10) / 10;
const point = (x: number, y: number) => `${round(x)},${round(y)}`;

/** The same scatter every time. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

function Svg({ kind, view, children }: { kind: string; view: string; children: ReactNode }) {
  return (
    <svg className="preview-svg" data-preview={kind} viewBox={view} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {children}
    </svg>
  );
}

// ─── Cognivault AI: agents over A2A, HyDE, FAISS, a summary ─────────────────

const AGENTS: [number, number][] = [
  [176, 70],
  [236, 150],
  [176, 230],
];

function Agents({ labels }: Extract<WorkPreview, { kind: "agents" }>) {
  const random = seeded(20240611);
  const field = Array.from({ length: 13 }, () => ({ x: 282 + random() * 88, y: 168 + random() * 72 }));
  const probe = { x: 326, y: 204 };
  const nearest = new Set(
    field
      .map((dot, i) => ({ i, d: Math.hypot(dot.x - probe.x, dot.y - probe.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4)
      .map((entry) => entry.i),
  );
  // Messages pass from agent to agent over A2A: each travels one side of the triangle.
  const relay = AGENTS.map((from, i) => ({ from, to: AGENTS[(i + 1) % AGENTS.length] }));
  return (
    <Svg kind="agents" view="0 0 480 300">
      <g className="pv-query">
        <rect className="pv-pill" x="8" y="128" width="88" height="44" rx="22" />
        <text className="pv-label pv-label-strong" x="52" y="156" textAnchor="middle">
          {labels.query}
        </text>
      </g>
      {AGENTS.map(([x, y], i) => (
        <path key={`route-${i}`} className="pv-route" d={`M${point(96, 150)}C${point(136, 150)} ${point(136, y)} ${point(x - 16, y)}`} pathLength={1} style={vars({ "--k": i })} />
      ))}
      {relay.map(({ from, to }, i) => (
        <path key={`relay-${i}`} className="pv-relay" d={`M${point(...from)}L${point(...to)}`} />
      ))}
      {relay.map(({ from, to }, i) => (
        <circle
          key={`message-${i}`}
          className="pv-message"
          cx={from[0]}
          cy={from[1]}
          r="5"
          style={vars({ "--k": i, "--dx": `${to[0] - from[0]}px`, "--dy": `${to[1] - from[1]}px` })}
        />
      ))}
      {AGENTS.map(([x, y], i) => (
        <circle key={`agent-${i}`} className="pv-agent" cx={x} cy={y} r="16" style={vars({ "--k": i })} />
      ))}
      <text className="pv-label" x="196" y="282" textAnchor="middle">
        {labels.agents}
      </text>
      <g className="pv-hyde">
        <rect className="pv-doc pv-dashed" x="290" y="26" width="64" height="80" rx="9" />
        {[0, 1, 2].map((i) => (
          <line key={i} className="pv-line" x1="302" x2={i === 2 ? 326 : 342} y1={46 + i * 16} y2={46 + i * 16} />
        ))}
        <text className="pv-label" x="322" y="132" textAnchor="middle">
          {labels.hypothetical}
        </text>
      </g>
      {field.map((dot, i) => (
        <circle key={`dot-${i}`} className={nearest.has(i) ? "pv-dot pv-neighbor" : "pv-dot"} cx={round(dot.x)} cy={round(dot.y)} r="4" style={vars({ "--k": i })} />
      ))}
      <circle className="pv-probe" cx={probe.x} cy={probe.y} r="7" />
      <text className="pv-label" x="326" y="282" textAnchor="middle">
        {labels.neighbors}
      </text>
      <g className="pv-summary">
        <rect className="pv-doc" x="398" y="88" width="72" height="112" rx="10" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} className="pv-line pv-line-strong" x1="410" x2={i === 3 ? 436 : 458} y1={110 + i * 18} y2={110 + i * 18} style={vars({ "--k": i })} />
        ))}
        <text className="pv-label" x="434" y="226" textAnchor="middle">
          {labels.summary}
        </text>
      </g>
    </Svg>
  );
}

// ─── QuizMUJ: a live exam room, and a tab switch on the proctor's view ──────

const SEATS = { columns: 4, rows: 5, alert: 9 };

function ExamRoom({ labels }: Extract<WorkPreview, { kind: "exam-room" }>) {
  const order = seeded(20250902);
  const seats = Array.from({ length: SEATS.columns * SEATS.rows }, (_, i) => ({
    x: 30 + (i % SEATS.columns) * 62,
    y: 58 + Math.floor(i / SEATS.columns) * 50,
    delay: round(order() * 12),
  }));
  return (
    <Svg kind="exam-room" view="0 0 300 400">
      <text className="pv-label pv-label-strong" x="30" y="36">
        {labels.room}
      </text>
      {seats.map((seat, i) => (
        <rect
          key={i}
          className={i === SEATS.alert ? "pv-seat pv-seat-alert" : "pv-seat"}
          x={seat.x}
          y={seat.y}
          width="46"
          height="36"
          rx="9"
          style={vars({ "--k": seat.delay })}
        />
      ))}
      <rect className="pv-panel" x="22" y="322" width="256" height="62" rx="14" />
      <text className="pv-label" x="40" y="346">
        {labels.proctor}
      </text>
      <g className="pv-alert">
        <circle className="pv-alert-dot" cx="46" cy="366" r="5" />
        <text className="pv-label pv-label-strong" x="58" y="371">
          {labels.alert}
        </text>
      </g>
    </Svg>
  );
}

// ─── Resume Screening: two lanes merge into a ranking; PCA settles ──────────

function Lanes({ labels }: Extract<WorkPreview, { kind: "lanes" }>) {
  const random = seeded(20230417);
  const clusters = [
    { x: 300, y: 200 },
    { x: 360, y: 236 },
    { x: 414, y: 196 },
  ];
  const dots = Array.from({ length: 18 }, (_, i) => {
    const home = clusters[i % clusters.length];
    const x = home.x + (random() - 0.5) * 30;
    const y = home.y + (random() - 0.5) * 24;
    return { x: round(x), y: round(y), dx: round((random() - 0.5) * 160), dy: round((random() - 0.5) * 60) };
  });
  return (
    <Svg kind="lanes" view="0 0 440 280">
      {[0, 1, 2].map((i) => (
        <rect key={`doc-${i}`} className="pv-doc pv-flow" x="8" y={28 + i * 34} width="26" height="28" rx="5" style={vars({ "--k": i })} />
      ))}
      {[
        { y: 20, label: labels.left },
        { y: 76, label: labels.right },
      ].map((lane, i) => (
        <g key={lane.label} className="pv-lane" style={vars({ "--k": i })}>
          <rect className="pv-band" x="48" y={lane.y} width="132" height="40" rx="10" />
          <text className="pv-label pv-label-strong" x="62" y={lane.y + 26}>
            {lane.label}
          </text>
        </g>
      ))}
      <path className="pv-merge" d={`M${point(180, 40)}C${point(206, 40)} ${point(200, 68)} ${point(226, 68)}`} pathLength={1} />
      <path className="pv-merge" d={`M${point(180, 96)}C${point(206, 96)} ${point(200, 68)} ${point(226, 68)}`} pathLength={1} />
      {[176, 146, 118, 92].map((width, i) => (
        <rect key={`rank-${i}`} className="pv-rank" x="238" y={24 + i * 24} width={width} height="14" rx="7" style={vars({ "--k": i })} />
      ))}
      <text className="pv-label" x="238" y="140">
        {labels.ranked}
      </text>
      {dots.map((dot, i) => (
        <circle key={`pca-${i}`} className="pv-pca" cx={dot.x} cy={dot.y} r="4.5" style={vars({ "--k": i % 6, "--dx": `${dot.dx}px`, "--dy": `${dot.dy}px` })} />
      ))}
      <text className="pv-label" x="238" y="268">
        {labels.scatter}
      </text>
    </Svg>
  );
}

// ─── Churn: an ROC curve draws to its AUC (the tile's metric counts up) ─────

function Roc({ auc, aucLabel, aucName }: Extract<WorkPreview, { kind: "roc" }>) {
  // A concave ROC curve whose area is exactly the AUC: TPR = FPR^(1/k), k = AUC / (1 − AUC).
  const k = auc / (1 - auc);
  const plot = { x0: 20, x1: 300, y0: 14, y1: 206 };
  const at = (fpr: number) => point(plot.x0 + fpr * (plot.x1 - plot.x0), plot.y1 - fpr ** (1 / k) * (plot.y1 - plot.y0));
  const samples = Array.from({ length: 33 }, (_, i) => (i / 32) ** 3);
  const curve = `M${samples.map(at).join("L")}`;
  return (
    <Svg kind="roc" view="0 0 320 220">
      <path className="pv-area" d={`${curve}L${point(plot.x1, plot.y1)}Z`} />
      <path className="pv-axis" d={`M${point(plot.x0, plot.y0)}L${point(plot.x0, plot.y1)}L${point(plot.x1, plot.y1)}`} />
      <path className="pv-chance" d={`M${point(plot.x0, plot.y1)}L${point(plot.x1, plot.y0)}`} />
      <path className="pv-curve" d={curve} pathLength={1} />
      <text className="pv-label" x={plot.x1 - 8} y={plot.y1 - 14} textAnchor="end">
        {aucName} <tspan className="pv-label-strong">{aucLabel}</tspan>
      </text>
    </Svg>
  );
}

// ─── WCAG Analyzer: a scan sweeps a page, issues pin to it, a score fills ───

const PAGE = { x: 20, y: 12, w: 220, h: 246 };

const PINS: [number, number][] = [
  [192, 84],
  [78, 164],
  [162, 222],
];

function Scan({ labels }: Extract<WorkPreview, { kind: "scan" }>) {
  return (
    <Svg kind="scan" view="0 0 420 270">
      <rect className="pv-page" x={PAGE.x} y={PAGE.y} width={PAGE.w} height={PAGE.h} rx="14" />
      <rect className="pv-block" x="38" y="30" width="184" height="16" rx="8" />
      <rect className="pv-block pv-image" x="38" y="60" width="184" height="64" rx="10" />
      {[0, 1, 2].map((i) => (
        <rect key={i} className="pv-block" x="38" y={140 + i * 18} width={i === 2 ? 120 : 184} height="9" rx="4.5" />
      ))}
      <rect className="pv-button" x="38" y="206" width="76" height="30" rx="15" />
      <rect className="pv-button pv-button-quiet" x="124" y="206" width="76" height="30" rx="15" />
      <g className="pv-scan" style={vars({ "--travel": `${PAGE.h}px` })}>
        <rect className="pv-scan-glow" x={PAGE.x} y={PAGE.y - 26} width={PAGE.w} height="26" />
        <line className="pv-scan-line" x1={PAGE.x} x2={PAGE.x + PAGE.w} y1={PAGE.y} y2={PAGE.y} />
      </g>
      {PINS.map(([x, y], i) => (
        <g key={i} className="pv-pin" style={vars({ "--k": i, "--at": round((y - PAGE.y) / PAGE.h) })}>
          <circle cx={x} cy={y} r="10" />
          <line x1={x} x2={x} y1={y - 4.5} y2={y + 1} />
          <circle className="pv-pin-dot" cx={x} cy={y + 5} r="1.3" />
        </g>
      ))}
      <circle className="pv-ring-track" cx="334" cy="108" r="50" pathLength={100} />
      <circle className="pv-ring" cx="334" cy="108" r="50" pathLength={100} />
      <text className="pv-label pv-label-strong" x="334" y="114" textAnchor="middle">
        {labels.score}
      </text>
      <g className="pv-legend">
        <circle className="pv-legend-pin" cx="300" cy="206" r="7" />
        <text className="pv-label" x="314" y="212">
          {labels.issues}
        </text>
      </g>
    </Svg>
  );
}

export function Preview({ preview }: { preview: WorkPreview }) {
  switch (preview.kind) {
    case "agents":
      return <Agents {...preview} />;
    case "exam-room":
      return <ExamRoom {...preview} />;
    case "lanes":
      return <Lanes {...preview} />;
    case "roc":
      return <Roc {...preview} />;
    case "scan":
      return <Scan {...preview} />;
  }
}
