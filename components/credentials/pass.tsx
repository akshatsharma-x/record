import { Info } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { content } from "@/content";
import type { Pass, PassSection } from "@/content/derive";
import { QrCode } from "./qr-code";

const vars = (values: Record<string, number | string>) => values as CSSProperties;

/** A footnote mark for a pass's field or back section, keyed by where it is. */
export type PassMarks = Record<string, ReactNode>;
export const fieldKey = (pass: string, index: number) => `${pass}:field:${index}`;
export const backKey = (pass: string, index: number) => `${pass}:back:${index}`;

function Back({ pass, section, index, marks }: { pass: Pass; section: PassSection; index: number; marks: PassMarks }) {
  switch (section.kind) {
    case "list":
      return (
        <div className="pass-row">
          <dt>{section.label}</dt>
          <dd>
            <ul className="pass-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </dd>
        </div>
      );
    case "text":
      return (
        <div className="pass-row">
          <dt>{section.label}</dt>
          <dd>
            {section.text}
            {marks[backKey(pass.id, index)]}
          </dd>
        </div>
      );
    case "link":
      return (
        <div className="pass-row">
          <dt>{section.label}</dt>
          <dd>
            <a className="pass-link" href={section.href} rel="noopener" target="_blank">
              {section.text}
            </a>
          </dd>
        </div>
      );
    case "expiry":
      return (
        <div className="pass-row" data-expiry={section.expiry.expires ?? undefined} data-expired={section.expiry.expired ? "" : undefined}>
          <dt data-expiry-label>{section.expiry.label}</dt>
          <dd>{section.expiry.value}</dd>
        </div>
      );
  }
}

/**
 * A pass (DESIGN.md §7.8): a 3:2 card in its own color, the issuer's tone from content or
 * one of the finish's, never a logo. The front has what it is, who issued it, its fields
 * as a wallet sets them and, when there's a public page to verify it, a QR code to it.
 * The ⓘ checkbox turns it over to the back, in CSS, so it works without JavaScript; the
 * stack, the keys and the spring are lib/credentials-behavior.ts's.
 */
export function PassCard({ pass, index, tone, marks }: { pass: Pass; index: number; tone: string; marks: PassMarks }) {
  const words = content.copy.credentials.wallet;
  const titleId = `pass-${pass.id}-title`;
  return (
    <li
      className="pass"
      id={`pass-${pass.id}`}
      data-pass={pass.id}
      data-kind={pass.kind}
      data-tone={tone}
      style={vars({ "--i": index, "--slot": index, ...(pass.tone ? { "--pass-tone": pass.tone } : {}) })}
    >
      {/* What brings it forward in the stack; only shown once the stack is (with JavaScript). */}
      <button
        type="button"
        className="pass-select"
        aria-labelledby={titleId}
        aria-describedby={`pass-${pass.id}-kind`}
        aria-pressed={index === 0}
        tabIndex={index === 0 ? 0 : -1}
        data-cursor="default"
      />
      <div className="pass-card">
        <div className="pass-face" data-face="front">
          <p className="pass-kind" id={`pass-${pass.id}-kind`}>
            {pass.label}
            {pass.expiry?.expires ? (
              <span className="pass-badge" data-expiry-badge hidden={!pass.expiry.expired}>
                {words.expired}
              </span>
            ) : null}
          </p>
          <h4 className="pass-title" id={titleId}>
            {pass.title}
          </h4>
          <p className="pass-subtitle">{pass.subtitle}</p>
          <dl className="pass-fields">
            {pass.fields.map((field, i) => (
              <div key={field.label} className="pass-field">
                <dt>{field.label}</dt>
                <dd className={field.mono ? "pass-mono" : undefined}>
                  {field.value}
                  {marks[fieldKey(pass.id, i)]}
                </dd>
              </div>
            ))}
          </dl>
          {pass.verifyUrl ? (
            <div className="pass-scan">
              <QrCode url={pass.verifyUrl} label={`${words.scan}: ${pass.title}`} />
            </div>
          ) : null}
        </div>
        <div className="pass-face" data-face="back">
          <p className="pass-kind">{pass.title}</p>
          <dl className="pass-back">
            {pass.back.map((section, i) => (
              <Back key={`${section.kind}-${i}`} pass={pass} section={section} index={i} marks={marks} />
            ))}
          </dl>
        </div>
      </div>
      <label className="pass-flip">
        <input type="checkbox" className="pass-flip-input" aria-label={`${words.flip}: ${pass.title}`} />
        <Info aria-hidden="true" className="pass-flip-icon" />
      </label>
    </li>
  );
}
