import type { HTMLAttributes, ReactNode } from "react";

export interface TicketProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: "plain" | "fresh";
}

export function Ticket({ children, tone = "plain", className = "", ...rest }: TicketProps) {
  const toneClass = tone === "fresh" ? "bg-accent-wash" : "bg-surface";
  return (
    <div className={`drop-shadow-[0_10px_18px_rgb(11_31_28/0.12)] ${className}`} {...rest}>
      <div className={`ticket-edge px-6 py-7 ${toneClass}`}>{children}</div>
    </div>
  );
}

export function TicketLine({ label, value, emphasis = false }: { label: ReactNode; value: ReactNode; emphasis?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${emphasis ? "text-body font-semibold text-ink" : "text-body-sm text-ink-muted"}`}>
      <span>{label}</span>
      <span className="tabular text-ink">{value}</span>
    </div>
  );
}

export function TicketRule() {
  return <hr className="my-3 border-0 border-t border-dashed border-line" />;
}
