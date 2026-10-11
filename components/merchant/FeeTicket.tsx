"use client";

import { useId, useState } from "react";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import { rangeFill } from "@/components/ui/rangeFill";
import { cardFeeCents, formatCents } from "@/lib/pricing";

const MIN_CENTS = 200;
const MAX_CENTS = 2500;

export function FeeTicket() {
  const [priceCents, setPriceCents] = useState(500);
  const sliderId = useId();
  const stripeFee = cardFeeCents(priceCents, "stripeOnline");
  const share = ((stripeFee / priceCents) * 100).toFixed(1);

  return (
    <Ticket className="w-full max-w-sm animate-ticket-in">
      <div className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={sliderId} className="text-body font-semibold">
            One order of
          </label>
          <output htmlFor={sliderId} className="tabular font-display text-display font-bold">
            {formatCents(priceCents)}
          </output>
        </div>
        <input
          id={sliderId}
          type="range"
          min={MIN_CENTS}
          max={MAX_CENTS}
          step={25}
          value={priceCents}
          onChange={(event) => setPriceCents(Number(event.target.value))}
          style={rangeFill(priceCents, MIN_CENTS, MAX_CENTS)}
          className="range-accent w-full"
        />
        <div className="flex flex-col gap-2">
          <TicketLine label="Card fee (Stripe)" value={`−${formatCents(stripeFee)}`} />
          <TicketRule />
          <TicketLine label="With The Payments" value={formatCents(0)} emphasis />
        </div>
        <p className="rounded-control bg-accent-wash px-4 py-3 text-body-sm text-ink">
          A card takes <span className="tabular font-semibold">{share}%</span> of this order. An agent paying in AUSD costs the shop under a cent.
        </p>
      </div>
    </Ticket>
  );
}
