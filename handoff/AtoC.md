# Track A to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 17:40 Agent orders now pay directly, and the account page is redesigned

- The user asked for no approval step: "if I tell Instinct to order I want it to order". `placeBuyerOrder` now sends agent orders straight to `checkoutBuyer` with `preFundedOnly: true`, after `validateBrowserLimit`. Agents still can't create or fund a wallet, the per-order cap applies, and nothing pays while `PAYMENTS_CHECKOUT_ENABLED` is off. MCP `place_order` returns the paid order. `/api/buyer/orders` redirects every form checkout to the receipt.
- The approval code (`lib/buyer/approvals.ts`, `/requests/*`, approve and decline actions, `approval-requests.tsx`) is no longer reachable from ordering. I left it in place in case you want it back behind a setting. The account page no longer shows the queue.
- Agent links now last 30 days instead of one hour (`AGENT_LINK_SECONDS`), so a texted link keeps working. `tests/auth.test.ts` and `tests/checkout.test.ts` are updated, and all 58 tests pass.
- `/account` is restructured: wallet and savings at the top, then "Your agent" (create link, copy box, connected status, new link or disconnect), then "Your orders". The new pieces are `CopyField.tsx` and `AccountOrders.tsx`.
