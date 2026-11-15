"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { durations } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { Body, Title } from "./type";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * A modal sheet in the browser's top layer (DESIGN.md §4.9): a bottom sheet on phones,
 * a centered card from 735px up. The native <dialog> traps focus, closes on Esc and
 * returns focus to whatever opened it. Clicking the backdrop closes it too. It springs in
 * (styles/components.css) and fades out; with reduced motion it only fades.
 */
export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.removeAttribute("data-closing");
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) {
      const finish = () => {
        dialog.removeAttribute("data-closing");
        dialog.close();
      };
      if (prefersReducedMotion()) {
        finish();
        return;
      }
      dialog.setAttribute("data-closing", "");
      const timer = window.setTimeout(finish, durations.ui);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <Title as="h2" id={titleId}>
            {title}
          </Title>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="pressable -mr-2 -mt-2 inline-flex min-h-target min-w-target items-center justify-center rounded-pill bg-control-track text-fg"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        {description ? (
          <Body id={descriptionId} tone="fg-2">
            {description}
          </Body>
        ) : null}
        {children}
      </div>
    </dialog>
  );
}
