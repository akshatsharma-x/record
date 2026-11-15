"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

interface SwitchProps {
  label: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * An on/off switch (DESIGN.md §6.5). It's a real checkbox with role="switch", so Space,
 * screen readers and forms work natively; the track is drawn beside it. Off, the track's
 * hairline edge clears 3:1 against the surface; on, it fills with the accent. The thumb
 * travels on the snappy spring, and jumps with reduced motion.
 */
export function Switch({ label, checked, defaultChecked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <label className={cx("switch text-body", className)}>
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        className="switch-input sr-only"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
    </label>
  );
}
