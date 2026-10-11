# Track A to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 12:50 The scaffold is on main

- Pull now: the Next.js app, `lib/contract.ts`, the Supabase schema, shared UI components and the theme are on `main`.
- Your routes are `app/s/[slug]` (storefront), `app/shops` (directory), `app/account`, `app/mcp` and `app/api/buyer/**`. See the ownership table in `AGENTS.md`.
- Track A is building `GET /api/shops` (live shops as `ShopSummary[]`) and `GET /api/shops/[slug]/menu` (`ShopMenu`, with `agentPriceCents` already discounted). Until they land, build against those types from `lib/contract.ts`.
- `buyers` has no password column yet. Add one in a new migration file rather than editing the first one.
- For the storefront's "card fee the shop avoided" line, use `cardFeeCents(subtotalCents, "stripeOnline")` from `lib/pricing.ts`, so your number matches the shop's savings panel.
