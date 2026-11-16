import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Buttons (DESIGN.md §2 rule 10, §6.5): a primary pill, a secondary pill and a text link
 * with a ›. Every state is designed: hover, focus-visible (the §6.4 ring), pressed (.97 on
 * the snappy spring), disabled, loading, success and error. A Button with `href` renders
 * a link. Server-safe: no hooks.
 */

export type ButtonVariant = "primary" | "secondary" | "link";
export type ButtonStatus = "idle" | "loading" | "success" | "error";

interface Shared {
  variant?: ButtonVariant;
  status?: ButtonStatus;
  children: ReactNode;
  className?: string;
  /** Kitchen only: shows "hover", "pressed" or "focus" without interaction. */
  force?: string;
}

type AsButton = Shared & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined };
type AsLink = Shared &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & { href: string; disabled?: boolean };

const pill = "min-h-target rounded-pill px-6 pressable";
const variants: Record<ButtonVariant, string> = {
  primary: `${pill} bg-accent-fill text-on-accent hover-state:bg-accent-fill-hover`,
  secondary: `${pill} button-secondary border border-accent text-accent`,
  link: "button-link min-h-target rounded-chip text-accent underline-offset-(--underline-offset) hover-state:underline",
};

function classes(variant: ButtonVariant, inert: boolean, className?: string) {
  return cx(
    "inline-flex select-none items-center justify-center gap-2 text-body font-semibold",
    variants[variant],
    inert && "cursor-not-allowed opacity-40",
    className,
  );
}

function Label({ variant, status, children }: { variant: ButtonVariant; status: ButtonStatus; children: ReactNode }) {
  return (
    <>
      {status === "loading" ? <LoaderCircle aria-hidden="true" className="animate-spin reduced-motion:animate-none" /> : null}
      {status === "success" ? <Check aria-hidden="true" /> : null}
      {status === "error" ? <CircleAlert aria-hidden="true" /> : null}
      <span>{children}</span>
      {variant === "link" ? (
        <span aria-hidden="true" className="button-chevron">
          ›
        </span>
      ) : null}
    </>
  );
}

export function Button(props: AsButton | AsLink) {
  if (props.href !== undefined) {
    const { variant = "primary", status = "idle", children, className, force, href, disabled, onClick, ...anchor } = props;
    const inert = Boolean(disabled) || status === "loading";
    const label = (
      <Label variant={variant} status={status}>
        {children}
      </Label>
    );
    // A disabled or loading link has no href, so it can't navigate and needs no handler.
    // That keeps Button usable from Server Components, which can't pass functions on.
    if (inert) {
      return (
        <a
          aria-disabled="true"
          aria-busy={status === "loading" || undefined}
          role="link"
          tabIndex={disabled ? -1 : 0}
          data-force={force}
          data-status={status}
          className={classes(variant, Boolean(disabled), className)}
          {...anchor}
        >
          {label}
        </a>
      );
    }
    return (
      <Link
        href={href}
        data-force={force}
        data-status={status}
        className={classes(variant, false, className)}
        onClick={onClick}
        {...anchor}
      >
        {label}
      </Link>
    );
  }

  const { variant = "primary", status = "idle", children, className, force, disabled, type = "button", onClick, ...button } = props;
  // Loading keeps the button focusable (aria-disabled), so focus isn't lost mid-request.
  const busy = status === "loading";
  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      data-force={force}
      data-status={status}
      className={classes(variant, Boolean(disabled) || busy, className)}
      // A handler only when there's something to do, so a Server Component can render one
      // that a client controller wires up.
      onClick={
        busy || onClick
          ? (event) => {
              if (busy) event.preventDefault();
              else onClick?.(event);
            }
          : undefined
      }
      {...button}
    >
      <Label variant={variant} status={status}>
        {children}
      </Label>
    </button>
  );
}
