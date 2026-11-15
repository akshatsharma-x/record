import type { ReactNode } from "react";

/**
 * Building blocks for the dev-only pages. Styling is provisional until Part 2's tokens:
 * system colors and the browser's light/dark scheme only.
 */

export function Section({ id, title, note, children }: { id: string; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 space-y-4">
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {note ? <p className="max-w-prose opacity-70">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-lg font-semibold">{children}</h3>;
}

export function Table({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-current/15">
      <table className="w-full border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="border-b border-current/15 px-3 py-2 align-bottom font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top odd:bg-current/[0.03]">
              {row.map((cell, j) => (
                <td key={j} className="border-t border-current/10 px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KeyValues({ entries }: { entries: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-xl border border-current/15 p-4 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-mono opacity-70">{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A gap: a null field that only Akshat can fill. */
export function Gap() {
  return <span className="rounded border border-current/30 px-1.5 font-mono text-xs opacity-70">null · gap</span>;
}

export function Draft() {
  return <span className="ml-2 rounded border border-current/30 px-1.5 text-xs opacity-70">draft</span>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[0.9em]">{children}</code>;
}

/** Text with its footnote numbers as superscripts. */
export function ClaimText({ text, footnotes }: { text: string; footnotes: number[] }) {
  return (
    <>
      {text}
      {footnotes.map((id) => (
        <sup key={id} className="ml-0.5 font-mono">
          {id}
        </sup>
      ))}
    </>
  );
}

/** Any value: null shows as a gap, lists as comma-separated text. */
export function Value({ value }: { value: unknown }): ReactNode {
  if (value === null) return <Gap />;
  if (value === undefined) return <span className="opacity-50">—</span>;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length > 0 ? value.map(String).join(", ") : <span className="opacity-50">none</span>;
  if (typeof value === "object") return <Mono>{JSON.stringify(value)}</Mono>;
  return String(value);
}

export function List({ items }: { items: ReactNode[] }) {
  if (items.length === 0) return <span className="opacity-50">none</span>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
