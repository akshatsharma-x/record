import { QrCode } from "@/components/credentials/qr-code";
import { content } from "@/content";
import { allSkills, publicLocation } from "@/content/derive";
import { formatYearMonth } from "@/lib/dates";

/**
 * The résumé edition (DESIGN.md §6.3, §8): the site set for one page of paper. It's hidden
 * on screen; printing any page prints this instead. Facts come from content only, and
 * there's no phone number (§2 rule 2): the email and the links are the way in, and once
 * content has the site's address, a QR code leads back to it.
 */
function dates(start: string, end: string) {
  return `${formatYearMonth(start)} – ${end === "present" ? "present" : formatYearMonth(end)}`;
}

function host(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/** Each role's first highlights: enough for one page. */
const HIGHLIGHTS = 2;

export function ResumeEdition() {
  const { profile, experience, projects, publications, conferences, education, achievements, certificates } = content;
  const venues = new Map(conferences.map((conference) => [conference.id, conference]));
  const skills = allSkills(content);
  const categories = [...new Set(skills.map((skill) => skill.category))];
  const place = publicLocation(content).place;
  const site = profile.links.site;

  return (
    <article className="resume-edition" aria-label="Résumé">
      <header className="resume-header">
        <div className="resume-identity">
          <h1 className="resume-name">{profile.name}</h1>
          <p className="resume-role">{profile.role}</p>
          <p className="resume-contact">
            {[place, profile.email, host(profile.links.linkedin), host(profile.links.github), ...(site ? [host(site)] : [])].join("  ·  ")}
          </p>
        </div>
        {site ? (
          <figure className="resume-qr">
            <QrCode url={site} label={`The site: ${host(site)}`} />
            <figcaption>{host(site)}</figcaption>
          </figure>
        ) : null}
      </header>

      <section className="resume-section">
        <h2>Experience</h2>
        {experience.map((role) => (
          <div key={role.id} className="resume-entry">
            <p className="resume-entry-head">
              <span>
                <strong>{role.org}</strong>, {role.role}
              </span>{" "}
              <span className="resume-dates">{dates(role.start, role.end)}</span>
            </p>
            <ul>
              {role.bullets.slice(0, HIGHLIGHTS).map((bullet) => (
                <li key={bullet.text}>{bullet.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="resume-section">
        <h2>Research</h2>
        {publications.map((paper) => {
          const venue = venues.get(paper.presentedAt);
          return (
            <p key={paper.slug} className="resume-line">
              <strong>{paper.title}</strong>
              {venue ? `. ${venue.name}, ${venue.proceedings}` : null}
            </p>
          );
        })}
      </section>

      <section className="resume-section">
        <h2>Projects</h2>
        {projects.map((project) => (
          <p key={project.slug} className="resume-line">
            <strong>{project.name}</strong>: {project.tagline.text}
          </p>
        ))}
      </section>

      <div className="resume-columns">
        <section className="resume-section">
          <h2>Skills</h2>
          {categories.map((category) => (
            <p key={category} className="resume-line">
              <strong>{category}:</strong> {skills.filter((skill) => skill.category === category).map((skill) => skill.name).join(", ")}
            </p>
          ))}
        </section>

        <div className="resume-stack">
          <section className="resume-section">
            <h2>Education</h2>
            {education.map((entry) =>
              entry.kind === "degree" ? (
                <p key={entry.id} className="resume-line">
                  <strong>{entry.institution}</strong>, {entry.degree} in {entry.field}, {entry.grade.text}.{" "}
                  <span className="resume-dates">{dates(entry.start, entry.end)}</span>
                </p>
              ) : (
                <p key={entry.id} className="resume-line">
                  <strong>{entry.level}</strong> ({entry.board}), {entry.grade.text}. <span className="resume-dates">{entry.year}</span>
                </p>
              ),
            )}
          </section>

          {achievements.length > 0 || certificates.length > 0 ? (
            <section className="resume-section">
              <h2>Honors and certificates</h2>
              {achievements.map((achievement) => (
                <p key={achievement.id} className="resume-line">
                  {[achievement.title, achievement.org, achievement.years.join(", ")].filter(Boolean).join(", ")}
                </p>
              ))}
              {certificates.map((certificate) => (
                <p key={certificate.id} className="resume-line">{`${certificate.title}, ${certificate.issuer}`}</p>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
