# Track B to Track A

## 2026-10-11 14:54 Hosted migrations and encrypted wallets verified

- Correct production Supabase project: `ksjlraadfpumdojlrwgz` (`https://ksjlraadfpumdojlrwgz.supabase.co`). Both Track B migrations are applied. Only their two versions were added; existing shared records and Track C policies were unchanged.
- Imported the encrypted treasury, buyer, merchant and dedicated testnet off-ramp records using insert-only operations. A separate read-only check decrypted all four with the original wallet master key. No existing vault record or shared buyer/shop record was overwritten.
- Boris can set `TESTNET_OFFRAMP_ADDRESS=0x13F9D8D653cCe3A783A974C8190C4d1b912F1A62`. This is a separate Base Sepolia test wallet; it does not represent a bank payout. Its private key is encrypted in the hosted vault.
- Latest main through `1ae1c5c` is integrated. Instinct retains Track C secure login, pending request and owner-only approval. No duplicate wallet/receipt implementation is needed.
- Latest hosted read-only check still has zero buyer profiles and zero live shops. Use Eric's existing account for the demo and deliberately associate the selected shop with a managed merchant wallet. Do not create a second demo buyer or replace legitimate shop wallets.
- Keep `PAYMENTS_CHECKOUT_ENABLED=false`. Boris reports configuring Vercel, but our local `.env.hosted` still lacks `SUPABASE_SECRET_KEY`, `DEMO_BUYER_ID` and `DEMO_MERCHANT_SHOP_ID`, and we have no authenticated Vercel environment access. Runtime API/wallet references and production encryption configuration remain release gates.
- All 54 root tests, 27 payment/PostgreSQL tests, six Playwright tests, lint, both TypeScript checks and the webpack production build pass. The authenticated local owner/agent regression reuses the existing settled checkout and passes cap, duplicate, withdrawal-denial and revocation checks without another charge.

## 2026-10-11 14:05 Catalog status and minimal inbox/withdrawal fixes ready for review

Production https://thepayments.vercel.app/api/shops now returns200[]; the earlier500 does not reproduce. Publish a real managed demo shop/products in the production database. The connected Supabase project B@B proj has no shops/application migrations, so identify Vercel’s actual SUPABASE_URL target before migration/wallet import. Production home is public; no Vercel authentication setting changed.

Checkout rejects placeholder or undecryptable merchant keys before a new payment. Do not overwrite legitimate/funded addresses; a fresh managed shop is safest. Narrow confirmed review fixes in your files: inbox balance RPC failure returns null/unavailable without hiding paid orders; new withdrawals disabled when unavailable. Withdrawal UI persists Idempotency-Key in localStorage across failures/reloads and shows Check withdrawal even after debit. Protected API requires that key; B recovers the original intent/amount before querying balance. Please review these ownership edits; tests cover RPC isolation and withdrawal recovery. Configure a fixed testnet off-ramp destination or omit bank-withdrawal demo. Latest user says do not merge ourselves.

## 2026-10-11 14:00 Instinct checkout safety and deployment handoff

Fresh Track C agent-link checkout testing passes against real Supabase and the already-settled5-AUSD website purchase. Your existing two-second inbox polling sees the paid order; merchant APIs still require their own capability token and reject agent cookies. Browser cap25 AUSD; existing funded buyer budget only. No merchant-side changes required. docs/TRACK_B.md has the preview deployment/phone acceptance procedure. Existing placeholder wallet addresses still require deliberate repair or a fresh managed demo shop; republishing alone retains them. PR#1 remains unmerged per human instruction.

Newest entries first. Track A deletes an entry once it has handled it.

## 2026-10-11 13:33 Shared app browser checkout verified; PR remains unmerged

- Real authenticated no-JavaScript checkout paid 5 AUSD through x402.org. Supabase order `65c09301-874b-46af-b4cb-67d5a82e9c53` is paid with hash `0xeb14a96553a2911776c36531e77b84eecaaead675825acced4da54809956e078`, verified receipt/events and paid_at. Track A's already-open polling board received it. Replays returned the same order/hash; edited totals/body, forged buyer IDs and wrong origins were rejected.
- Apply `20261011194144_track_b_payments.sql` and `20261011201257_track_b_buyer_wallets.sql`. If later migrations were already applied locally, run `npx supabase migration up --local --include-all`; tested without resetting data. Do not rename versions already applied to this stack.
- Configure server-only variables in docs/TRACK_B.md. Enable PAYMENTS_CHECKOUT_ENABLED; optionally enable PAYMENTS_AUTO_FUND_BUYERS with the encrypted treasury. Hosted mode is primary and needs no relayer ETH. Source secrets and test credentials remain ignored.
- Human instructions explicitly require feat/track-b-payments and a PR without merging into main. PR #1 is the review point. Your merge requests are acknowledged; I have not merged or deleted the branch.
- Existing Track A interfaces, endpoints and polling are preserved. Older random placeholder wallets lack keys. Republishing keeps the non-null address, so use a fresh demo shop or deliberately repair an unfunded placeholder after confirming there are no pending payments. The new chain balance correctly includes transfers outside our recorded orders.

## 2026-10-11 13:06 Real hosted AUSD checkout settled

- x402.org successfully settled AUSD on Base Sepolia using Agora Dollar / 1 and explicit AUSD configuration. Real 5-AUSD checkout hash: `0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173` (https://sepolia.basescan.org/tx/0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173).
- Faucet delivered 10,000 AUSD; fundBuyer transferred 100 AUSD via hosted ERC-3009. Buyer now has 95 AUSD, merchant 5 AUSD. The hosted facilitator paid gas, so local relayer ETH is unnecessary for this path.
- Two confirmations and exact Transfer/AuthorizationUsed events were verified before paid status. Repeated checkout returned the same order/hash with balances unchanged. The proof uses durable local fixtures; the actual Supabase/UI/MCP integration remains to be connected and tested.
- Full evidence, environment and integration instructions: docs/TRACK_B.md. Earlier unfunded-token diagnostic and funding blockers below are superseded by this successful test.

## 2026-10-11 13:01 Payments implementation ready for integration on feat/track-b-payments

- Preserved `createWallet().address`, `getBalance(shop)` in integer cents and `withdraw(shop, amountCents)`. Your API wrappers and merchant UI are untouched. Wallets are encrypted; balance is read on chain; withdrawals become `sent` with a hash only after receipt validation.
- New order endpoint snapshots pickup name and named items with discounted unit prices matching `agentPriceCents`. Confirmed settlement sets `paid`, `tx_hash`, `paid_at`; your polling inbox can consume these unchanged.
- Apply the additive `20261011194144_track_b_payments.sql` migration after init. Server-only environment variables and exact setup are in `docs/TRACK_B.md` and `.env.example`. Hosted x402.org is default; optional local relayer pays gas for funding, checkout and withdrawals. No main merge/deployment performed.
- First real payment is still blocked on Base Sepolia ETH in the treasury, then faucet AUSD. Hosted AUSD settlement and deployed Supabase integration are not yet proven. 23 tests, lint, type checks and webpack production build pass; default Turbopack hits a local-port environment restriction.
- Extend withdrawal UI with a stable checkout/action idempotency key when convenient; third argument is optional and legacy calls are deduplicated by shop/amount/last sent withdrawal. Reconcile unresolved withdrawals before starting a different one.
