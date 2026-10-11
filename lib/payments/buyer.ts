import "server-only";
import { createHash } from "node:crypto";
import type { Address } from "viem";
import { db } from "../db/client";
import { toOrder, type OrderRow } from "../db/rows";
import { paymentRuntime } from "./runtime";
import { PaymentError, validateBrowserLimit } from "./validation";
export { validateBrowserLimit } from "./validation";
import { centsToUnits } from "./config";
import type { Wallet } from "./index";
import { fundBuyer, payX402 } from "./index";
export type BuyerCheckout = {
  shopSlug: string;
  items: { productId: string; qty: number }[];
  pickupName: string;
  expectedTotalCents: number;
  idempotencyKey: string;
};
export function browserCheckoutEnabled() {
  return (
    process.env.PAYMENTS_CHECKOUT_ENABLED === "true" &&
    Boolean(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SECRET_KEY &&
      process.env.PAYMENTS_ENCRYPTION_KEY,
    )
  );
}
async function buyerWallet(
  buyerId: string,
  preFundedOnly: boolean,
): Promise<Wallet> {
  const { repository, payments } = paymentRuntime();
  const { data, error } = await db()
    .from("buyers")
    .select("wallet_address")
    .eq("id", buyerId)
    .single();
  if (error) throw new PaymentError(403, "Buyer profile is unavailable");
  let address = data.wallet_address as string | null;
  if (!address && preFundedOnly)
    throw new PaymentError(
      402,
      "Ask the account owner to provision and fund this buyer wallet.",
    );
  if (!address) {
    const candidate = await payments.createWallet();
    const result = await db().rpc("track_b_assign_buyer_wallet", {
      p_buyer: buyerId,
      p_wallet: candidate.id,
    });
    if (result.error)
      throw new PaymentError(503, "Wallet setup is unavailable");
    address = result.data as string;
  }
  const stored = await repository.findWallet(address as Address);
  if (!stored)
    throw new PaymentError(
      503,
      "This buyer wallet is unavailable for checkout",
    );
  const wallet = { id: stored.id, address: stored.walletAddress };
  if (!preFundedOnly && process.env.PAYMENTS_AUTO_FUND_BUYERS === "true")
    await fundBuyer(wallet, 1000, `initial-buyer-funding-${buyerId}`);
  return wallet;
}
export async function checkoutBuyer(
  buyerId: string,
  input: BuyerCheckout,
  origin: string,
  options: { preFundedOnly?: boolean } = {},
) {
  const body = { buyerId, pickupName: input.pickupName, items: input.items },
    url = `${origin}/api/shops/${encodeURIComponent(input.shopSlug)}/orders`;
  const { payments, repository } = paymentRuntime();
  // Inspect persisted checkout authorization before re-pricing: a paid/pending checkout
  // must remain recoverable even if the menu later changes.
  const profile = await db()
    .from("buyers")
    .select("wallet_address")
    .eq("id", buyerId)
    .single();
  if (profile.error)
    throw new PaymentError(403, "Buyer profile is unavailable");
  const current = profile.data.wallet_address
    ? await repository.findWallet(profile.data.wallet_address as Address)
    : null;
  const key = current
    ? createHash("sha256")
        .update(
          JSON.stringify({
            wallet: current.id,
            url,
            key: input.idempotencyKey,
          }),
        )
        .digest("hex")
    : null;
  const previous = key ? await repository.getClientPayment(key) : null;
  if (previous) {
    if (
      previous.accepted.amount !==
      centsToUnits(input.expectedTotalCents).toString()
    )
      throw new PaymentError(
        409,
        "This checkout is bound to a different total",
      );
  } else {
    validateBrowserLimit(input.expectedTotalCents);
    const quote = await payments.quote(input.shopSlug, body);
    if (quote.totalCents !== input.expectedTotalCents)
      throw new PaymentError(
        409,
        "The menu price changed. Review the current total before paying.",
      );
  }
  const wallet = await buyerWallet(buyerId, options.preFundedOnly ?? false);
  if (
    !previous &&
    (await payments
      .getBalance(wallet.address as Address)
      .then((b) => BigInt(b.units))) < centsToUnits(input.expectedTotalCents)
  )
    throw new PaymentError(
      402,
      "Your wallet does not have enough testnet AUSD for this order.",
    );
  const result = await payX402(wallet, url, body, {
    idempotencyKey: input.idempotencyKey,
    expectedTotalCents: input.expectedTotalCents,
  });
  return result.order;
}
export async function buyerOrder(buyerId: string, orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const { data, error } = await db()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("buyer_id", buyerId)
    .maybeSingle<OrderRow>();
  if (error) throw new Error("Order lookup unavailable");
  return data ? toOrder(data) : null;
}
export async function buyerSummary(buyerId: string) {
  const [profile, history] = await Promise.all([
    db().from("buyers").select("wallet_address").eq("id", buyerId).single(),
    db()
      .from("orders")
      .select("*")
      .eq("buyer_id", buyerId)
      .neq("status", "awaiting_payment")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (profile.error || history.error)
    throw new Error("Buyer wallet/history unavailable");
  const orders = (history.data as OrderRow[]).map(toOrder);
  const balance = profile.data.wallet_address
    ? await paymentRuntime().payments.getBalance(
        profile.data.wallet_address as Address,
      )
    : null;
  return {
    balanceCents: balance?.balanceCents ?? null,
    orders,
    savingsCents: orders.reduce((sum, o) => sum + o.discountCents, 0),
  };
}
