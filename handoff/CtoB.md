# Track C to Track B

## 2026-10-11 16:58 Agent orders wait for owner approval again

- Eric asked for owner approval on every agent purchase again. Agent orders no longer call `checkoutBuyer` directly. Track A's AtoB entry about that is out of date. Money moves only when the owner approves on `/account`, through `payApprovedRequest`, which calls `checkoutBuyer(..., { preFundedOnly: true })` as before.
- Agents now connect once with a one-time token and keep a 90-day session. MCP clients trade the token for a session token at `POST /api/buyer/agent-session` and send that as the Bearer token.
- New Track C migration `20261011232000_track_c_agent_sessions.sql`. It has to be on hosted Supabase before the branch merges. Boris has the steps in `CtoA.md`.
- `packages/track-b/scripts/browser-e2e.ts` and `docs/TRACK_B.md` still use agent links, which no longer exist. The script's labels were already out of date on main. To follow the new flow, press "Connect Instinct" on `/account` and read the "Agent access token" field. Then fill that label on `/agents/connect` in a fresh browser context and press "Connect".

## 2026-10-11 14:45 Track C review of PR #1: good to merge from our side

- Read every Track C file the PR touches (approvals, payment seam, checkout, orders route, account, receipt, request status, agent link expiry). The approval flow is kept intact. Payment rereads the owner-approved request before signing. Agents still cannot approve or pay. We will not build duplicate wallet, balance or receipt code.
- On head `5450488` locally: lint, typecheck, build, 54 unit tests and the 6 Playwright buyer tests pass.
- One minor note, not a blocker: in `approveRequest`, an already approved request that has expired falls back through `transition(approved → pending)`, which checks expiry and throws "already decided or expired". That hides the real "checkout unavailable" error. Skipping the expiry check on that revert would fix it.

## 2026-10-11 14:30 One shared demo buyer for Instinct

- The demo buyer is Eric's own account. He signs up on https://thepayments.vercel.app once the hosted project has the migrations and Auth callbacks. He will send you the email directly. No email, buyer ID or agent link goes in this repo.
- Please fund that buyer with your operator CLI, `provision-buyer <buyer id> 1000`, so Track B and Track C use the same buyer and wallet. Do not create a second demo buyer.
- Add a `BtoC.md` entry when the wallet is funded. Eric creates the agent link on `/account` right before recording, since links now expire after one hour.
- Track C is reviewing PR #1 for anything that changes Track C behavior and will note findings here.

## 2026-10-11 13:55 Agent orders now wait for the buyer's approval

- Per your note, agents never pay by themselves. An agent's order (browser or MCP `place_order`) is stored in the new `track_c_order_requests` table as pending. The owner approves it on `/account`, and only then does Track C call your payment code.
- The call site is `payApprovedRequest(request)` in `lib/buyer/payment.ts`. It gets the approved request with `idempotencyKey`, items, pickup name and total. That is where `payX402` connects after your merge.
- MCP `place_order` now needs the buyer's agent link token as a Bearer token.
- New additive migration `20261011215500_track_c_order_approvals.sql`. Run `npx supabase migration up`.

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
