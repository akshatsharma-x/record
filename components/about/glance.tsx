import type { CSSProperties, ReactNode } from "react";
import { Counter } from "@/components/ui/counter";
import { content } from "@/content";
import { glance } from "@/content/derive";
import { GlanceReveal } from "./glance-reveal";
import { LiveMonths, StudyingTile, TimeTile } from "./glance-live";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** A bento tile: its span of 12 columns from tablets up, and on phones. */
function Tile({ name, span, phone, children }: { name: string; span: 4 | 8 | 12; phone: 6 | 12; children: ReactNode }) {
  return (
    <li className="glance-tile" data-tile={name} style={{ "--span": span, "--span-phone": phone } as CSSProperties}>
      {children}
    </li>
  );
}

/**
 * At a glance (DESIGN.md §7, Part 6): six live tiles on a 12-column bento. Each animates
 * once on its first reveal, then rests. Every count comes from content through derive.ts;
 * what depends on today is computed in the browser (lib/glance.ts), so the static HTML
 * holds the facts and never a stale number.
 */
export function Glance() {
  const facts = glance(content);
  const { now, studying, research, experience, work, time } = facts;
  const venue = research.venues.map((entry) => `${entry.name} · ${entry.proceedings}`).join(" · ");

  return (
    <div className="glance">
      <h3 id="glance-title" className="glance-title text-eyebrow">
        {content.copy.about.glance}
      </h3>
      <ul className="glance-grid" aria-labelledby="glance-title">
        <Tile name="now" span={8} phone={12}>
          <span className="glance-label">Now</span>
          <span className="glance-value">{now.org}</span>
          <span className="glance-detail">{now.role}</span>
          <span className="glance-meta">
            since {now.sinceLabel}
            <LiveMonths since={now.since} timeZone={time.timeZone} />
          </span>
        </Tile>
        {studying ? (
          <Tile name="studying" span={4} phone={6}>
            <StudyingTile label="Studying" {...studying} timeZone={time.timeZone} />
          </Tile>
        ) : null}
        <Tile name="research" span={4} phone={6}>
          <span className="glance-label">Research</span>
          <span className="glance-value">
            <Counter value={research.papers} /> {plural(research.papers, "paper", "papers")}
          </span>
          {venue ? <span className="glance-detail">{venue}</span> : null}
        </Tile>
        <Tile name="experience" span={4} phone={6}>
          <span className="glance-label">Experience</span>
          <span className="glance-figure">
            <Counter value={experience.internships} />
          </span>
          <span className="glance-detail">{plural(experience.internships, "internship", "internships")}</span>
        </Tile>
        <Tile name="work" span={4} phone={6}>
          <span className="glance-label">Work</span>
          <span className="glance-figure">
            <Counter value={work.projects} />
          </span>
          <span className="glance-detail">{plural(work.projects, "project", "projects")}</span>
        </Tile>
        <Tile name="time" span={12} phone={12}>
          <TimeTile label="Local time" {...time} />
        </Tile>
      </ul>
      <GlanceReveal />
    </div>
  );
}
