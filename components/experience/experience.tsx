import { type CSSProperties, Fragment, type ReactNode } from "react";
import { Behavior } from "@/components/ui/behavior";
import { Chip } from "@/components/ui/chip";
import { Container, Section } from "@/components/ui/layout";
import { Display, Lead } from "@/components/ui/type";
import { content } from "@/content";
import { type EditClip, type EditMetricGroup, type EditPanel, edit } from "@/content/derive";
import { monthsAt } from "@/lib/edit";
import { RoleVisual } from "./visuals";

const ID = "experience";
const vars = (values: Record<string, number | string>) => values as CSSProperties;

/** Footnote marks for each panel, made by the page so they're numbered in page order. */
export type EditMarks = Record<string, ReactNode[]>;

function Metrics({ groups, marks }: { groups: EditMetricGroup[]; marks: ReactNode[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="edit-metrics">
      {groups.map((group, g) => (
        <p key={g} className="edit-metric-group">
          {group.metrics.map((metric, m) => (
            <span key={m} className="edit-metric">
              <span className="edit-metric-value">
                <span className="sr-only">{metric.token}</span>
                <span aria-hidden="true">
                  {metric.parts.map((part, i) =>
                    part.kind === "text" ? (
                      part.text
                    ) : (
                      <span key={i} data-count={part.value} data-decimals={part.decimals} data-group={part.group ? "" : undefined}>
                        {part.group ? part.value.toLocaleString("en-US") : part.value.toFixed(part.decimals)}
                      </span>
                    ),
                  )}
                </span>
              </span>{" "}
              <span className="edit-metric-label">
                {metric.label}
                {m === group.metrics.length - 1 ? marks[g] : null}
              </span>{" "}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function Panel({ panel, marks }: { panel: EditPanel; marks: ReactNode[] }) {
  const title = `${panel.id}-title`;
  if (panel.kind === "role") {
    return (
      <article className="edit-panel" data-panel={panel.id} data-kind="role" data-evidence-id={`role:${panel.id}`} aria-labelledby={title}>
        <div className="edit-panel-text">
          <p className="edit-kicker">
            {panel.dates}
            {panel.location ? ` · ${panel.location}` : null}
          </p>
          <h3 id={title} className="edit-title">
            {panel.org}
          </h3>
          <p className="edit-role">{panel.role}</p>
          <p className="edit-summary">{panel.summary}</p>
          <Metrics groups={panel.groups} marks={marks} />
          <ul className="edit-highlights">
            {panel.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
          <ul className="edit-stack" aria-label="Stack">
            {panel.stack.map((item) => (
              <li key={item}>
                <Chip>{item}</Chip>
              </li>
            ))}
          </ul>
        </div>
        {panel.visual ? (
          <div className="edit-visual">
            <RoleVisual visual={panel.visual} />
          </div>
        ) : null}
      </article>
    );
  }
  const kicker = panel.kind === "research" ? `${panel.dates} · ${panel.place}` : panel.kind === "education" ? panel.dates : panel.years;
  const name = panel.kind === "research" ? panel.name : panel.kind === "education" ? panel.institution : panel.title;
  return (
    <article className="edit-panel" data-panel={panel.id} data-kind={panel.kind} aria-labelledby={title}>
      <div className="edit-panel-text">
        <p className="edit-kicker">{kicker}</p>
        <h3 id={title} className="edit-title">
          {name}
        </h3>
        {panel.kind === "research" ? (
          <>
            <p className="edit-role">
              {panel.type} · {panel.proceedings}
            </p>
            <ul className="edit-highlights">
              {panel.papers.map((paper) => (
                <li key={paper.title}>
                  {paper.title} <span className="edit-status">{paper.status}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {panel.kind === "education" ? (
          <>
            <p className="edit-role">{panel.degree}</p>
            <p className="edit-summary">{panel.grade}</p>
            <ul className="edit-stack" aria-label="Coursework">
              {panel.coursework.map((course) => (
                <li key={course}>
                  <Chip>{course}</Chip>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {panel.kind === "honor" ? (
          <>
            {panel.org ? <p className="edit-role">{panel.org}</p> : null}
            {panel.detail ? (
              <p className="edit-summary">
                {panel.detail.text}
                {marks[0]}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}

/**
 * The name a screen reader hears, starting with the words on the clip (WCAG 2.5.3): "EY,
 * Ernst & Young, Software Development Intern, Jun–Jul 2026", where the clip says "EY".
 */
function clipName(clip: EditClip): string {
  const title = clip.title.startsWith(clip.label) ? clip.title : `${clip.label}, ${clip.title.replace(` (${clip.label})`, "")}`;
  return [title, clip.subtitle, clip.dates].filter(Boolean).join(", ");
}

function Clip({ clip, from }: { clip: EditClip; from: number }) {
  return (
    <button
      type="button"
      className="edit-clip"
      data-clip={clip.id}
      data-panel={clip.panel}
      data-track={clip.track}
      data-evidence-clip={clip.track === "work" ? `role:${clip.panel}` : undefined}
      data-precision={clip.precision}
      data-ongoing={clip.end === null || undefined}
      tabIndex={-1}
      aria-describedby="edit-hint"
      aria-label={clipName(clip)}
      style={vars({
        "--from": Math.round((monthsAt(clip.start) - from) * 1000) / 1000,
        ...(clip.end ? { "--to": Math.round((monthsAt(clip.end) - from) * 1000) / 1000 } : {}),
        "--lane": clip.lane,
      })}
    >
      <span className="edit-clip-title">{clip.label}</span>
    </button>
  );
}

/**
 * Experience as "the edit" (DESIGN.md §7.4): a viewer over a multi-track timeline the
 * visitor scrubs, like a video editor, pinned on wide screens. The playhead follows the
 * scroll, the clip under it plays in the viewer, and a click jumps the playhead there.
 * Phones, reduced motion and no JavaScript get the same panels as a stack of cards under
 * a read-only strip. The timeline comes first in the document, so Tab reaches the clips
 * before the panel they show; the viewer sits above it on screen.
 */
export function Experience({ marks }: { marks: EditMarks }) {
  const data = edit(content);
  const from = monthsAt(data.start);
  // Until the browser knows today, the scale ends at the last date content knows has passed.
  const span = Math.round((monthsAt(data.known) - from) * 1000) / 1000;
  const firstYear = Number(data.start.slice(0, 4)) + 1;
  const lastYear = Number(data.known.slice(0, 4)) + 2;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const { headline, sub } = content.copy.experience;

  return (
    <Section id={ID} name="Experience" surface="light" padding="none" aria-labelledby={`${ID}-title`} className="experience">
      <Container className="experience-head">
        <Display id={`${ID}-title`}>{headline}</Display>
        {sub ? <Lead tone="fg-2">{sub}</Lead> : null}
      </Container>
      <div className="edit" id="edit" style={vars({ "--span": span })}>
        <div className="edit-stage">
          <Container width="wide" className="edit-frame">
            <div className="edit-timeline" role="group" aria-label="Timeline" aria-hidden="true">
              <p className="edit-hint" id="edit-hint">
                Press Space to play
              </p>
              <span className="edit-ruler-label" />
              {/* The scale and the playhead's date only echo the dates each clip's name says. */}
              <div className="edit-ruler" aria-hidden="true">
                {/* Years past the scale's end are clipped: they show as today reaches them. */}
                <div className="edit-scale">
                  {years.map((year) => (
                    <Fragment key={year}>
                      <span className="edit-year" style={vars({ "--at": monthsAt(`${year}-01-01`) - from })}>
                        {year}
                      </span>{" "}
                    </Fragment>
                  ))}
                </div>
                <span className="edit-now">Now</span>
              </div>
              {data.tracks.map((track) => (
                <div key={track.id} className="edit-track" data-track={track.id} style={vars({ "--lanes": track.lanes })}>
                  <span className="edit-track-label">{track.label}</span>
                  <div className="edit-lanes">
                    {track.clips.map((clip) => (
                      <Clip key={clip.id} clip={clip} from={from} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="edit-overlay" aria-hidden="true">
                <span className="edit-playhead">
                  <span className="edit-playhead-time" />
                </span>
              </div>
            </div>
            <div className="edit-viewer">
              {data.panels.map((panel) => (
                <Panel key={panel.id} panel={panel} marks={marks[panel.id] ?? []} />
              ))}
            </div>
          </Container>
        </div>
      </div>
      <Behavior
        section="experience"
        id="edit"
        data={{
          start: data.start,
          timeZone: content.profile.location.timeZone,
          clips: data.tracks.flatMap((track) => track.clips.map((clip) => ({ id: clip.id, track: track.id, lane: clip.lane, start: clip.start, end: clip.end, panel: clip.panel }))),
        }}
      />
    </Section>
  );
}
