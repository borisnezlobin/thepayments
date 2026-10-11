# Track C: buyer pages and agents

This work follows the team README, AGENTS.md, shared `lib/contract.ts`, shared pricing, and the Track A handoff. Merchant home/routes and Track B files are retained from upstream, not replaced by this implementation. Track C is delivered on `main` in `borisnezlobin/babhacks2` and mirrored in `ECunending/thepayments-track-c`. Locally, the team repository is `upstream` and the personal repository is `origin`.

## What works independently

- Buyer pages under `app/(buyer)` (a route group; URLs stay `/shops`, `/s/:slug`, `/account`, etc.). Buyer styling is scoped and uses the team's theme tokens. Shared `Button`, `Field`, and `Ticket` are reused.
- `/shops` and `/s/:slug` consume `ShopSummary[]` and `ShopMenu` exactly as Track A supplies them. Menus use Track A's `agentPriceCents`, with integer-cent totals formatted by `lib/pricing.ts`.
- Catalog reads call `listLiveShops` and `getLiveMenu` directly by default. For separate deployments, `CATALOG_API_ORIGIN` enables the equivalent HTTP endpoints. No catalog data is seeded or invented.
- Email/password signup, confirmation, login, logout, and verified `buyers` profile provisioning through Supabase Auth. Passwords belong to Supabase Auth, so no password column is added to `buyers`. A verified user's UUID becomes `buyers.id`; the existing wallet address is preserved.
- Random 256-bit private agent links with 30-day expiration, rotation, and revocation. Only SHA-256 hashes are stored. Agents cannot access account management or generate new links. Revocation invalidates the link and existing agent cookies on the next request.
- `/agents`, `/llms.txt`, JSON menu discovery links, and `/mcp` Streamable HTTP. A browser opening `/mcp` is directed to the styled connection instructions.
- Public MCP `find_shops` and `get_menu` tools. `place_order` needs the agent link token as a Bearer token and returns `awaiting_approval`, never a paid result.
- Every agent order waits for the buyer. Pending requests appear on `/account` with Approve and Decline. The new `*_track_c_order_approvals.sql` migration is additive.

## Intentionally waiting for Track B

No wallet creation, funding, chain balance, `payX402` invocation, paid order creation, receipt, or paid order history is implemented. Track C never invokes the placeholder payment functions inherited from upstream.

`POST /api/buyer/orders` checks origin, authenticates the buyer, validates JSON/form input, then fails closed with 503. The pay button is disabled. There are no demo adapters or fabricated balances, transactions, orders, or storefronts in Track C.

## Run buyer pages

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000/shops. Without configuration, pages display clear unavailable states and payments remain disabled. The merchant home at `/` is unchanged.

### Enable real buyer accounts locally

The team's minimal README command excludes `gotrue` and `mailpit`. For account testing, **start Auth and mail as well**:

```sh
npx supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npx supabase status
```

Docker is required by Supabase CLI. If the stack was already started with Auth excluded, restart it with the command above. Do not reset a teammate's database. The new `*_track_c_agent_links.sql` migration is additive; the initial migration is unchanged.

Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the local stack. `NEXT_PUBLIC_SUPABASE_URL` is an optional override for the auth endpoint. Set `NEXT_PUBLIC_SITE_URL` (or `APP_ORIGIN`) to the exact browser origin.

For hosted Supabase, apply the team's migrations using the normal team deployment process. Configure Auth Site URL and allow `<site-origin>/auth/callback`. Email confirmation is recommended for hosted accounts. To support confirmation in another browser, use this confirmation email URL:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

The PKCE callback is also supported. For local confirmation tests, update `supabase/config.toml`'s Auth redirect allowlist to match your chosen origin; the team's current local config has confirmation disabled. No secret belongs in a `NEXT_PUBLIC_` variable or Git.

### Agent flow

1. Sign up, confirm if required, and sign in.
2. Open `/account`, create a private agent link, and copy it within two minutes.
3. Open it in a separate browser profile and choose **Connect for ordering**.
4. Browse shops. Account management is blocked for that session.
5. Revoke the link from the owner's profile. The next agent request loses access.

Capability URL paths should be redacted in deployment access logs. Track C adds no analytics and sets no-referrer/no-store headers for sensitive routes.

## Validation

```sh
npm run lint          # includes the team's complexity cap of 15
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests contain an isolated catalog fixture on port 3101; it is never imported into the app. Browser tests verify no-JavaScript ordering preparation, mobile layout, protected routes, and MCP HTTP requests. Embedded PostgreSQL tests execute the new migration over the team's schema and check grant ownership, rotation, and revocation. Actual Supabase email delivery and hosted Auth still need testing with project credentials.

## Sources used during implementation

- [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [mcp-handler documentation](https://github.com/vercel-labs/mcp-handler)
- [PGlite test database](https://pglite.dev/docs/)

Integration details and remaining payment requirements are in [HANDOFF.md](HANDOFF.md).
