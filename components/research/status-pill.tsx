/** A paper's status (DESIGN.md §7.5): "Accepted · Presented April 2026", or "Published". */
export function StatusPill({ status, label }: { status: "accepted-presented" | "published"; label: string }) {
  return (
    <p className="status-pill" data-status={status}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </p>
  );
}
