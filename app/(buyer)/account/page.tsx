import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { AgentControls } from "@/components/buyer/agent-controls";
import { requireOwner } from "@/lib/buyer/auth";
import { agentLinkState } from "@/lib/buyer/agent-link-state";
import { pendingRequests } from "@/lib/buyer/approvals";
import { checkoutEnabled } from "@/lib/buyer/checkout";
import { ApprovalRequests } from "@/components/buyer/approval-requests";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const owner = await requireOwner();
  const params = await searchParams;
  const linkState = await agentLinkState(owner.buyerId);
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
          <p className="font-display balance">Not connected</p>
          <p>
            Wallet creation and funding will become available when checkout
            opens.
          </p>
        </div>
        <div className="saving-panel">
          <h2>Your savings</h2>
          <p className="font-display balance">—</p>
          <p className="muted">
            Your savings will appear after your first paid order.
          </p>
        </div>
      </section>
      <section id="agent-link" className="account-section">
        <div>
          <h2>Let your agent order.</h2>
          <p>
            Send a private link to Instinct once. It can browse menus and ask
            to place orders without your password. You approve each order here
            before anything is charged.
          </p>
          <p className="muted small">
            The link grants ordering access only. It cannot manage your account,
            issue links, or withdraw funds. Links expire after 30 days; creating
            a new one immediately invalidates the previous link.
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
          <p>Order history isn’t connected yet.</p>
          <p className="small muted">
            Your paid orders will appear here when wallet checkout becomes
            available.
          </p>
        </div>
      </section>
    </div>
  );
}
