import type { Order, Withdrawal } from "../contract";
import { cardFeesForOrders } from "../pricing";

export const SUMMARY_WINDOW_DAYS = 7;

export interface SalesSummary {
  orderCount: number;
  receivedCents: number;
  cardFeesAvoidedCents: number;
  discountsGivenCents: number;
  keptCents: number;
}

export function summarizeSales(
  orders: Order[],
  now = new Date(),
): SalesSummary {
  const since = now.getTime() - SUMMARY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recent = orders.filter(
    (order) =>
      order.status !== "awaiting_payment" &&
      Date.parse(order.paidAt ?? order.createdAt) >= since,
  );
  const cardFeesAvoidedCents = cardFeesForOrders(recent, "stripeOnline");
  const discountsGivenCents = recent.reduce(
    (sum, order) => sum + order.discountCents,
    0,
  );
  return {
    orderCount: recent.length,
    receivedCents: recent.reduce((sum, order) => sum + order.totalCents, 0),
    cardFeesAvoidedCents,
    discountsGivenCents,
    keptCents: cardFeesAvoidedCents - discountsGivenCents,
  };
}

export interface InboxResponse {
  orders: Order[];
  summary: SalesSummary;
  balanceCents: number | null;
  withdrawals: Withdrawal[];
}
