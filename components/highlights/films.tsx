import type { CSSProperties } from "react";
import type { ReelFilm } from "@/content/derive";

/**
 * The highlights' micro-films (DESIGN.md §7, Part 6): short loops built from SVG and CSS,
 * with no video. Each draws only figures its footnotes state (content/schema.ts checks
 * them), labeled exactly as the footnote words them. Server-rendered, so they cost no
 * JavaScript; styles/components.css animates them only while their card plays, and their
 * resting state is the final frame, which is what reduced motion shows.
 *
 * Path data is written "x,y" with commas, never as runs of spaced digits.
 */

const VIEW = "0 0 400 320";
const round = (value: number) => Math.round(value * 100) / 100;
const point = (x: number, y: number) => `${round(x)},${round(y)}`;
/** n values spread evenly over `size`, centered on `center`. */
const spread = (n: number, center: number, size: number) =>
  Array.from({ length: n }, (_, i) => (n === 1 ? center : center - size / 2 + (size * i) / (n - 1)));
const vars = (values: Record<string, number | string>) => values as CSSProperties;

function Svg({ kind, children }: { kind: string; children: React.ReactNode }) {
  return (
    <svg className="film" data-film={kind} viewBox={VIEW} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {children}
    </svg>
  );
}

// ─── Two pulses fan out into six documents ───────────────────────────────────

function FanOut({ from, to, fromLabel, toLabel }: Extract<ReelFilm, { kind: "fan-out" }>) {
  const sources = spread(from, 150, 80).map((y) => ({ x: 84, y }));
  const columns = Math.min(2, to);
  const rows = Math.ceil(to / columns);
  const docs = Array.from({ length: to }, (_, j) => ({
    x: 262 + (j % columns) * 64,
    y: spread(rows, 150, Math.min(200, (rows - 1) * 64))[Math.floor(j / columns)],
    source: Math.floor((j * from) / to),
  }));
  return (
    <Svg kind="fan-out">
      {docs.map((doc, j) => {
        const source = sources[doc.source];
        const path = `M${point(source.x + 14, source.y)}C${point(source.x + 96, source.y)} ${point(doc.x - 70, doc.y)} ${point(doc.x - 4, doc.y)}`;
        return <path key={`link-${j}`} className="film-link" d={path} pathLength={1} style={vars({ "--k": j })} />;
      })}
      {sources.map((source, i) => (
        <g key={`pulse-${i}`} className="film-pulse" style={vars({ "--k": i })}>
          <circle className="film-pulse-ring" cx={source.x} cy={source.y} r="14" />
          <circle className="film-pulse-core" cx={source.x} cy={source.y} r="10" />
        </g>
      ))}
      {docs.map((doc, j) => (
        <g key={`doc-${j}`} className="film-doc" style={vars({ "--k": j })}>
          <rect className="film-doc-sheet" x={doc.x - 4} y={doc.y - 24} width="40" height="48" rx="6" />
          {[0, 1, 2].map((line) => (
            <line key={line} className="film-doc-line" x1={doc.x + 4} x2={doc.x + (line === 2 ? 20 : 28)} y1={doc.y - 12 + line * 10} y2={doc.y - 12 + line * 10} />
          ))}
        </g>
      ))}
      <text className="film-caption" x="84" y="286" textAnchor="middle">
        <tspan className="film-number">{fromLabel}</tspan> calls
      </text>
      <text className="film-caption" x="294" y="286" textAnchor="middle">
        <tspan className="film-number">{toLabel}</tspan> documents
      </text>
    </Svg>
  );
}

// ─── A cost counter settles while a token bar compresses ─────────────────────

function Cost({ cents, compression, compressionLabel }: Extract<ReelFilm, { kind: "cost" }>) {
  // The bar keeps 100 − 25% to 100 − 22% of its length; the band between is the range.
  const keepLow = 1 - compression[1] / 100;
  const keepHigh = 1 - compression[0] / 100;
  return (
    <div className="film film-html" data-film="cost" aria-hidden="true">
      <span className="film-cost-counter" style={vars({ "--lo-final": cents[0], "--hi-final": cents[1] })} />
      <span className="film-caption">per run</span>
      <span className="film-tokens" style={vars({ "--keep-low": keepLow, "--keep-high": keepHigh })}>
        <span className="film-tokens-full" />
        <span className="film-tokens-kept" />
        <span className="film-tokens-band" />
      </span>
      <span className="film-caption">
        <span className="film-number">−{compressionLabel}</span> tokens
      </span>
    </div>
  );
}

