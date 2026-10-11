"use client";

import Link from "next/link";
import type { ShopMenu } from "@/lib/contract";
import type { Principal } from "@/lib/buyer/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import { formatCents } from "@/lib/pricing";
import type { OrderLine, OrderTotals } from "./storefrontMenu";

interface SummaryProps {
  menu: ShopMenu;
  lines: OrderLine[];
  totals: OrderTotals;
  principal: Principal | null;
  checkoutEnabled: boolean;
  requestId: string;
}

function OrderLines({ menu, lines }: { menu: ShopMenu; lines: OrderLine[] }) {
  const products = new Map(menu.items.map((item) => [item.productId, item]));
  if (lines.length === 0) return <p className="text-body-sm text-ink-muted">Nothing yet. Tap + next to anything on the menu.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {lines.map((line) => {
        const product = products.get(line.productId);
        if (!product) return null;
        return (
          <li key={line.productId} className="flex items-baseline justify-between gap-3 text-body-sm">
            <span>
              {line.qty} × {product.name}
            </span>
            <span className="tabular">{formatCents(product.agentPriceCents * line.qty)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function payLabel(principal: Principal | null, totalCents: number) {
  return principal?.kind === "agent" ? `Send ${formatCents(totalCents)} order for approval` : `Pay ${formatCents(totalCents)} from wallet`;
}

// An agent only asks for approval, so it can send a request even before wallet checkout is on.
function payDisabled({ principal, checkoutEnabled, lines }: Pick<SummaryProps, "principal" | "checkoutEnabled" | "lines">) {
  if (lines.length === 0 || !principal) return true;
  return principal.kind !== "agent" && !checkoutEnabled;
}

function CheckoutNote({ principal, checkoutEnabled, slug }: { principal: Principal | null; checkoutEnabled: boolean; slug: string }) {
  if (!principal) {
    return (
      <p className="text-body-sm text-ink-muted">
        <Link href={`/login?next=${encodeURIComponent(`/s/${slug}`)}`} className="font-semibold text-accent-ink">
          Sign in
        </Link>{" "}
        to pay from your wallet.
      </p>
    );
  }
  if (principal.kind === "agent") return <p className="text-body-sm text-ink-muted">The account owner approves every agent order before anything is charged.</p>;
  if (!checkoutEnabled) return <p className="text-body-sm text-ink-muted">Wallet checkout is not available yet. No payment will be taken.</p>;
  return null;
}

export function OrderSummary(props: SummaryProps) {
  const { menu, lines, totals, principal, checkoutEnabled, requestId } = props;
  return (
    <aside id="your-order" aria-labelledby="order-heading" className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
      <Ticket>
        <div className="flex flex-col gap-4">
          <h2 id="order-heading" className="text-title font-bold">
            Your pickup
          </h2>
          <OrderLines menu={menu} lines={lines} />
          <TicketRule />
          <div className="flex flex-col gap-2">
            <TicketLine label="Menu price" value={formatCents(totals.subtotalCents)} />
            <TicketLine label="Agent discount" value={`−${formatCents(totals.discountCents)}`} />
            <TicketLine label="Total" value={formatCents(totals.totalCents)} emphasis />
          </div>
          <form action="/api/buyer/orders" method="post" className="flex flex-col gap-3">
            <input type="hidden" name="shopSlug" value={menu.shop.slug} />
            <input type="hidden" name="items" value={JSON.stringify(lines)} />
            <input type="hidden" name="expectedTotalCents" value={totals.totalCents} />
            <input type="hidden" name="idempotencyKey" value={requestId} />
            <Field label="Pickup name" name="pickupName" autoComplete="given-name" required maxLength={80} placeholder="The name the café calls out" />
            <Button size="lg" className="w-full" disabled={payDisabled(props)}>
              {payLabel(principal, totals.totalCents)}
            </Button>
          </form>
          <CheckoutNote principal={principal} checkoutEnabled={checkoutEnabled} slug={menu.shop.slug} />
        </div>
      </Ticket>
    </aside>
  );
}
