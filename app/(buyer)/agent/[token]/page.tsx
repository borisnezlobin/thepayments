import { LogoMark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { browserCheckoutEnabled } from "@/lib/payments/buyer";
import { resolveAgent } from "@/lib/buyer/auth";
import { connectAgent } from "@/app/actions";
import { StatusPanel } from "@/components/buyer/status-panel";
export const metadata = {
  title: "Connect your agent",
  robots: { index: false, follow: false },
};
export default async function AgentLink({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const grant = await resolveAgent(token);
  if (!grant)
    return (
      <div className="page narrow">
        <StatusPanel
          title="This agent link is unavailable"
          href="/login"
          action="Sign in as the account owner"
        >
          <p>
            It may have expired or been revoked. Ask the account owner for a new
            link.
          </p>
        </StatusPanel>
      </div>
    );
  return (
    <div className="page narrow">
      <section className="connect-panel">
        <span className="round-mark small-mark" aria-hidden="true">
          <LogoMark className="size-10" />
        </span>
        <h1>Ready when you are.</h1>
        <p className="lead">Connect to place pickup orders for this buyer.</p>
        <ul className="permission-list">
          <li>Browse shops and menus</li>
          <li>Place orders from the buyer’s funded wallet</li>
          <li>No account settings or withdrawals</li>
        </ul>
        <p className="muted">
          {browserCheckoutEnabled()
            ? "This browser can pay for orders from the buyer’s funded wallet, up to the per-order spending limit."
            : "This browser can browse menus. Wallet checkout is not enabled yet."}
        </p>
        <form action={connectAgent}>
          <input type="hidden" name="token" value={token} />
          <Button>Connect for ordering</Button>
        </form>
      </section>
    </div>
  );
}
