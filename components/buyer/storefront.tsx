import Link from "next/link";
import type { MenuItem, ShopMenu } from "@/lib/contract";
import { money, quote } from "@/lib/money";
import { checkoutEnabled } from "@/lib/buyer/payment";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Ticket, TicketLine, TicketRule } from "@/components/ui/Ticket";
import type { Principal } from "@/lib/buyer/auth";

function MenuRow({ item, quantity }: { item: MenuItem; quantity: number }) {
  return (
    <article className="menu-item">
      <div>
        <h3>{item.name}</h3>
        <p className="muted">{item.description}</p>
        <div className="price-line">
          <strong>{money(item.agentPriceCents)}</strong>
          {item.agentPriceCents < item.priceCents && (
            <span className="muted">
              <s>{money(item.priceCents)}</s>
              <span className="sr-only"> regular price</span>
            </span>
          )}
        </div>
      </div>
      <div className="quantity">
        <Field
          label="Quantity"
          aria-label={`Quantity for ${item.name}`}
          name={`qty_${item.productId}`}
          type="number"
          min={0}
          max={20}
          step={1}
          defaultValue={quantity}
        />
      </div>
    </article>
  );
}
function OrderReceipt({
  menu,
  items,
  principal,
  requestId,
}: {
  menu: ShopMenu;
  items: { productId: string; qty: number }[];
  principal: Principal | null;
  requestId: string;
}) {
  const totals = items.length
    ? quote(menu, items)
    : { subtotalCents: 0, discountCents: 0, totalCents: 0 };
  const products = new Map(menu.items.map((item) => [item.productId, item]));
  const isAgent = principal?.kind === "agent";
  return (
    <aside className="receipt" aria-labelledby="order-heading">
      <Ticket tone="fresh">
        <h2 id="order-heading">Your pickup</h2>
        {items.length ? (
          <ul className="receipt-items">
            {items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.qty} × {products.get(item.productId)!.name}
                </span>
                <span>
                  {money(
                    products.get(item.productId)!.agentPriceCents * item.qty,
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Choose something from the menu to get started.
          </p>
        )}
        <TicketRule />
        <div className="stack gap-3">
          <TicketLine
            label="Regular price"
            value={money(totals.subtotalCents)}
          />
          <TicketLine
            label="Your savings"
            value={`−${money(totals.discountCents)}`}
          />
          <TicketLine emphasis label="Total" value={money(totals.totalCents)} />
        </div>
        <TicketRule />
        <form action="/api/buyer/orders" method="post" className="stack">
          <input type="hidden" name="shopSlug" value={menu.shop.slug} />
          <input type="hidden" name="items" value={JSON.stringify(items)} />
          <input
            type="hidden"
            name="expectedTotalCents"
            value={totals.totalCents}
          />
          <input type="hidden" name="idempotencyKey" value={requestId} />
          <Field
            label="Pickup name"
            name="pickupName"
            autoComplete="given-name"
            required
            maxLength={80}
            placeholder="What should we call out?"
          />
          {isAgent ? (
            <Button size="lg" className="w-full" disabled={!items.length}>
              Send {money(totals.totalCents)} order for approval
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={!checkoutEnabled || !principal || !items.length}
            >
              Pay {money(totals.totalCents)} from wallet
            </Button>
          )}
        </form>
        {!principal && (
          <p className="small">
            <Link
              href={`/login?next=${encodeURIComponent(`/s/${menu.shop.slug}`)}`}
            >
              Sign in
            </Link>{" "}
            to use your wallet.
          </p>
        )}
        <p className="small muted">
          {isAgent
            ? "The account owner approves every agent order before anything is charged."
            : "Wallet checkout is not available yet. No payment will be taken."}
        </p>
      </Ticket>
    </aside>
  );
}
export function Storefront({
  menu,
  quantities,
  principal,
  requestId,
  menuUrl,
}: {
  menu: ShopMenu;
  quantities: Record<string, number>;
  principal: Principal | null;
  requestId: string;
  menuUrl: string | null;
}) {
  const { shop } = menu;
  const items = menu.items
    .filter((p) => quantities[p.productId] > 0)
    .map((p) => ({ productId: p.productId, qty: quantities[p.productId] }));
  const affiliatedDemo = /ladle\s*(?:&|and)\s*leaf/i.test(shop.name);
  return (
    <div className="page storefront">
      <Link className="back-link" href="/shops">
        Back to shops
      </Link>
      <header className="shop-heading">
        <div>
          <h1>{shop.name}</h1>
          <p className="lead">Your usual, for a little less.</p>
        </div>
        <div className="shop-heading-meta">
          <span className="pill">{shop.agentDiscountPct}% agent savings</span>
          <span>Pickup orders</span>
        </div>
      </header>
      {affiliatedDemo && (
        <p className="notice">
          This demo storefront is not affiliated with Ladle &amp; Leaf. No real
          café order will be placed.
        </p>
      )}
      <div className="checkout-grid">
        <section aria-labelledby="menu-heading">
          <div className="section-heading">
            <h2 id="menu-heading">On the menu</h2>
            {menuUrl && (
              <a className="small" href={menuUrl}>
                JSON menu
              </a>
            )}
          </div>
          <form action={`/s/${shop.slug}`} method="get">
            <p className="muted small">
              Choose quantities, then update your order to review the total.
            </p>
            <div className="menu-list">
              {menu.items.map((p) => (
                <MenuRow
                  key={p.productId}
                  item={p}
                  quantity={quantities[p.productId] ?? 0}
                />
              ))}
            </div>
            {menu.items.length ? (
              <Button variant="quiet">Update order total</Button>
            ) : (
              <p className="notice">There are no available items right now.</p>
            )}
          </form>
          <Link className={`${buttonClasses("quiet")} mt-6`} href="/shops">
            Explore more shops
          </Link>
        </section>
        <OrderReceipt
          menu={menu}
          items={items}
          principal={principal}
          requestId={requestId}
        />
      </div>
    </div>
  );
}
