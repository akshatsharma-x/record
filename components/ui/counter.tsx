"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { durations, gsapEase } from "@/lib/motion";
import { useHydrated } from "@/lib/use-hydrated";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * The formatter for the digits while they count: as many decimals as the final value has,
 * so 4 counts 0, 1, 2, 3, 4 and never passes through 3.999 (Intl's default is up to three).
 */
export function countingFormatter(value: number, format?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const digits = new Intl.NumberFormat("en-US", format).formatToParts(value).find((part) => part.type === "fraction")?.value.length ?? 0;
  return new Intl.NumberFormat("en-US", { ...format, minimumFractionDigits: digits, maximumFractionDigits: digits });
}

interface CounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Intl.NumberFormat options, e.g. { minimumFractionDigits: 2 }. */
  format?: Intl.NumberFormatOptions;
  className?: string;
}

/**
 * A number that counts up once, the first time it scrolls into view, in at most 1.2s
 * (`durations.count`). The final value is in the HTML from the start: it reserves the width,
 * so counting never shifts the layout, and it's what screen readers and no-JavaScript
 * visitors get. The animated digits are tabular and hidden from assistive technology.
 * With reduced motion, it simply shows the final value.
 */
export function Counter({ value, prefix = "", suffix = "", format, className }: CounterProps) {
  const formatter = useMemo(() => new Intl.NumberFormat("en-US", format), [format]);
  const step = useMemo(() => countingFormatter(value, format), [format, value]);
  const final = `${prefix}${formatter.format(value)}${suffix}`;
  const ref = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const observable = hydrated && typeof IntersectionObserver !== "undefined";
  /** The animated text while counting; null before and after. */
  const [counting, setCounting] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced || !observable) return;
    const ease = gsapEase("out");
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / durations.count);
          if (progress < 1) {
            setCounting(`${prefix}${step.format(value * ease(progress))}${suffix}`);
            frame = requestAnimationFrame(tick);
          } else {
            setCounting(null);
            setDone(true);
          }
        };
        setCounting(`${prefix}${step.format(0)}${suffix}`);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [step, observable, prefix, reduced, suffix, value]);

  const ready = reduced || !observable || done || counting !== null;

  return (
    <span ref={ref} className={cx("counter", className)}>
      <span className="counter-final">{final}</span>
      <span className="counter-display" aria-hidden="true" data-armed={hydrated || undefined} data-ready={ready || undefined}>
        {counting ?? final}
      </span>
    </span>
  );
}
