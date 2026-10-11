import Link from "next/link";
import type { Order } from "@/lib/contract";
import { formatCents } from "@/lib/pricing";

function itemSummary(order: Order) {
  return order.items.map((item) => `${item.qty}× ${item.name}`).join(", ");
}

function orderDate(order: Order) {
  return new Date(order.paidAt ?? order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AccountOrders({ orders }: { orders: Order[] }) {
  return (
    <section aria-labelledby="orders-heading" className="flex flex-col gap-4">
      <h2 id="orders-heading">Your orders</h2>
      {orders.length === 0 ? (
        <p className="text-body text-ink-muted">Nothing yet. Orders you or Instinct pay for show up here with their receipts.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="flex items-center justify-between gap-4 py-4 text-ink no-underline hover:bg-surface-sunken">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body font-semibold">{itemSummary(order)}</span>
                  <span className="text-body-sm text-ink-muted">{orderDate(order)}</span>
                </span>
                <span className="tabular shrink-0 text-body font-semibold">{formatCents(order.totalCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
