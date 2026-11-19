import { content } from "@/content";

/**
 * The accessibility statement (Part 16): what the site aims for, what's tested, the gaps
 * known so far and who to tell, in content's words. It claims only what the tests check.
 */
export function Statement() {
  const words = content.copy.colophon.accessibility;
  const { email } = content.profile;
  const [before, after] = words.contact.split("{email}");
  return (
    <div className="a11y-statement">
      <h2 id="accessibility-title" className="colophon-title">
        {words.label}
      </h2>
      {words.statement.map((paragraph) => (
        <p key={paragraph} className="a11y-statement-text">
          {paragraph}
        </p>
      ))}
      <h3 id="accessibility-gaps" className="a11y-statement-gaps-title">
        {words.gaps.label}
      </h3>
      <ul className="a11y-statement-gaps" aria-labelledby="accessibility-gaps">
        {words.gaps.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="a11y-statement-text">
        {before}
        <a href={`mailto:${email}`}>{email}</a>
        {after}
      </p>
    </div>
  );
}
