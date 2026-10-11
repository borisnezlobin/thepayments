"use client";

import { ArrowSquareOut, Bank, CircleNotch } from "@phosphor-icons/react";
import type { Withdrawal } from "@/lib/contract";
import type { InboxResponse, SalesSummary } from "@/lib/shops/summary";
import { SUMMARY_WINDOW_DAYS } from "@/lib/shops/summary";
import { Button } from "@/components/ui/Button";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import { formatCents } from "@/lib/pricing";

const WITHDRAWAL_STATUS: Record<Withdrawal["status"], string> = {
  pending: "On its way",
  sent: "Sent",
  failed: "Failed, money returned to your balance",
};

function SalesReceipt({ summary }: { summary: SalesSummary }) {
  return (
    <Ticket>
      <section aria-labelledby="receipt-heading" className="flex flex-col gap-3">
        <h2 id="receipt-heading" className="text-body font-bold">
          Last {SUMMARY_WINDOW_DAYS} days
        </h2>
        <TicketLine label="Agent orders" value={summary.orderCount} />
        <TicketLine label="Received" value={formatCents(summary.receivedCents)} />
        <TicketRule />
        <TicketLine label="Card fees you didn't pay" value={`+${formatCents(summary.cardFeesAvoidedCents)}`} />
        <TicketLine label="Discounts you gave agents" value={`−${formatCents(summary.discountsGivenCents)}`} />
        <TicketRule />
        <TicketLine
          label="Kept versus taking cards"
          value={`${summary.keptCents >= 0 ? "+" : "−"}${formatCents(Math.abs(summary.keptCents))}`}
          emphasis
        />
        <p className="text-caption text-ink-muted">Card fees use Stripe&rsquo;s online rate of 2.9% plus 30¢ per order.</p>
      </section>
    </Ticket>
  );
}

function WithdrawPanel({ balanceCents, withdrawals, busy, onWithdraw }: { balanceCents: number; withdrawals: Withdrawal[]; busy: boolean; onWithdraw: () => void }) {
  return (
    <section aria-labelledby="balance-heading" className="flex flex-col gap-4 rounded-card bg-ink p-6 text-surface">
      <h2 id="balance-heading" className="text-body-sm font-semibold text-surface/75">
        Ready to withdraw
      </h2>
      <p className="tabular font-display text-display font-extrabold">{formatCents(balanceCents)}</p>
      <Button
        size="lg"
        onClick={onWithdraw}
        disabled={busy || balanceCents <= 0}
        icon={busy ? <CircleNotch size={20} weight="bold" className="animate-spin" aria-hidden /> : <Bank size={20} weight="bold" aria-hidden />}
      >
        Withdraw to my bank
      </Button>
      {withdrawals.length > 0 ? (
        <ul className="flex flex-col gap-2 border-t border-surface/15 pt-4">
          {withdrawals.slice(0, 4).map((withdrawal) => (
            <li key={withdrawal.id} className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="tabular font-semibold">{formatCents(withdrawal.amountCents)}</span>
              <span className="flex items-center gap-1.5 text-surface/75">
                {WITHDRAWAL_STATUS[withdrawal.status]}
                {withdrawal.txHash ? (
                  <a href={`https://sepolia.basescan.org/tx/${withdrawal.txHash}`} target="_blank" rel="noreferrer" aria-label="See the withdrawal transfer" className="text-surface">
                    <ArrowSquareOut size={14} weight="bold" aria-hidden />
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-caption text-surface/75">In this demo the transfer to an off-ramp is real on Base Sepolia. The bank deposit after it is simulated.</p>
    </section>
  );
}

export function MoneyPanel({ data, withdrawing, onWithdraw }: { data: InboxResponse; withdrawing: boolean; onWithdraw: () => void }) {
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
      <WithdrawPanel balanceCents={data.balanceCents} withdrawals={data.withdrawals} busy={withdrawing} onWithdraw={onWithdraw} />
      <SalesReceipt summary={data.summary} />
    </aside>
  );
}
