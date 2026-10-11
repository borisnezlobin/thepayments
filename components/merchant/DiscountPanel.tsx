"use client";

import { useId } from "react";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import { rangeFill } from "@/components/ui/rangeFill";
import { agentPriceCents, cardFeeCents, formatCents } from "@/lib/pricing";

const EXAMPLE_ORDER_CENTS = 500;
const MAX_DISCOUNT_PCT = 10;

export function DiscountPanel({ discountPct, onChange }: { discountPct: number; onChange: (pct: number) => void }) {
  const sliderId = useId();
  const agentPays = agentPriceCents(EXAMPLE_ORDER_CENTS, discountPct);
  const discount = EXAMPLE_ORDER_CENTS - agentPays;
  const cardFee = cardFeeCents(EXAMPLE_ORDER_CENTS, "stripeOnline");
  const kept = cardFee - discount;

  return (
    <Ticket>
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={sliderId} className="text-body font-semibold">
            Discount for agent orders
          </label>
          <output htmlFor={sliderId} className="tabular font-display text-title font-bold">
            {discountPct}%
          </output>
        </div>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={MAX_DISCOUNT_PCT}
          step={1}
          value={discountPct}
          onChange={(event) => onChange(Number(event.target.value))}
          style={rangeFill(discountPct, 0, MAX_DISCOUNT_PCT)}
          className="range-accent w-full"
        />
        <div className="flex flex-col gap-2">
          <TicketLine label={`A ${formatCents(EXAMPLE_ORDER_CENTS)} order costs the agent`} value={formatCents(agentPays)} />
          <TicketLine label="Card fee you skip" value={`+${formatCents(cardFee)}`} />
          <TicketLine label="Discount you give" value={`−${formatCents(discount)}`} />
          <TicketRule />
          <TicketLine label="Versus a card payment, you keep" value={`${kept >= 0 ? "+" : "−"}${formatCents(Math.abs(kept))}`} emphasis />
        </div>
        <p className={`text-body-sm ${kept < 0 ? "font-semibold text-danger" : "text-ink-muted"}`}>
          {kept < 0
            ? "At this discount you'd make less than with a card. Try a smaller one."
            : "A discount gives assistants a reason to pick your shop. Below the card fee, you still come out ahead."}
        </p>
      </div>
    </Ticket>
  );
}
