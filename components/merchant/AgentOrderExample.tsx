import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { StatusPill } from "@/components/ui/StatusPill";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import { agentPriceCents, formatCents } from "@/lib/pricing";

const LATTE_CENTS = 500;
const DISCOUNT_PCT = 3;

function MessageThread() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-card bg-surface-sunken p-6">
      <p className="self-end rounded-card rounded-br-control bg-ink px-4 py-3 text-body text-surface">Get me an oat latte from Ladle &amp; Leaf, pickup under Boris</p>
      <div className="flex max-w-xs flex-col gap-1 self-start rounded-card rounded-bl-control bg-surface px-4 py-3 shadow-ring">
        <span className="text-caption font-semibold text-ink-muted">Instinct</span>
        <p className="text-body">Ordered and paid {formatCents(agentPriceCents(LATTE_CENTS, DISCOUNT_PCT))}. It&rsquo;ll be at the counter under Boris.</p>
      </div>
    </div>
  );
}

function PrintedTicket() {
  return (
    <Ticket tone="fresh" className="w-full max-w-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-title font-bold">Boris</h3>
          <StatusPill status="paid" />
        </div>
        <TicketLine label="1× Oat latte" value={formatCents(LATTE_CENTS)} />
        <TicketLine label={`Agent discount (${DISCOUNT_PCT}%)`} value={`−${formatCents(LATTE_CENTS - agentPriceCents(LATTE_CENTS, DISCOUNT_PCT))}`} />
        <TicketRule />
        <TicketLine label="Card fee" value={formatCents(0)} emphasis />
      </div>
    </Ticket>
  );
}

export function AgentOrderExample() {
  return (
    <section aria-labelledby="agent-order-heading" className="flex flex-col gap-10">
      <h2 id="agent-order-heading" className="text-display font-bold">
        What an agent order looks like
      </h2>
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <MessageThread />
        <ArrowRight size={40} weight="bold" aria-hidden className="shrink-0 rotate-90 text-accent-ink md:rotate-0" />
        <PrintedTicket />
      </div>
    </section>
  );
}
