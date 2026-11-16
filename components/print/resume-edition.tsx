import { content } from "@/content";
import { allSkills, publicLocation } from "@/content/derive";
import { formatYearMonth } from "@/lib/dates";

/**
 * The résumé edition (DESIGN.md §6.3, "Print the résumé edition"): the site set for paper.
 * It's hidden on screen; printing any page prints this instead. Facts come from content
 * only, and there's no phone number (§2 rule 2): email and links are the way in.
 */
function dates(start: string, end: string) {
  return `${formatYearMonth(start)} – ${end === "present" ? "present" : formatYearMonth(end)}`;
}

function host(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function ResumeEdition() {
  const { profile, experience, projects, publications, conferences, education, achievements, certificates } = content;
  const venues = new Map(conferences.map((conference) => [conference.id, conference]));
  const skills = allSkills(content);
  const categories = [...new Set(skills.map((skill) => skill.category))];
  const place = publicLocation(content).place;

  return (
    <article className="resume-edition" aria-label="Résumé">
      <header className="resume-header">
        <h1 className="resume-name">{profile.name}</h1>
        <p className="resume-role">{profile.role}</p>
        <p className="resume-contact">
          {[place, profile.email, host(profile.links.linkedin), host(profile.links.github)].join("  ·  ")}
        </p>
      </header>

      <section className="resume-section">
        <h2>Experience</h2>
        {experience.map((role) => (
          <div key={role.id} className="resume-entry">
            <p className="resume-entry-head">
              <strong>{role.org}</strong>, {role.role}
              <span className="resume-dates">{dates(role.start, role.end)}</span>
            </p>
            <ul>
              {role.bullets.map((bullet) => (
                <li key={bullet.text}>{bullet.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="resume-section">
        <h2>Projects</h2>
        {projects.map((project) => (
          <div key={project.slug} className="resume-entry">
            <p className="resume-entry-head">
              <strong>{project.name}</strong>, {project.tagline.text}
            </p>
            <p>{project.summary.text}</p>
          </div>
        ))}
      </section>

      <section className="resume-section">
        <h2>Research</h2>
        {publications.map((paper) => {
          const venue = venues.get(paper.presentedAt);
          return (
            <div key={paper.slug} className="resume-entry">
              <p className="resume-entry-head">
                <strong>{paper.title}</strong>
              </p>
              {venue ? <p>{`${venue.name}, ${venue.proceedings}`}</p> : null}
            </div>
          );
        })}
      </section>

      <section className="resume-section">
        <h2>Education</h2>
        {education.map((entry) =>
          entry.kind === "degree" ? (
            <div key={entry.id} className="resume-entry">
              <p className="resume-entry-head">
                <strong>{entry.institution}</strong>, {entry.degree} in {entry.field}, {entry.grade.text}
                <span className="resume-dates">{dates(entry.start, entry.end)}</span>
              </p>
            </div>
          ) : (
            <div key={entry.id} className="resume-entry">
              <p className="resume-entry-head">
                <strong>{entry.level}</strong> ({entry.board}), {entry.grade.text}
                <span className="resume-dates">{entry.year}</span>
              </p>
            </div>
          ),
        )}
      </section>

      <section className="resume-section">
        <h2>Skills</h2>
        {categories.map((category) => (
          <p key={category}>
            <strong>{category}:</strong> {skills.filter((skill) => skill.category === category).map((skill) => skill.label).join(", ")}
          </p>
        ))}
      </section>

      {achievements.length > 0 || certificates.length > 0 ? (
        <section className="resume-section">
          <h2>Honors and certificates</h2>
          <ul>
            {achievements.map((achievement) => (
              <li key={achievement.id}>
                {[achievement.title, achievement.org, achievement.years.join(", ")].filter(Boolean).join(", ")}
              </li>
            ))}
            {certificates.map((certificate) => (
              <li key={certificate.id}>{`${certificate.title}, ${certificate.issuer}`}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
