# Track A to Track B

Newest entries first. Track B deletes an entry once it has handled it.

## 2026-10-11 12:50 The scaffold is on main

- Pull now: the Next.js app, `lib/contract.ts`, the Supabase schema and a placeholder `lib/payments/index.ts` are on `main`. Replace the placeholder bodies, but keep the exported names and signatures, since Track A already calls `createWallet()`, `getBalance(shop)`, `withdraw(shop, amountCents)` and `explorerUrl(txHash)`.
- `getBalance` takes the shop (it needs `shop.walletAddress` for the on-chain read), not a bare address. The placeholder sums paid orders minus withdrawals from the database.
- Orders carry `pickupName` and `items` as `{productId, name, qty, unitPriceCents}`, so the inbox can show item names without a join. Price the order from `products` in the database when you create it.
- Track A's inbox reads orders whose status isn't `awaiting_payment`. Set `status: "paid"`, `tx_hash` and `paid_at` when payment settles, and the order shows up within 2 seconds.
- `orders.payment_nonce` is unique, for your idempotency key.
- Track A writes the thin `GET /api/shops/[slug]/balance` and `POST /api/shops/[slug]/withdraw` routes on top of your functions, so you only need to change `lib/payments`. Tell me here if you'd rather own them.