// ─── Two sheets settle under the conference ──────────────────────────────────

function Papers({ count, venue }: Extract<ReelFilm, { kind: "papers" }>) {
  const xs = spread(count, 200, Math.min(180, (count - 1) * 124));
  return (
    <Svg kind="papers">
      <text className="film-venue" x="200" y="64" textAnchor="middle">
        {venue}
      </text>
      {xs.map((x, i) => (
        <g key={i} className="film-sheet" style={vars({ "--k": i, "--tilt": `${(i - (count - 1) / 2) * 5}deg` })}>
          <rect className="film-sheet-page" x={x - 54} y="96" width="108" height="144" rx="8" />
          {[0, 1, 2, 3, 4, 5].map((line) => (
            <line
              key={line}
              className="film-sheet-line"
              x1={x - 38}
              x2={x + (line === 0 ? 20 : line === 5 ? 6 : 38)}
              y1={118 + line * 18}
              y2={118 + line * 18}
              data-title={line === 0 || undefined}
            />
          ))}
        </g>
      ))}
      <line className="film-shelf" x1="96" x2="304" y1="262" y2="262" />
    </Svg>
  );
}

// ─── An ROC curve draws to its AUC ───────────────────────────────────────────

function Roc({ auc, aucLabel }: Extract<ReelFilm, { kind: "roc" }>) {
  // A concave ROC curve whose area is exactly the AUC: TPR = FPR^(1/k), k = AUC / (1 − AUC).
  const k = auc / (1 - auc);
  const plot = { x0: 72, x1: 336, y0: 44, y1: 256 };
  const at = (fpr: number) => point(plot.x0 + fpr * (plot.x1 - plot.x0), plot.y1 - fpr ** (1 / k) * (plot.y1 - plot.y0));
  const samples = Array.from({ length: 33 }, (_, i) => (i / 32) ** 3);
  const curve = `M${samples.map(at).join("L")}`;
  const area = `${curve}L${point(plot.x1, plot.y1)}Z`;
  return (
    <Svg kind="roc">
      <path className="film-roc-area" d={area} />
      <path className="film-axis" d={`M${point(plot.x0, plot.y0)}L${point(plot.x0, plot.y1)}L${point(plot.x1, plot.y1)}`} />
      <path className="film-chance" d={`M${point(plot.x0, plot.y1)}L${point(plot.x1, plot.y0)}`} />
      <path className="film-roc-curve" d={curve} pathLength={1} />
      <text className="film-caption film-roc-label" x={plot.x1 - 8} y={plot.y1 - 20} textAnchor="end">
        AUC <tspan className="film-number">{aucLabel}</tspan>
      </text>
    </Svg>
  );
}

// ─── A field of dots condenses to the few that made it ───────────────────────

/** Picks `count` of `total` indices, the same every time, scattered across the field. */
function scattered(total: number, count: number): Set<number> {
  const order = Array.from({ length: total }, (_, i) => i);
  let seed = 20260616;
  for (let i = total - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, count));
}

