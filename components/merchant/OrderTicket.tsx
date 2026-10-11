"use client";

import { ArrowSquareOut, CircleNotch } from "@phosphor-icons/react";
import type { Order } from "@/lib/contract";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Ticket } from "@/components/ui/Ticket";
import { formatCents } from "@/lib/pricing";
import { explorerLink, timeAgo } from "./orderFormat";

const ACTION_LABEL: Partial<Record<Order["status"], string>> = { paid: "Mark ready", ready: "Picked up" };

export function OrderTicket({ order, fresh, busy, now, onAdvance }: { order: Order; fresh: boolean; busy: boolean; now: number; onAdvance: () => void }) {
  const action = ACTION_LABEL[order.status];
  const done = order.status === "picked_up";
  return (
    <li className={fresh ? "animate-ticket-in" : ""}>
      <Ticket tone={order.status === "paid" ? "fresh" : "plain"} className={done ? "opacity-60" : ""}>
        <article aria-label={`Order for ${order.pickupName}`} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col">
              <h3 className="text-title font-bold">{order.pickupName}</h3>
              <p className="text-caption text-ink-muted">
                <time dateTime={order.paidAt ?? order.createdAt}>{timeAgo(order.paidAt ?? order.createdAt, now)}</time>
              </p>
            </div>
            <StatusPill status={order.status} />
          </div>
          <ul className="flex flex-col gap-1.5">
            {order.items.map((item) => (
              <li key={`${item.productId}-${item.name}`} className="flex items-baseline justify-between gap-4 text-body">
                <span>
                  <span className="tabular font-semibold">{item.qty}×</span> {item.name}
                </span>
                <span className="tabular text-ink-muted">{formatCents(item.qty * item.unitPriceCents)}</span>
              </li>
            ))}
          </ul>
          <hr className="border-0 border-t border-dashed border-line" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-ink-muted">
              Paid <span className="tabular font-semibold text-ink">{formatCents(order.totalCents)}</span> in AUSD
              {order.txHash ? (
                <>
                  {" "}
                  <a href={explorerLink(order)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent-ink underline decoration-from-font underline-offset-2">
                    See transfer
                    <ArrowSquareOut size={14} weight="bold" aria-hidden />
                  </a>
                </>
              ) : null}
            </p>
            {action ? (
              <Button variant={order.status === "paid" ? "secondary" : "quiet"} onClick={onAdvance} disabled={busy} icon={busy ? <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden /> : null}>
                {action}
              </Button>
            ) : null}
          </div>
        </article>
      </Ticket>
    </li>
  );
}
