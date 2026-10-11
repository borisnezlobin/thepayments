import type { Order } from "./contract";

export const CARD_PROCESSORS = {
  stripeOnline: { name: "Stripe online", percent: 2.9, fixedCents: 30 },
  squareInPerson: { name: "Square in person", percent: 2.6, fixedCents: 15 },
} as const;

export type CardProcessor = keyof typeof CARD_PROCESSORS;

export function agentPriceCents(priceCents: number, agentDiscountPct: number) {
  return Math.round((priceCents * (100 - agentDiscountPct)) / 100);
}

export function cardFeeCents(amountCents: number, processor: CardProcessor) {
  const { percent, fixedCents } = CARD_PROCESSORS[processor];
  return Math.round((amountCents * percent) / 100) + fixedCents;
}

export function cardFeesForOrders(orders: Pick<Order, "subtotalCents">[], processor: CardProcessor) {
  return orders.reduce((sum, order) => sum + cardFeeCents(order.subtotalCents, processor), 0);
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
