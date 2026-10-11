"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { ShopMenu } from "@/lib/contract";
import type { Principal } from "@/lib/buyer/auth";
import { Button } from "@/components/ui/Button";
import { formatCents } from "@/lib/pricing";
import { OrderSummary } from "./OrderSummary";
import { StorefrontMenuList } from "./StorefrontMenuList";
import { groupMenu, orderLines, orderTotals } from "./storefrontMenu";

function CategoryLinks({ categories }: { categories: { name: string; anchor: string }[] }) {
  if (categories.length < 2) return null;
  return (
    <nav aria-label="Menu sections" className="sticky top-0 z-10 -mx-6 block w-full overflow-x-auto bg-surface/95 px-6 py-3 backdrop-blur sm:w-full sm:justify-start">
      <ul className="flex justify-start gap-2">
        {categories.map((category) => (
          <li key={category.anchor}>
            <a href={`#${category.anchor}`} className="inline-flex h-9 items-center rounded-pill bg-surface-sunken px-4 text-body-sm font-semibold whitespace-nowrap text-ink no-underline hover:bg-line">
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileOrderBar({ count, totalCents }: { count: number; totalCents: number }) {
  if (count === 0) return null;
  return (
    <a
      href="#your-order"
      className="fixed inset-x-4 bottom-4 z-20 flex h-14 items-center justify-between rounded-card bg-ink px-5 text-body font-semibold text-surface no-underline shadow-raised lg:hidden"
    >
      <span>
        Review your order <span className="font-normal text-surface/75">({count} {count === 1 ? "item" : "items"})</span>
      </span>
      <span className="tabular">{formatCents(totalCents)}</span>
    </a>
  );
}

const subscribeToNothing = () => () => undefined;

export function StorefrontOrder({
  menu,
  initialQuantities,
  principal,
  checkoutEnabled,
  requestId,
}: {
  menu: ShopMenu;
  initialQuantities: Record<string, number>;
  principal: Principal | null;
  checkoutEnabled: boolean;
  requestId: string;
}) {
  const [quantities, setQuantities] = useState(initialQuantities);
  const interactive = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const categories = useMemo(() => groupMenu(menu.items), [menu.items]);
  const lines = orderLines(menu, quantities);
  const totals = orderTotals(menu, lines);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);

  const state = {
    quantities,
    interactive,
    setQuantity: (productId: string, quantity: number) => setQuantities((current) => ({ ...current, [productId]: quantity })),
  };

  return (
    <div className="grid gap-10 pb-24 lg:layout-sidebar lg:pb-0">
      <form action={`/s/${menu.shop.slug}`} method="get" className="flex min-w-0 flex-col gap-6">
        <CategoryLinks categories={categories} />
        <StorefrontMenuList categories={categories} state={state} />
        {menu.items.length ? (
          <Button variant="quiet" className="self-start">
            Update order total
          </Button>
        ) : (
          <p className="text-body text-ink-muted">This shop has nothing available right now.</p>
        )}
      </form>
      <OrderSummary menu={menu} lines={lines} totals={totals} principal={principal} checkoutEnabled={checkoutEnabled} requestId={requestId} />
      <MobileOrderBar count={count} totalCents={totals.totalCents} />
    </div>
  );
}
