import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Container, Section } from "@/components/ui/layout";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Display, Lead } from "@/components/ui/type";
import { content } from "@/content";
import { type WorkMetric, type WorkTile, work } from "@/content/derive";
import type { Place } from "@/lib/bento";
import { Cover } from "./cover";
import { WorkController } from "./work-controller";

/** Footnote marks for each tile, made by the page so they're numbered in page order. */
export type WorkMarks = Record<string, ReactNode>;

const vars = (values: Record<string, number | string>) => values as CSSProperties;

/**
 * A tile's top metric. A whole number counts up while the preview plays (CSS draws the
 * count over the figure, which keeps its width and is what screen readers read).
 */
function MetricValue({ metric }: { metric: WorkMetric }) {
  const numbers = metric.parts.filter((part) => part.kind === "number");
  const only = numbers.length === 1 && numbers[0].decimals === 0 && !numbers[0].group ? numbers[0] : null;
  if (!only) return <span className="work-metric-value">{metric.token}</span>;
  const at = metric.parts.indexOf(only);
  const text = (parts: typeof metric.parts) => parts.map((part) => (part.kind === "text" ? part.text : "")).join("");
  return (
    <span
      className="work-metric-value work-metric-count"
      style={vars({ "--to": only.value, "--prefix": JSON.stringify(text(metric.parts.slice(0, at))), "--suffix": JSON.stringify(text(metric.parts.slice(at + 1))) })}
    >
      {metric.token}
    </span>
  );
}

/** A place as a grid-area: row / column / span rows / span columns. */
const area = (place: Place) => `${place.row} / ${place.column} / span ${place.rows} / span ${place.span}`;

/**
 * Each tile's place under each filter, by the filter's position in the control: CSS picks
 * the set whose radio is checked (styles/components.css), so filtering works without
 * JavaScript and the controller only animates it.
 */
function places(tile: WorkTile, filters: { id: string }[]) {
  const vars: Record<string, string> = {};
  filters.forEach((filter, i) => {
    const place = tile.places[filter.id];
    if (!place) return;
    vars[`--lg${i + 1}`] = area(place.lg);
    vars[`--md${i + 1}`] = area(place.md);
  });
  return vars as CSSProperties;
}

function Tile({ tile, filters, marks }: { tile: WorkTile; filters: { id: string }[]; marks: ReactNode }) {
  const title = `work-${tile.slug}-title`;
  const about = `work-${tile.slug}-about`;
  const positions = filters.flatMap((filter, i) => (tile.filters.includes(filter.id) ? [i + 1] : []));
  return (
    <li className="work-tile" data-work-tile={tile.slug} data-in={positions.join(" ")} style={places(tile, filters)}>
      <article className="work-card tilt" data-work-origin={tile.slug} aria-labelledby={title}>
        <Cover preview={tile.preview} screenshot={tile.screenshot} />
        <div className="work-text">
          <p className="work-eyebrow">{tile.category}</p>
          <h3 id={title} className="work-title" data-work-title>
            <Link href={tile.href} scroll={false} className="work-link" data-cursor="open" aria-describedby={about}>
              {tile.name}
            </Link>
          </h3>
          <p id={about} className="work-tagline">
            {tile.tagline.text}
            {tile.metric ? null : marks}
          </p>
          {tile.metric ? (
            <p className="work-metric">
              <MetricValue metric={tile.metric} /> <span className="work-metric-label">{tile.metric.label}</span>
              {marks}
            </p>
          ) : null}
        </div>
        <span className="tilt-specular" aria-hidden="true" />
      </article>
    </li>
  );
}

/**
 * Work (DESIGN.md §7.6): the bento. A segmented control filters it, as radios that CSS
 * reads, and the tiles reflow on a spring in a View Transition. Each tile carries its
 * category, name, tagline, top metric and living preview, tilts toward the pointer, and
 * opens its case study (app/@modal, app/work/[slug]).
 */
export function Work({ marks }: { marks: WorkMarks }) {
  const { copy } = content;
  const { filters, tiles } = work(content);
  return (
    <Section id="work" name="Work" surface="light-alt" className="work" aria-labelledby="work-title">
      <Container className="work-head">
        <Display id="work-title">{copy.work.headline}</Display>
        {copy.work.sub ? <Lead tone="fg-2">{copy.work.sub}</Lead> : null}
        <SegmentedControl
          label={copy.work.filterLabel}
          name="work-filter"
          className="work-filter"
          defaultValue={filters[0].id}
          options={filters.map((filter) => ({ value: filter.id, label: filter.label }))}
        />
        <p className="sr-only" role="status" data-work-status />
      </Container>
      <Container className="work-frame">
        <ul className="work-grid" aria-label={copy.work.headline}>
          {tiles.map((tile) => (
            <Tile key={tile.slug} tile={tile} filters={filters} marks={marks[tile.slug]} />
          ))}
        </ul>
      </Container>
      <WorkController />
    </Section>
  );
}
