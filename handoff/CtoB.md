# Track C to Track B

## 2026-10-11 13:23 Please merge feat/track-b-payments into main

- Track C is ready to wire real checkout. Your `BtoC.md` notes (createWallet, fundBuyer, payX402 with idempotencyKey, quote) are only on `feat/track-b-payments`. Main still has the placeholder `lib/payments` that throws.
- Team rules in `AGENTS.md` are main only. Please pull main, rebase or merge your branch onto it, run `npm run build` and `npm run lint`, then push to main. Add a handoff entry when it lands.
- Once it's on main, Track C will provision a wallet on buyer signup with `createWallet()` + `fundBuyer()`, enable `POST /api/buyer/orders` through `payX402`, and build the receipt and account pages. MCP `place_order` comes after that.
- Please tell us in `BtoC.md` which migration and server-only env variables we need locally to test against your code.

## 2026-10-11 12:59 Track C delivery to the shared repository

- Track C is now being delivered on shared `main` at the user's request. Your payment code is unchanged; the earlier private-only note below describes the initial development phase.
- The browser/MCP checkout contracts and integration requirements are in `docs/HANDOFF.md`; no wallet creation, funding, settlement, or fabricated paid results are added.
- Verified Auth UUIDs provision shared buyer IDs. Apply the additive agent-link migration when configuring real account tests.

## 2026-10-11 12:55 Buyer checkout boundary ready; payments intentionally skipped

- Track C reads the shared `lib/contract.ts` and uses your `Order` shape. Your `lib/payments` and API files are unchanged. Track C does not execute placeholder wallets, balances, or settlements.
- Verified Supabase accounts provision `buyers.id = auth.users.id`. Wallet addresses stay null. Passwords are managed by Auth; no custom password column.
- `POST /api/buyer/orders` authenticates owner/agent sessions and validates `{ shopSlug, items, pickupName, expectedTotalCents, idempotencyKey }`. It calls a disabled seam in `lib/buyer/checkout.ts` and returns 503, never a simulated order. HTML checkout remains disabled.
- `place_order` MCP likewise returns `payment_integration_pending`. We still need agreed wallet references, funding retries, persistent order-attempt/settlement idempotency, authenticated MCP spending, and authoritative results before wiring it.
- Paid receipts/history/balances are intentionally deferred. Receipt fee math will use the shared `cardFeeCents(subtotalCents, "stripeOnline")` and your explorer helper.
- See `docs/HANDOFF.md` for the exact boundary and request contract; `docs/TRACK_C.md` for Auth setup and the new agent-link migration.
- Shared next.config.ts receives response security headers; Node types move to 24 for tests. The team's cache settings, shared schema, theme, and component implementations are preserved.
- Work is published only to `ECunending/thepayments-track-c` on main, per the user's separate-repository request.
