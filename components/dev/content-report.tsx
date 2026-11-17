import type { ReactNode } from "react";
import type { Content } from "@/content";
import type { Derived } from "@/content/derive";
import type { TodoComment } from "@/content/todos";
import { formatIsoDate, formatYearMonth } from "@/lib/dates";
import { ClaimText, Draft, Gap, KeyValues, List, Mono, Section, SubHeading, Table, Value } from "./primitives";

/** /dev/content: every entity, derived value, warning and TODO(akshat), for proofreading. */
export function ContentReport({ content, derived, todos }: { content: Content; derived: Derived; todos: TodoComment[] }) {
  const draftPaths = derived.drafts.flatMap((draft) => draft.paths);
  const isDraft = (path: string) =>
    draftPaths.some((draft) => path === draft || path.startsWith(`${draft}.`) || path.startsWith(`${draft}[`));
  const durations = new Map(derived.durations.map((duration) => [duration.id, duration]));
  const statuses = new Map(derived.publications.map((paper) => [paper.slug, paper]));
  const conferences = new Map(content.conferences.map((conference) => [conference.id, conference]));
  const { counts, graduation, location } = derived;
  const dateRange = (start: string, end: string) =>
    `${formatYearMonth(start)} – ${end === "present" ? "present" : formatYearMonth(end)}`;
  const labeled = (path: string, value: ReactNode) => (
    <>
      {value}
      {isDraft(path) ? <Draft /> : null}
    </>
  );

  const toc: [string, string][] = [
    ["summary", "Summary"],
    ["todo", "TODO(akshat)"],
    ["warnings", "Warnings"],
    ["derived", "Derived values"],
    ["evidence", "Skill evidence"],
    ["timeline", "Timeline"],
    ["compare", "/compare"],
    ["search", "Search index"],
    ["profile", "Profile"],
    ["experience", "Experience"],
    ["education", "Education"],
    ["research", "Research"],
    ["projects", "Projects"],
    ["skills", "Skills"],
    ["credentials", "Certificates and achievements"],
    ["highlights", "Highlights"],
    ["footnotes", "Footnotes"],
    ["copy", "Copy"],
  ];

  return (
    <main className="mx-auto max-w-wide space-y-16 px-6 py-12">
      <header className="space-y-4">
        <p className="font-mono text-caption opacity-70">/dev/content · development only · 404 in production</p>
        <h1 className="text-display">Content</h1>
        <p className="max-w-measure opacity-80">
          Everything the site knows, as the site will use it. Proofread the entities, check the derived values, and
          fill the gaps in <Mono>content/data.ts</Mono>. Derived for {formatIsoDate(derived.today)} (
          {location.timeZoneLabel}).
        </p>
        <nav aria-label="On this page">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a className="underline decoration-hairline underline-offset-(--underline-offset) hover:decoration-current" href={`#${id}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Section id="summary" title="Summary">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["internships", counts.internships],
              ["papers", counts.papers],
              ["projects", counts.projects],
              ["skills", counts.skills],
              ["certificates", counts.certificates],
              ["achievements", counts.achievements],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-card-s border border-hairline p-4">
              <dt className="text-caption opacity-70">{label}</dt>
              <dd className="text-display tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-caption opacity-80">
          {derived.warnings.length} warnings · {derived.gaps.length} gaps · {todos.length} TODO(akshat) comments ·{" "}
          {draftPaths.length} drafts awaiting approval
        </p>
      </Section>

      <Section
        id="todo"
        title="TODO(akshat)"
        note="Gaps are null fields: production hides them and never shows a placeholder. Fill them in content/data.ts and they appear without code changes."
      >
        <SubHeading>Gaps ({derived.gaps.length} null fields)</SubHeading>
        <ul className="columns-1 gap-8 text-caption md:columns-2 lg:columns-3">
          {derived.gaps.map((path) => (
            <li key={path} className="break-inside-avoid py-0.5">
              <Mono>{path}</Mono>
            </li>
          ))}
        </ul>
        <SubHeading>Comments in content/data.ts ({todos.length})</SubHeading>
        <Table
          caption="TODO(akshat) comments"
          head={["Line", "What's needed", "On"]}
          rows={todos.map((todo) => [
            <Mono key="line">{todo.line}</Mono>,
            todo.note || <span className="opacity-50">(fill this in)</span>,
            <Mono key="context">{todo.context}</Mono>,
          ])}
        />
        <SubHeading>Copy awaiting approval</SubHeading>
        <Table
          caption="Drafts"
          head={["Pattern", "Covers"]}
          rows={derived.drafts.map((draft) => [
            <Mono key="pattern">{draft.pattern}</Mono>,
            <List key="paths" items={draft.paths.map((path) => <Mono key={path}>{path}</Mono>)} />,
          ])}
        />
      </Section>

      <Section
        id="warnings"
        title={`Warnings (${derived.warnings.length})`}
        note="Warnings don't fail the build. They point at numbers without footnotes, papers without a DOI and projects without a year."
      >
        <Table
          caption="Content warnings"
          head={["Kind", "Field", "Detail"]}
          rows={derived.warnings.map((warning) => [
            warning.kind,
            <Mono key="path">{warning.path}</Mono>,
            warning.message,
          ])}
        />
      </Section>

      <Section id="derived" title="Derived values">
        <KeyValues
          entries={[
            ["today", `${formatIsoDate(derived.today)} in ${location.timeZone}`],
            ["now", `${derived.now.role} at ${derived.now.org}, since ${formatYearMonth(derived.now.since)}`],
            ["public location", `${location.place} · ${location.timeZoneLabel}${location.city ? "" : " (city unconfirmed)"}`],
            ["credentials headline", derived.credentialsHeadline],
            [
              "graduation",
              graduation
                ? `${graduation.percent}% through ${dateRange(graduation.start, graduation.end)} · ${graduation.monthsRemaining} months left · ${graduation.daysToGraduationMonth} days until ${formatYearMonth(graduation.end)} begins`
                : "no degree",
            ],
            [
              "paper status",
              <List
                key="status"
                items={derived.publications.map((paper) => (
                  <span key={paper.slug}>
                    <Mono>{paper.slug}</Mono>: {paper.label}
                  </span>
                ))}
              />,
            ],
          ]}
        />
        <SubHeading>Role durations</SubHeading>
        <Table
          caption="Role durations"
          head={["Role", "Dates", "Months", "Label"]}
          rows={derived.durations.map((duration) => [
            <Mono key="id">{duration.id}</Mono>,
            dateRange(duration.start, duration.end),
            <span key="months" className="tabular-nums">
              {duration.months}
            </span>,
            duration.label,
          ])}
        />
      </Section>

      <Section
        id="evidence"
        title="Skill evidence"
        note="Where each skill was used: the roles, projects and papers that name it or one of its aliases. The matched term is in brackets."
      >
        <Table
          caption="Skill evidence"
          head={["Skill", "Category", "Core", "Aliases", "Roles", "Projects", "Papers", "First dated year"]}
          rows={derived.skillEvidence.map((skill) => {
            const hits = (list: typeof skill.roles) =>
              list.length > 0 ? (
                <List
                  items={list.map((hit) => (
                    <span key={hit.id}>
                      {hit.title} <span className="opacity-60">({hit.matched.join(", ")})</span>
                    </span>
                  ))}
                />
              ) : (
                <span className="opacity-40">—</span>
              );
            return [
              <span key="label" className={skill.core ? "font-semibold" : undefined}>
                {skill.label}
              </span>,
              skill.category,
              skill.core ? "core" : "",
              <Value key="aliases" value={skill.aliases} />,
              hits(skill.roles),
              hits(skill.projects),
              hits(skill.papers),
              skill.firstYear ?? <span className="opacity-40">—</span>,
            ];
          })}
        />
      </Section>

      <Section
        id="timeline"
        title="Timeline (Part 7)"
        note={`From ${formatIsoDate(derived.timeline.start)} to today, ${formatIsoDate(derived.timeline.today)}. Ends are exclusive. A year-precision clip renders as a year bracket, never an invented month.`}
      >
        {derived.timeline.tracks.map((track) => (
          <div key={track.id} className="space-y-2">
            <SubHeading>
              {track.label} · {track.clips.length} {track.clips.length === 1 ? "clip" : "clips"} on {track.lanes}{" "}
              {track.lanes === 1 ? "lane" : "lanes"}
            </SubHeading>
            <Table
              caption={`${track.label} track`}
              head={["Clip", "Detail", "Start", "End", "Precision", "Lane", "Ongoing"]}
              rows={track.clips.map((clip) => [
                clip.title,
                clip.subtitle ?? "",
                <Mono key="start">{clip.start}</Mono>,
                <Mono key="end">{clip.end}</Mono>,
                clip.precision,
                clip.lane,
                clip.ongoing ? "yes" : "",
              ])}
            />
          </div>
        ))}
      </Section>

      <Section id="compare" title="/compare (Part 13)" note="Built only from dated entries. Projects join once they have a year.">
        <Table
          caption="Compare table"
          head={["", ...derived.compare.years.map(String)]}
          rows={derived.compare.rows.map((row) => [
            <span key="label" className="font-semibold">
              {row.label}
            </span>,
            ...derived.compare.years.map((year) => (
              <List key={year} items={row.cells[year].map((item) => <span key={item}>{item}</span>)} />
            )),
          ])}
        />
      </Section>

      <Section id="search" title={`Search index (Part 4) · ${derived.searchIndex.length} entries`}>
        <Table
          caption="Search index"
          head={["Kind", "Title", "Subtitle", "Link", "Keywords"]}
          rows={derived.searchIndex.map((entry) => [
            entry.kind,
            entry.title,
            entry.subtitle,
            <Mono key="href">{entry.href}</Mono>,
            <Value key="keywords" value={entry.keywords} />,
          ])}
        />
      </Section>

      <Section id="profile" title="Profile">
        <KeyValues
          entries={[
            ["name", content.profile.name],
            ["initials", content.profile.initials],
            ["role", labeled("profile.role", content.profile.role)],
            ["headline", labeled("profile.headline", content.profile.headline)],
            ["now", <Mono key="now">{content.profile.now}</Mono>],
            ["city", content.profile.location.city],
            ["cityConfirmed", <Value key="cityConfirmed" value={content.profile.location.cityConfirmed} />],
            ["country", content.profile.location.country],
            ["timeZone", content.profile.location.timeZone],
            ["working hours", `${content.profile.workingHours.start}–${content.profile.workingHours.end}`],
            ["availability", <Value key="availability" value={content.profile.availability} />],
            ["email", content.profile.email],
            ["linkedin", content.profile.links.linkedin],
            ["github", content.profile.links.github],
            ["scholar", <Value key="scholar" value={content.profile.links.scholar} />],
            ["orcid", <Value key="orcid" value={content.profile.links.orcid} />],
            ["résumé PDF", <Value key="resume" value={content.profile.resumePdf} />],
            [
              "photo",
              content.profile.photo
                ? `${content.profile.photo.subject.src} + ${content.profile.photo.plate.src} (${content.profile.photo.subject.width}×${content.profile.photo.subject.height}, head at ${Math.round(content.profile.photo.headTop * 100)}%)`
                : <Gap />,
            ],
            [
              "bio",
              labeled(
                "profile.bio",
                <div className="max-w-measure space-y-3">
                  {content.profile.bio.map((paragraph) => (
                    <p key={paragraph.text}>
                      <ClaimText {...paragraph} />
                    </p>
                  ))}
                </div>,
              ),
            ],
            ["building", `${content.currentFocus.building.name} — ${content.currentFocus.building.detail}`],
            ["researching", <Value key="researching" value={content.currentFocus.researching} />],
            ["reading", <Value key="reading" value={content.currentFocus.reading} />],
          ]}
        />
      </Section>

      <Section id="experience" title="Experience">
        <Table
          caption="Experience"
          head={["Role", "Dates", "Location", "Summary and bullets", "Stack"]}
          rows={content.experience.map((role) => [
            <div key="role" className="space-y-1">
              <div className="font-semibold">{role.org}</div>
              <div>{role.role}</div>
              <div className="opacity-60">{role.kind}</div>
            </div>,
            <div key="dates" className="whitespace-nowrap">
              {dateRange(role.start, role.end)}
              <div className="opacity-60">{durations.get(role.id)?.label}</div>
            </div>,
            <Value key="location" value={role.location} />,
            <div key="text" className="max-w-measure space-y-2">
              <p>
                <ClaimText {...role.summary} />
              </p>
              <List items={role.bullets.map((bullet) => <ClaimText key={bullet.text} {...bullet} />)} />
              {role.confidential ? (
                <p className="text-footnote opacity-70">
                  {role.confidential.note} Shareable: <Value value={role.confidential.shareable} />
                </p>
              ) : null}
            </div>,
            <Value key="stack" value={role.stack} />,
          ])}
        />
      </Section>

      <Section id="education" title="Education">
        <Table
          caption="Education"
          head={["Entry", "When", "Grade", "Coursework"]}
          rows={content.education.map((entry) =>
            entry.kind === "degree"
              ? [
                  <div key="entry">
                    <div className="font-semibold">{entry.institution}</div>
                    {entry.degree}, {entry.field}
                  </div>,
                  dateRange(entry.start, entry.end),
                  <ClaimText key="grade" {...entry.grade} />,
                  <Value key="coursework" value={entry.coursework} />,
                ]
              : [
                  `${entry.level} (${entry.board})`,
                  entry.year,
                  <ClaimText key="grade" {...entry.grade} />,
                  "",
                ],
          )}
        />
      </Section>

      <Section id="research" title="Research">
        {content.conferences.map((conference) => (
          <KeyValues
            key={conference.id}
            entries={[
              ["conference", `${conference.name} · ${conference.kind}`],
              ["where", `${conference.host}, ${conference.city}`],
              ["when", `${formatIsoDate(conference.start)} – ${formatIsoDate(conference.end)}`],
              ["proceedings", conference.proceedings],
            ]}
          />
        ))}
        <Table
          caption="Publications"
          head={["Paper", "Status", "TL;DR", "Keywords", "Co-authors", "Abstract", "DOI", "PDF"]}
          rows={content.publications.map((paper) => [
            <div key="title" className="max-w-measure">
              <div className="font-semibold">{paper.title}</div>
              <Mono>{paper.slug}</Mono> · {conferences.get(paper.presentedAt)?.name}
            </div>,
            statuses.get(paper.slug)?.label,
            labeled(`publications[${paper.slug}].tldr`, <span className="block max-w-measure">{paper.tldr}</span>),
            <Value key="keywords" value={paper.keywords} />,
            <Value key="coAuthors" value={paper.coAuthors} />,
            <Value key="abstract" value={paper.abstract} />,
            <Value key="doi" value={paper.doi} />,
            <Value key="pdf" value={paper.pdf} />,
          ])}
        />
      </Section>

      <Section id="projects" title="Projects">
        <Table
          caption="Projects"
          head={["Project", "Summary", "Stack", "Year", "Role", "Links", "Screenshots"]}
          rows={content.projects.map((project) => [
            <div key="name" className="max-w-measure space-y-1">
              <div className="font-semibold">{project.name}</div>
              <div>
                <ClaimText {...project.tagline} />
              </div>
              <div className="opacity-60">
                {project.category} · <Mono>{project.slug}</Mono>
              </div>
            </div>,
            <p key="summary" className="max-w-measure">
              <ClaimText {...project.summary} />
            </p>,
            <Value key="stack" value={project.stack} />,
            <Value key="year" value={project.year} />,
            <Value key="role" value={project.role} />,
            <Value key="links" value={project.links} />,
            <Value key="screenshots" value={project.screenshots} />,
          ])}
        />
      </Section>

      <Section id="skills" title="Skills" note="Core skills are in bold. Aliases and evidence are in the skill evidence table above.">
        <Table
          caption="Skills by category"
          head={["Category", "Skills"]}
          rows={content.skills.map((category) => [
            <span key="name" className="whitespace-nowrap font-semibold">
              {category.name} ({category.skills.length})
            </span>,
            <span key="skills">
              {category.skills.map((skill, i) => (
                <span key={skill.name}>
                  {i > 0 ? " · " : ""}
                  <span className={skill.core ? "font-semibold" : undefined}>
                    {skill.detail ? `${skill.name} (${skill.detail})` : skill.name}
                  </span>
                </span>
              ))}
            </span>,
          ])}
        />
      </Section>

      <Section id="credentials" title="Certificates and achievements">
        <SubHeading>Certificates ({content.certificates.length})</SubHeading>
        {content.certificates.length === 0 ? (
          <p className="opacity-70">
            None yet, so the credentials heading reads “{derived.credentialsHeadline}”. It never shows a zero.
          </p>
        ) : (
          <Table
            caption="Certificates"
            head={["Certificate", "Issued", "Expires", "Credential ID", "Verify", "Skills", "Proves"]}
            rows={content.certificates.map((certificate) => [
              `${certificate.title} · ${certificate.issuer}`,
              formatYearMonth(certificate.issued),
              <Value key="expires" value={certificate.expires} />,
              <Value key="id" value={certificate.credentialId} />,
              <Value key="verify" value={certificate.verifyUrl} />,
              <Value key="skills" value={certificate.skills} />,
              <Value key="proves" value={certificate.proves} />,
            ])}
          />
        )}
        <SubHeading>Achievements</SubHeading>
        <Table
          caption="Achievements"
          head={["Achievement", "From", "Years", "Detail"]}
          rows={content.achievements.map((achievement) => [
            achievement.title,
            achievement.org ?? "",
            achievement.years.join(", "),
            achievement.detail ? <ClaimText key="detail" {...achievement.detail} /> : "",
          ])}
        />
      </Section>

      <Section id="highlights" title="Highlights (the reel cards)">
        <Table
          caption="Highlights"
          head={["Card", "Sourced by", "Film", "Links to"]}
          rows={content.highlights.map((highlight) => [
            <ClaimText key="text" text={highlight.text} footnotes={highlight.footnotes} />,
            highlight.footnotes.length > 0
              ? `footnote ${highlight.footnotes.join(", ")}`
              : (highlight.source ?? <span className="opacity-40">—</span>),
            <Mono key="film">{Object.entries(highlight.film).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join("–") : value}`).join(" · ")}</Mono>,
            <Mono key="ref">
              #{highlight.ref.section}
              {highlight.ref.id ? ` · ${highlight.ref.id}` : ""}
            </Mono>,
          ])}
        />
      </Section>

      <Section id="footnotes" title="Footnotes">
        <Table
          caption="Footnotes"
          head={["#", "Note", "Source"]}
          rows={content.footnotes.map((footnote) => [
            <Mono key="id">{footnote.id}</Mono>,
            footnote.note,
            footnote.source === undefined ? <span className="opacity-60">in the note</span> : <Value value={footnote.source} />,
          ])}
        />
      </Section>

      <Section id="copy" title="Copy" note="All copy is a draft until Akshat approves it.">
        <Table
          caption="Copy by section"
          head={["Section", "Eyebrow", "Headline", "Sub", "Other"]}
          rows={[
            ["hero", "", "(name, role and headline come from profile)", "", `CTAs: “${content.copy.hero.ctaWork}”, “${content.copy.hero.ctaHello}”`],
            ["statement", "", content.copy.statement.headline, "", `Gradient phrase: “${content.copy.statement.emphasis}”`],
            [
              "about",
              "",
              content.copy.about.headline,
              "",
              `“${content.copy.about.currently}” · bento: “${content.copy.about.glance}” · a visitor's day: ${content.copy.about.visitorDay.start}–${content.copy.about.visitorDay.end}`,
            ],
            ["highlights", content.copy.highlights.eyebrow, "", "", ""],
            ...(["experience", "research", "work", "skills"] as const).map((key) => {
              const copy = content.copy[key];
              return [key, copy.eyebrow ?? "", copy.headline, copy.sub ?? "", ""];
            }),
            [
              "contact",
              "",
              content.copy.contact.headline,
              "",
              `“${content.copy.contact.clock}” · “${content.copy.contact.overlap}” · “${content.copy.contact.noOverlap}” · opens with “${content.copy.contact.thread.greeting}”`,
            ],
            [
              "credentials",
              content.copy.credentials.eyebrow ?? "",
              content.copy.credentials.headline,
              content.copy.credentials.sub ?? "",
              `Without certificates: “${content.copy.credentials.headlineWithoutCertificates}” · Honors: “${content.copy.credentials.honors}”`,
            ],
            ["footer", "", content.copy.footer.credit, "", `“${content.copy.footer.cookies}” · “${content.copy.footer.copyright}”`],
            ["colophon", "", content.copy.colophon.headline, content.copy.colophon.sub, `${content.copy.colophon.rows.length} rows`],
          ].map((row) => row.map((cell, i) => (i === 0 ? <Mono key="section">{cell}</Mono> : cell)))}
        />
      </Section>
    </main>
  );
}
