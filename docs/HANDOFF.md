# Track C integration boundary

## Shared contract

Track C imports `ShopMenu`, `MenuItem`, `ShopSummary`, and `Order` from `lib/contract.ts`. It does not redefine the team's models. `lib/buyer/schemas.ts` validates only incoming API shapes and Track C's checkout request. Directory shape is `ShopSummary[]`; menu shape is `{ shop: { slug, name, agentDiscountPct }, items: MenuItem[] }`.

Track A already filters unavailable products and unpublished shops. We display its `agentPriceCents` exactly, avoiding a separate discount formula. `formatCents` comes from shared `lib/pricing.ts`. In-process reads call Track A's repository directly; optional `CATALOG_API_ORIGIN` supports separate deployments.

## Buyer identities

Supabase Auth owns email/password credentials. After a verified signup, login, or email confirmation, `ensureBuyer` inserts a shared `buyers` row with `id = auth.users.id`, without creating a wallet. Existing rows/wallets are not overwritten. An email conflict with a differently identified preexisting buyer fails rather than silently linking identities.

The additive migration introduces only `track_c_agent_links`, referencing the existing `buyers` table. Authenticated owners access their own row via RLS (`auth.uid() = buyer_id`). The server-only Supabase secret resolves token hashes for agent sessions. Raw credentials are never stored in the table. A replacement link atomically replaces the hash; revoke deletes it.

The team's minimal local stack excludes Auth. See TRACK_C.md for the account-test startup command. No new password column is needed. Production Supabase signup rate limits apply; no custom password storage is implemented.

## Agent orders wait for the buyer's approval

Agents never pay by themselves. When an agent session (browser cookie from the agent link, or the agent link token as an MCP Bearer token) places an order, `lib/buyer/approvals.ts` prices it from the live menu, checks `expectedTotalCents`, and stores it in `track_c_order_requests` as `pending` for 30 minutes. The same buyer and idempotency key always return the same request.

The signed-in owner sees pending requests on `/account` and approves or declines each one. Approval moves the row from `pending` to `approved` with a conditional update, so a double tap or a second device cannot pay twice. Only then is `payApprovedRequest` in `lib/buyer/payment.ts` called. A browser agent is redirected to `/requests/:id`, which shows the request's state.

## Payment seam: deliberately disabled

`lib/buyer/payment.ts` is where Track B's `payX402` connects, with `checkoutEnabled` beside it. It always throws `IntegrationUnavailable('payments')`, and an approval that hits it is returned to `pending`. The owner's own checkout in `lib/buyer/checkout.ts` also still throws. Track C does not import or execute `lib/payments`, except transitively through the unmodified Track A repository's read functions (which do not invoke payment functions).

`POST /api/buyer/orders` accepts JSON or HTML form data:

```json
{
  "shopSlug": "merchant-slug",
  "items": [{ "productId": "product-id", "qty": 1 }],
  "pickupName": "Buyer name",
  "expectedTotalCents": 475,
  "idempotencyKey": "be7c4218-e4f5-4176-87c5-6cb82fcaea64"
}
```

Forms encode `items` as JSON. The caller cannot supply buyerId, wallet keys, arbitrary payment URLs, or extra fields. Identity comes from the verified owner/agent session. Cross-origin browser submissions are denied. Currently valid authenticated requests return 503 and no order is created.

Before enabling checkout:

1. Agree wallet references and idempotent provisioning/funding through Track B's `createWallet`/`fundBuyer` functions. `buyers.wallet_address` remains null until then.
2. Re-read the menu, validate quantities and products, compare the authoritative total to `expectedTotalCents`, and require reconfirmation if it changes.
3. Persist order attempts keyed by buyer and idempotency key; bind the key to the request. Coordinate this with Track B's settlement nonce to prevent double debits after timeouts. This persistence is not yet implemented.
4. Call `payX402` using a trusted server-generated URL, server-side buyer wallet, pickup name, and agreed idempotency data. Never blindly retry uncertain settlement.
5. Redirect successful HTML requests to a verified, owner-authorized `/orders/:id` receipt; return structured JSON to API clients. Render HTML failures accessibly.
6. Read paid order history and actual balance. Use `cardFeeCents(subtotalCents, 'stripeOnline')` for the shop's avoided fee, matching Track A. Current receipt/history surfaces intentionally show no success or fake figures.
7. Test the complete paid flow and insufficient funds/error/retry paths, then enable the button.

## MCP authorization before payments

`find_shops` and `get_menu` are public reads. `place_order` requires the buyer's agent link token as a Bearer token, resolved through the same expiry and revocation rules as the browser. It only creates an approval request and returns `awaiting_approval`. It cannot spend.

Before any MCP path pays from a wallet, keep the owner approval step in front of it, and add limits. Never expose a funded shared wallet to anonymous callers. This version accepts no MCP private key and implements no OAuth authorization server.

## Boundaries verified locally

Lint, build, type checks, pricing/validation tests, actual HTTP MCP tests, no-JavaScript browser tests, and embedded PostgreSQL RLS tests cover independent Track C behavior. Hosted Auth, email delivery, live merchant data, wallets, settlement, and the merchant inbox require project credentials and teammate implementations before end-to-end verification.
