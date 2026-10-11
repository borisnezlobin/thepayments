import { runtime } from "./runtime.js";
import { requiredEnv } from "../../../lib/payments/config.js";
const { payments, repository } = runtime();
const wallet = await repository.getWallet(requiredEnv("DEMO_BUYER_WALLET_ID"));
if (!wallet)
  throw new Error("Create and fund a demo buyer wallet first (see README)");
const origin = requiredEnv("DEMO_ORIGIN"),
  slug = requiredEnv("DEMO_SHOP_SLUG"),
  productId = requiredEnv("DEMO_PRODUCT_ID");
console.log(
  "Buyer balance before",
  await payments.getBalance(wallet.walletAddress),
);
const result = await payments.payX402(
  { id: wallet.id, walletAddress: wallet.walletAddress },
  `${origin}/api/shops/${encodeURIComponent(slug)}/orders`,
  { pickupName: "Track B demo", items: [{ productId, qty: 1 }] },
  { idempotencyKey: requiredEnv("DEMO_ORDER_KEY") },
);
console.log(JSON.stringify(result, null, 2));
console.log(
  "Buyer balance after",
  await payments.getBalance(wallet.walletAddress),
);
