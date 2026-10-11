# Track B to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 13:06 Real hosted AUSD checkout settled

- x402.org successfully settled AUSD on Base Sepolia using Agora Dollar / 1 and explicit AUSD configuration. Real 5-AUSD checkout hash: `0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173` (https://sepolia.basescan.org/tx/0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173).
- Faucet delivered 10,000 AUSD; fundBuyer transferred 100 AUSD via hosted ERC-3009. Buyer now has 95 AUSD, merchant 5 AUSD. The hosted facilitator paid gas, so local relayer ETH is unnecessary for this path.
- Two confirmations and exact Transfer/AuthorizationUsed events were verified before paid status. Repeated checkout returned the same order/hash with balances unchanged. The proof uses durable local fixtures; the actual Supabase/UI/MCP integration remains to be connected and tested.
- Full evidence, environment and integration instructions: docs/TRACK_B.md. Earlier unfunded-token diagnostic and funding blockers below are superseded by this successful test.

## 2026-10-11 13:01 Server payment client and x402 order endpoint implemented

- `createWallet()` returns `{address,id,walletAddress}`; store address with your buyer. `fundBuyer(wallet, amountCents=1000, stableKey?)` funds testnet AUSD from encrypted treasury (or securely configured treasury key).
- `payX402(wallet,url,{pickupName,items,buyerId?},{idempotencyKey:checkoutId})` returns `{orderId,order,txHash,explorerUrl}`. Generate checkoutId once per intentional purchase, preserve it on retries, and derive buyerId from your authenticated session. Our server verifies that buyerId's wallet matches the signed payer.
- External clients receive x402 v2 PAYMENT-REQUIRED plus an Idempotency-Key on 402. Retry with PAYMENT-SIGNATURE and the same key. A fresh signature for that checkout cannot charge twice. Token/network/domain are explicit AUSD / eip155:84532 / Agora Dollar / 1, never default USDC.
- Public order status omits pickup/buyer details. Apply Track B migration and configure server-only variables in docs/TRACK_B.md. PAYMENTS_ALLOWED_ORIGINS must include the exact app origin.
- Hosted x402.org is default but funded AUSD settlement is unproven. Local facilitator is available with Base Sepolia ETH. Buyer/merchant need no gas. Treasury faucet and first real $5 payment are awaiting testnet gas funding; no transaction hash yet.
- Pulled your checkout boundary at 799c38c. Keep `checkoutEnabled=false` until the funded proof and provisioning are verified; your seam/screens/MCP remain unchanged. Use authoritative `payments.quote()` to compare `expectedTotalCents` before invoking payX402, with your authenticated buyer and stable UUID key.
- Feature branch is feat/track-b-payments; no merge to main. 23 tests, lint/type checks and webpack build pass. CDP auth, smart-contract wallets and XRPL remain unimplemented.
