"use client";

import { Fragment, useId } from "react";
import { cx } from "@/lib/cx";
import { type Finish, FINISHES } from "@/lib/preferences";
import { usePreferences } from "@/lib/stores/preferences";

interface FinishSwatchesProps {
  /** Called after the finish changes, e.g. to fire an Island activity (Part 4). */
  onChange?: (finish: Finish) => void;
  /** The new finish spreads from the chosen swatch in a liquid wipe (the hero, Part 5). */
  wipe?: boolean;
  /** Hide the names and keep them for screen readers only. */
  compact?: boolean;
  className?: string;
}

/**
 * The finish picker (DESIGN.md §4.3), like a product's color options. Each swatch is
 * drawn by its own data-finish, so it shows that accent in the current tone. A radio
 * group: arrow keys move between finishes. Part 5 and Search reuse it.
 */
export function FinishSwatches({
  onChange,
  wipe,
  compact,
  className,
}: FinishSwatchesProps) {
  const name = useId();
  const finish = usePreferences((state) => state.finish);
  const setFinish = usePreferences((state) => state.setFinish);

  return (
    <fieldset
      className={cx("flex flex-wrap items-center gap-x-4 gap-y-2", className)}
    >
      <legend className="sr-only">Finish</legend>
      {FINISHES.map((option) => (
        <Fragment key={option.id}>
          <label className="inline-flex min-h-target cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={finish === option.id}
              onChange={(event) => {
                const swatch =
                  event.currentTarget.nextElementSibling?.getBoundingClientRect();
                const origin =
                  wipe && swatch
                    ? {
                        x: swatch.left + swatch.width / 2,
                        y: swatch.top + swatch.height / 2,
                      }
                    : undefined;
                void setFinish(option.id, origin);
                onChange?.(option.id);
              }}
              className="peer sr-only"
            />
            <span
              data-finish={option.id}
              aria-hidden="true"
              className="swatch"
            />
            <span
              className={cx(
                "text-caption font-semibold text-fg",
                compact && "sr-only",
              )}
            >
              {option.name}
            </span>
          </label>{" "}
        </Fragment>
      ))}
    </fieldset>
  );
}
