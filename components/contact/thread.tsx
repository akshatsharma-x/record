import { ArrowUp, CircleAlert, LoaderCircle } from "lucide-react";
import { content } from "@/content";
import { CONTACT, mailtoFor } from "@/lib/contact";

const FIELDS = [
  { id: "name", type: "text", autoComplete: "name", max: CONTACT.limits.name },
  { id: "email", type: "email", autoComplete: "email", max: CONTACT.limits.email },
] as const;

/**
 * The thread (DESIGN.md §7.9): a message thread that opens with Akshat's bubble, and the
 * visitor's bubble is the composer, with its name, email and message. The behavior checks
 * each field as the visitor leaves it, sends it to /api/contact, and on success the words
 * swoosh up into the thread as a sent bubble, "Delivered" under it (lib/contact-behavior.ts).
 * If it can't send, the words stay and the mail app is offered, with them already written.
 * Without JavaScript, the mail app is the way.
 */
export function Thread() {
  const { profile, copy } = content;
  const words = copy.contact.thread;
  const mailto = mailtoFor(profile.email, words.subject, {});
  return (
    <section className="thread" aria-labelledby="thread-title">
      <h3 id="thread-title" className="sr-only">
        {words.label}
      </h3>
      <ol className="thread-messages">
        <li className="bubble" data-from="akshat">
          <span className="sr-only">{words.akshat}: </span>
          {words.greeting}
        </li>
      </ol>
      <form
        className="composer"
        action="/api/contact"
        method="post"
        noValidate
        aria-labelledby="thread-title"
        data-you={words.you}
        data-delivered={words.delivered}
        data-sent={words.sent}
        data-to={profile.email}
        data-subject={words.subject}
        data-errors={JSON.stringify(words.errors)}
      >
        <div className="composer-row">
          {FIELDS.map((field) => (
            <div key={field.id} className="composer-field" data-field={field.id}>
              <label className="composer-label" htmlFor={`composer-${field.id}`}>
                {words[field.id]}
              </label>
              <input
                className="composer-input"
                id={`composer-${field.id}`}
                name={field.id}
                type={field.type}
                autoComplete={field.autoComplete}
                maxLength={field.max}
                required
                aria-describedby={`composer-${field.id}-error`}
                {...(field.type === "email" ? { inputMode: "email" as const, spellCheck: false, autoCapitalize: "off" } : {})}
              />
              <p className="composer-error" id={`composer-${field.id}-error`} hidden>
                <CircleAlert aria-hidden="true" />
                <span />
              </p>
            </div>
          ))}
        </div>
        <div className="composer-field" data-field="message">
          <label className="composer-label" htmlFor="composer-message">
            {words.message}
          </label>
          <textarea
            className="composer-input composer-message"
            id="composer-message"
            name="message"
            rows={4}
            maxLength={CONTACT.limits.message}
            required
            aria-describedby="composer-message-error"
          />
          <p className="composer-error" id="composer-message-error" hidden>
            <CircleAlert aria-hidden="true" />
            <span />
          </p>
        </div>
        {/* Out of sight and out of reach for a person; a script fills it in. */}
        <div className="composer-trap" aria-hidden="true" inert>
          <label htmlFor="composer-website">Website</label>
          <input id="composer-website" name={CONTACT.honeypot} type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="composer-actions">
          <div className="composer-status" role="status">
            <p className="composer-problem" hidden>
              <CircleAlert aria-hidden="true" />
              <span />
            </p>
            <a className="composer-fallback" href={mailto} hidden>
              {words.fallback}
            </a>
          </div>
          <button type="submit" className="composer-send pressable" aria-label={words.send} data-label={words.send} data-sending={words.sending}>
            <ArrowUp aria-hidden="true" className="composer-send-icon" />
            <LoaderCircle aria-hidden="true" className="composer-send-spinner" />
          </button>
        </div>
      </form>
      {/* Without JavaScript the form can't check or send: the mail app is the way. */}
      <p className="composer-nojs">
        <a href={mailto}>{words.fallback}</a>
      </p>
    </section>
  );
}
