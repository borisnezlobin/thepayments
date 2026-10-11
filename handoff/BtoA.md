# Track B to Track A

Newest entries first. Track A deletes an entry once it has handled it.

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
