import { connection } from "next/server";
import Link from "next/link";
import { buyerSummary } from "@/lib/payments/buyer";
import { formatCents } from "@/lib/pricing";
import { buttonClasses } from "@/components/ui/Button";
import { AgentControls } from "@/components/buyer/agent-controls";
import { AccountOrders } from "@/components/buyer/AccountOrders";
import { ApprovalRequests } from "@/components/buyer/approval-requests";
import { requireOwner } from "@/lib/buyer/auth";
import { agentLinkState } from "@/lib/buyer/agent-link-state";
import { pendingRequests } from "@/lib/buyer/approvals";
import { checkoutEnabled } from "@/lib/buyer/checkout";

export const instant = false;
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  revoked: "Instinct is disconnected. Its session and any unused token no longer work.",
  approved: "Order approved and paid.",
  declined: "Order declined. Nothing was charged.",
};

function browserCapCents() {
  const cap = Number(process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS ?? "2500");
  return Number.isInteger(cap) && cap > 0 ? cap : 2500;
}

function Notice({ error, notice }: { error?: string; notice?: string }) {
  if (error)
    return (
      <p role="alert" className="rounded-control bg-surface-sunken px-4 py-3 text-body-sm font-semibold text-danger">
        {error}
      </p>
    );
  const message = notice ? NOTICES[notice] : undefined;
  if (!message) return null;
  return (
    <p role="status" className="rounded-control bg-accent-wash px-4 py-3 text-body-sm text-ink">
      {message}
    </p>
  );
}

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const owner = await requireOwner();
  const params = await searchParams;
  const linkState = await agentLinkState(owner.buyerId);
  const summary = await buyerSummary(owner.buyerId).catch(() => null);
  const requests = await pendingRequests(owner.buyerId).catch(() => []);
  const balanceCents = summary?.balanceCents ?? null;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1>Your account</h1>
          <p className="text-body text-ink-muted">{owner.email}</p>
        </div>
        <Link className={buttonClasses("quiet")} href="/shops">
          Find a shop
        </Link>
      </header>
      <Notice error={params.error} notice={params.notice} />
      {requests.length > 0 ? <ApprovalRequests requests={requests} canPay={checkoutEnabled} /> : null}
      <section aria-label="Wallet" className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-card bg-ink p-6 text-surface">
          <p className="text-body-sm text-surface/75">Wallet balance</p>
          <p className="tabular font-display text-display font-bold">{balanceCents === null ? "No wallet yet" : formatCents(balanceCents)}</p>
          <p className="text-body-sm text-surface/75">
            {balanceCents === null ? "Your wallet is created the first time you pay in the browser." : "Test AUSD on Base Sepolia. Orders you approve are paid from this."}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-card bg-surface-sunken p-6">
          <p className="text-body-sm text-ink-muted">Saved with agent discounts</p>
          <p className="tabular font-display text-display font-bold">{summary ? formatCents(summary.savingsCents) : "Unavailable"}</p>
          <p className="text-body-sm text-ink-muted">{summary?.orders.length ? `Across your last ${summary.orders.length} paid orders.` : "Your savings show up after your first order."}</p>
        </div>
      </section>
      <AgentControls {...linkState} capCents={browserCapCents()} />
      <AccountOrders orders={summary?.orders ?? []} />
    </div>
  );
}
