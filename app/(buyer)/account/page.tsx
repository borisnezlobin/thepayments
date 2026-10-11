import { connection } from "next/server";
import { buyerSummary } from "@/lib/payments/buyer";
import { formatCents } from "@/lib/pricing";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { AgentControls } from "@/components/buyer/agent-controls";
import { requireOwner } from "@/lib/buyer/auth";
import { agentLinkState } from "@/lib/buyer/agent-link-state";
import { pendingRequests } from "@/lib/buyer/approvals";
import { checkoutEnabled } from "@/lib/buyer/checkout";
import { ApprovalRequests } from "@/components/buyer/approval-requests";
export const instant = false;
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  const owner = await requireOwner();
  const params = await searchParams;
  const linkState = await agentLinkState(owner.buyerId);
  const summary = await buyerSummary(owner.buyerId).catch(() => null);
  const requests = await pendingRequests(owner.buyerId).catch(() => []);
  return (
    <div className="page account">
      <header className="page-heading">
        <div>
          <h1>Your corner.</h1>
          <p className="lead">{owner.email}</p>
        </div>
        <Link className={buttonClasses("quiet")} href="/shops">
          Find a shop
        </Link>
      </header>
      {params.error && (
        <p role="alert" className="notice error">
          {params.error}
        </p>
      )}
      {params.notice === "revoked" && (
        <p role="status" className="notice">
          Agent access revoked. The old link and its sessions no longer work.
        </p>
      )}
      {params.notice === "approved" && (
        <p role="status" className="notice">
          Order approved and paid.
        </p>
      )}
      {params.notice === "declined" && (
        <p role="status" className="notice">
          Order declined. Nothing was charged.
        </p>
      )}
      {requests.length > 0 && (
        <ApprovalRequests requests={requests} canPay={checkoutEnabled} />
      )}
      <section className="account-overview" aria-label="Wallet and savings">
        <div className="wallet-panel">
          <span>Wallet balance</span>
          <p className="font-display balance">
            {summary?.balanceCents == null
              ? "No wallet yet"
              : formatCents(summary.balanceCents)}
          </p>
          <p>A testnet wallet is created for your first checkout.</p>
        </div>
        <div className="saving-panel">
          <h2>Your savings</h2>
          <p className="font-display balance">
            {summary ? formatCents(summary.savingsCents) : "Unavailable"}
          </p>
          <p className="muted">Savings from your recent paid orders.</p>
        </div>
      </section>
      <section id="agent-link" className="account-section">
        <div>
          <h2>Let your agent order.</h2>
          <p>
            Send a private link to Instinct once. It can browse menus and ask to
            place orders without your password. You approve each order here
            before anything is charged.
          </p>
          <p className="muted small">
            The link grants ordering access only. It cannot manage your account,
            issue links, or withdraw funds. Links expire after one hour;
            creating a new one immediately invalidates the previous link.
          </p>
        </div>
        <AgentControls {...linkState} />
      </section>
      <section className="account-section">
        <div>
          <h2>Your orders</h2>
          <p className="muted">
            Pickup details and receipts, all in one place.
          </p>
        </div>
        <div className="empty-orders">
          {summary?.orders.length ? (
            <ul>
              {summary.orders.map((order) => (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`}>
                    Order {order.id.slice(0, 8)}
                  </Link>{" "}
                  — {formatCents(order.totalCents)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Your paid orders will appear here.</p>
          )}
        </div>
      </section>
    </div>
  );
}
