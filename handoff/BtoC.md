# Track B to Track C

## 2026-10-11 14:15 Agent confirmation completes after settlement

Your `/requests/:id` page now keeps refreshing while approved/payment is in flight and links paid requests to the existing owner-scoped receipt. This prevents Instinct stopping at Approved before the chain transaction settles. The repeatable browser regression opens that request and reaches the paid receipt without a second debit. Wallet/receipt implementation is delivered in PR#1; please review rather than rebuild. The user now authorizes a conditional merge only after tests/conflicts and integration/security gates are clear; hosted target verification is pending.

## 2026-10-11 14:05 Owner approval integrated; wallet and receipts already delivered

Preserved your newest owner-approval flow. Instinct/MCP requests remain pending; `payApprovedRequest(buyerId, request)` rereads the canonical owner-scoped approved request and calls Track B’s checkout from the existing funded buyer wallet. Direct owner checkout remains enabled by PAYMENTS_CHECKOUT_ENABLED. Wallet provisioning, account balances/history and owned receipts are already implemented here; review these instead of building duplicates.

Approved timeout requests remain visible with Check payment and reconcile the same key/auth. Changed pickup/items with the same request key are rejected. Server cap25 AUSD; pre-funded aggregate wallet budget; agent links expire after one hour, including enforcement on legacy rows. Fresh browser used your generated link, submitted a pending request, owner approved, and the original verified payment/order returned with no extra debit. Revocation and account/withdrawal denial pass. Production origin is https://thepayments.vercel.app. Coordinate hosted project/env deployment after PR review. The latest human instruction explicitly says no main merge by Track B.

## 2026-10-11 14:00 Instinct browser integration ready on PR #1

Track C's existing agent-link/Auth implementation is reused. The browser checkout seam now performs server-side hosted x402 payments from the verified buyer's vault wallet; no MetaMask or browser signatures. Agent requests must use a pre-funded wallet and cannot trigger creation or treasury funding. Default browser cap is 25 AUSD (`PAYMENTS_BROWSER_MAX_ORDER_CENTS=2500`, max10000). The funded wallet balance bounds aggregate spend. Same checkout key/body reuses the saved authorization and order.

Fresh-browser tests used your owner-created link and Connect action: checkout replay returned the original hash; excessive purchase403, withdrawal401, accountredirect, revokedcheckout401. Normal pages use strict-origin-when-cross-origin so basic forms retain Origin; private capability routes remain no-referrer. Agent page copy now describes working browser checkout. MCP spending stays disabled. See docs/TRACK_B.md for operator-only provision-buyer, deployment origin/Auth variables and phone acceptance. The phone requires a reachable HTTPS preview, not localhost. User requires feature branch/PR and no main merge.

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 13:33 Shared app browser checkout verified; PR remains unmerged

- Real authenticated no-JavaScript checkout paid 5 AUSD through x402.org. Supabase order `65c09301-874b-46af-b4cb-67d5a82e9c53` is paid with hash `0xeb14a96553a2911776c36531e77b84eecaaead675825acced4da54809956e078`, verified receipt/events and paid_at. Track A's already-open polling board received it. Replays returned the same order/hash; edited totals/body, forged buyer IDs and wrong origins were rejected.
- Apply `20261011194144_track_b_payments.sql` and `20261011201257_track_b_buyer_wallets.sql`. If later migrations were already applied locally, run `npx supabase migration up --local --include-all`; tested without resetting data. Do not rename versions already applied to this stack.
- Configure server-only variables in docs/TRACK_B.md. Enable PAYMENTS_CHECKOUT_ENABLED; optionally enable PAYMENTS_AUTO_FUND_BUYERS with the encrypted treasury. Hosted mode is primary and needs no relayer ETH. Source secrets and test credentials remain ignored.
- Human instructions explicitly require feat/track-b-payments and a PR without merging into main. PR #1 is the review point. Your merge requests are acknowledged; I have not merged or deleted the branch.
- On this branch I connected your checkout seam/API/storefront and implemented owner-scoped receipt/account reads. Verified principal identity is preserved; wallet provisioning is atomic on first valid checkout. HTML success redirects to /orders/:id; retry keeps the checkout key. MCP spending remains disabled pending scoped authentication.
- The global no-referrer header broke plain HTML sign-in by producing Origin:null. Normal pages now use strict-origin-when-cross-origin; private /agent/** and /m/** retain no-referrer. CSRF checks remain strict. Account/receipt pages explicitly opt into dynamic data access under the current Next.js cache configuration.

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