function Condense({ from, to, fromLabel, toLabel }: Extract<ReelFilm, { kind: "condense" }>) {
  const columns = Math.ceil(Math.sqrt((from * 4) / 3));
  const rows = Math.ceil(from / columns);
  const gap = Math.min(16, 300 / columns, 216 / rows);
  const origin = { x: 200 - ((columns - 1) * gap) / 2, y: 148 - ((rows - 1) * gap) / 2 };
  const keep = [...scattered(from, to)].sort((a, b) => a - b);
  const clusterColumns = Math.ceil(Math.sqrt(to * 2));
  const clusterRows = Math.ceil(to / clusterColumns);
  const tight = 11;
  const cluster = { x: 200 - ((clusterColumns - 1) * tight) / 2, y: 132 - ((clusterRows - 1) * tight) / 2 };
  // The whole field is one patterned shape (full rows, then any partial row), so 300 dots
  // cost two rects; only the survivors are drawn one by one.
  const fullRows = Math.floor(from / columns);
  const rest = from - fullRows * columns;
  const pattern = `film-field-${from}-${to}`;
  const field = { x: origin.x - gap / 2, y: origin.y - gap / 2 };
  return (
    <Svg kind="condense">
      <defs>
        <pattern id={pattern} x={round(field.x)} y={round(field.y)} width={round(gap)} height={round(gap)} patternUnits="userSpaceOnUse">
          <circle className="film-dot" cx={round(gap / 2)} cy={round(gap / 2)} r="2.6" />
        </pattern>
      </defs>
      <g className="film-field">
        <rect x={round(field.x)} y={round(field.y)} width={round(columns * gap)} height={round(fullRows * gap)} fill={`url(#${pattern})`} />
        {rest > 0 ? (
          <rect x={round(field.x)} y={round(field.y + fullRows * gap)} width={round(rest * gap)} height={round(gap)} fill={`url(#${pattern})`} />
        ) : null}
      </g>
      {keep.map((i, n) => {
        // Survivors rest in the cluster and travel there from their place in the field.
        const x = origin.x + (i % columns) * gap;
        const y = origin.y + Math.floor(i / columns) * gap;
        const cx = cluster.x + (n % clusterColumns) * tight;
        const cy = cluster.y + Math.floor(n / clusterColumns) * tight;
        return <circle key={i} className="film-dot" data-keep="" cx={round(cx)} cy={round(cy)} r="3.4" style={vars({ "--fx": `${round(x - cx)}px`, "--fy": `${round(y - cy)}px` })} />;
      })}
      <text className="film-caption film-field-label" x="200" y="296" textAnchor="middle">
        <tspan className="film-number">{fromLabel}</tspan> teams
      </text>
      <text className="film-caption film-cluster-label" x="200" y="240" textAnchor="middle">
        <tspan className="film-number film-number-large">{toLabel}</tspan>
      </text>
      <text className="film-caption film-cluster-label" x="200" y="272" textAnchor="middle">
        of <tspan className="film-number">{fromLabel}</tspan>
      </text>
    </Svg>
  );
}

// ─── A ring fills ────────────────────────────────────────────────────────────

function Ring({ percent, label }: Extract<ReelFilm, { kind: "ring" }>) {
  const suffix = label.replace(/^[\d.,]+/, "");
  return (
    <div className="film film-html" data-film="ring" aria-hidden="true">
      <svg className="film-ring" viewBox="0 0 200 200" style={vars({ "--to": percent })}>
        <circle className="film-ring-track" cx="100" cy="100" r="80" pathLength={100} />
        <circle className="film-ring-arc" cx="100" cy="100" r="80" pathLength={100} />
      </svg>
      <span className="film-ring-label" style={vars({ "--to": Math.round(percent), "--suffix": JSON.stringify(suffix) })} />
      <span className="film-caption">test coverage</span>
    </div>
  );
}

// ─── Bars rise to a daily count ──────────────────────────────────────────────

function Bars({ label }: Extract<ReelFilm, { kind: "bars" }>) {
  const days = spread(7, 200, 252);
  return (
    <Svg kind="bars">
      {days.map((x, i) => (
        <rect key={i} className="film-bar" x={round(x - 13)} y="112" width="26" height="148" rx="6" style={vars({ "--k": i })} />
      ))}
      <line className="film-target" x1="56" x2="344" y1="104" y2="104" />
      <text className="film-caption film-target-label" x="344" y="88" textAnchor="end">
        <tspan className="film-number">{label}</tspan> daily users
      </text>
      <line className="film-shelf" x1="56" x2="344" y1="268" y2="268" />
    </Svg>
  );
}

/** The film for a highlight. */
export function Film({ film }: { film: ReelFilm }) {
  switch (film.kind) {
    case "fan-out":
      return <FanOut {...film} />;
    case "cost":
      return <Cost {...film} />;
    case "papers":
      return <Papers {...film} />;
    case "roc":
      return <Roc {...film} />;
    case "condense":
      return <Condense {...film} />;
    case "ring":
      return <Ring {...film} />;
    case "bars":
      return <Bars {...film} />;
  }
}
