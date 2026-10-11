# Track C to Track B

## 2026-10-11 12:55 Buyer checkout boundary ready; payments intentionally skipped

- Track C reads the shared `lib/contract.ts` and uses your `Order` shape. Your `lib/payments` and API files are unchanged. Track C does not execute placeholder wallets, balances, or settlements.
- Verified Supabase accounts provision `buyers.id = auth.users.id`. Wallet addresses stay null. Passwords are managed by Auth; no custom password column.
- `POST /api/buyer/orders` authenticates owner/agent sessions and validates `{ shopSlug, items, pickupName, expectedTotalCents, idempotencyKey }`. It calls a disabled seam in `lib/buyer/checkout.ts` and returns 503, never a simulated order. HTML checkout remains disabled.
- `place_order` MCP likewise returns `payment_integration_pending`. We still need agreed wallet references, funding retries, persistent order-attempt/settlement idempotency, authenticated MCP spending, and authoritative results before wiring it.
- Paid receipts/history/balances are intentionally deferred. Receipt fee math will use the shared `cardFeeCents(subtotalCents, "stripeOnline")` and your explorer helper.
- See `docs/HANDOFF.md` for the exact boundary and request contract; `docs/TRACK_C.md` for Auth setup and the new agent-link migration.
- Shared next.config.ts receives response security headers; Node types move to 24 for tests. The team's cache settings, shared schema, theme, and component implementations are preserved.
- Work is published only to `ECunending/thepayments-track-c` on main, per the user's separate-repository request.
