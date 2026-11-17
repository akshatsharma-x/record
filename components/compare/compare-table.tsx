"use client";

import { ChevronDown } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";

export interface CompareRow {
  id: string;
  label: string;
  /** Rows of names that can also be counted show the count first, as a compare page does. */
  counted: boolean;
  cells: Record<number, string[]>;
}

const vars = (values: Record<string, number | string>) => values as CSSProperties;

/**
 * The compare table (DESIGN.md §8): a column per year, each with a picker, as Apple's
 * compare pages have. Phones show the latest two years, tablets three, wider screens all
 * of them; a picker swaps the year in its column. Without JavaScript the pickers rest and
 * the latest years show.
 */
export function CompareTable({ years, rows, words }: { years: number[]; rows: CompareRow[]; words: { picker: string; none: string } }) {
  const hydrated = useHydrated();
  const [slots, setSlots] = useState(() => years.slice(-4));
  return (
    <div className="compare" role="table" aria-label={rows.map((row) => row.label).join(", ")} style={vars({ "--slots": slots.length })}>
      <div className="compare-head" role="row">
        {/* The corner, over the rows' names: empty, so each year heads its own column. */}
        <div className="sr-only" role="cell" />
        {slots.map((year, slot) => (
          <div key={slot} className="compare-slot compare-pick" role="columnheader" data-slot={slot}>
            {/* The year is its own picker, as Apple's model names are. */}
            <label className="compare-picker" data-ready={hydrated || undefined}>
              <span className="sr-only">{`${words.picker} ${slot + 1}`}</span>
              <select
                value={year}
                disabled={!hydrated}
                onChange={(event) => setSlots((current) => current.map((value, i) => (i === slot ? Number(event.target.value) : value)))}
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="compare-chevron" />
            </label>
          </div>
        ))}
      </div>
      {rows.map((row) => (
        // One row: its name above, set across every column, then a cell per year.
        <div key={row.id} className="compare-row" role="row">
          <span className="compare-label" role="rowheader">
            {row.label}
          </span>
          {slots.map((year, slot) => {
            const items = row.cells[year] ?? [];
            return (
              <div key={slot} className="compare-slot compare-cell" role="cell" data-slot={slot}>
                {items.length === 0 ? (
                  <span className="compare-none">{words.none}</span>
                ) : (
                  <>
                    {row.counted ? <span className="compare-count">{items.length}</span> : null}
                    <ul className="compare-items">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
