import { type CSSProperties, Fragment, useId } from "react";
import { cx } from "@/lib/cx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  /** The group's accessible name. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value?: T;
  defaultValue?: T;
  /** Called with the new value and the segment that was chosen (for effects that start there). */
  onValueChange?: (value: T, segment: HTMLElement) => void;
  name?: string;
  className?: string;
}

/**
 * A segmented control. It's a group of real radio inputs, so arrow keys, screen readers
 * and no-JavaScript all work natively. The thumb finds the checked segment with :has()
 * and slides on the snappy spring (styles/components.css). Up to six segments. Without
 * onValueChange it needs no script, so a Server Component can render it.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  className,
}: SegmentedControlProps<T>) {
  const generated = useId();
  const group = name ?? generated;
  const controlled = value !== undefined;

  return (
    <fieldset
      className={cx("segmented", className)}
      style={{ "--count": options.length } as CSSProperties}
    >
      <legend className="sr-only">{label}</legend>
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((option) => (
        <Fragment key={option.value}>
          <label>
            <input
              type="radio"
              className="sr-only"
              name={group}
              value={option.value}
              disabled={option.disabled}
              {...(controlled
                ? { checked: value === option.value }
                : { defaultChecked: defaultValue === option.value })}
              onChange={
                onValueChange
                  ? (event) => {
                      const segment = event.currentTarget.parentElement;
                      if (segment) onValueChange(option.value, segment);
                    }
                  : undefined
              }
            />
            {option.label}
          </label>{" "}
        </Fragment>
      ))}
    </fieldset>
  );
}
