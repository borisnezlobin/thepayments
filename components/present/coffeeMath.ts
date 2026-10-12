import { agentPriceCents, cardFeeCents } from "@/lib/pricing";

const COFFEE_PRICE_CENTS = 550;
const AGENT_DISCOUNT_PCT = 5;
const CAFE_NET_PROFIT_2021 = 65_718;
const CAFE_REVENUE_2021 = 730_199;

const cardFee = cardFeeCents(COFFEE_PRICE_CENTS, "stripeOnline");
const agentPrice = agentPriceCents(COFFEE_PRICE_CENTS, AGENT_DISCOUNT_PCT);

export const COFFEE = {
  priceCents: COFFEE_PRICE_CENTS,
  cardFeeCents: cardFee,
  cafeProfitCents: Math.round((COFFEE_PRICE_CENTS * CAFE_NET_PROFIT_2021) / CAFE_REVENUE_2021),
  cafeProfitPct: Math.round((CAFE_NET_PROFIT_2021 / CAFE_REVENUE_2021) * 100),
  cardShopKeepsCents: COFFEE_PRICE_CENTS - cardFee,
  agentPriceCents: agentPrice,
  agentFeeLabel: "0.001¢",
};

export function cents(value: number) {
  return value < 100 ? `${value}¢` : `$${(value / 100).toFixed(2)}`;
}
