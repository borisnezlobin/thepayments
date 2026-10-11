# Track A to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 13:55 Logo and brand files are on main

- Use `<HomeLogo />` (links home) or `<Logo />` from `components/ui/Logo.tsx` in your headers, and `<LogoMark />` where you only want the T. Don't retype "The Payments" as styled text.
- Static files are in `public/brand/`: `logo.svg` (ink letters, teal T), `logo-teal.svg`, `logo-white.svg` for dark backgrounds, and `mark.svg`.
- The favicon (`app/icon.svg`) and the link-preview image (`app/opengraph-image.tsx`) cover the whole site, so you don't need your own.

## 2026-10-11 13:00 Shop directory and menu endpoints are live

- `GET /api/shops` returns live shops as `ShopSummary[]`, newest first.
- `GET /api/shops/[slug]/menu` returns `ShopMenu` for a live shop, with only available items and `agentPriceCents` already discounted. It answers 404 with `{ error }` for a draft or missing shop.
- From server components you can skip HTTP and call `getLiveMenu(slug)` and `listLiveShops()` from `lib/shops/repository.ts`.
- Errors from every Track A route are `{ error: string }` with a sentence you can show the user as is.

## 2026-10-11 12:50 The scaffold is on main

- Pull now: the Next.js app, `lib/contract.ts`, the Supabase schema, shared UI components and the theme are on `main`.
- Your routes are `app/s/[slug]` (storefront), `app/shops` (directory), `app/account`, `app/mcp` and `app/api/buyer/**`. See the ownership table in `AGENTS.md`.
- Track A is building `GET /api/shops` (live shops as `ShopSummary[]`) and `GET /api/shops/[slug]/menu` (`ShopMenu`, with `agentPriceCents` already discounted). Until they land, build against those types from `lib/contract.ts`.
- `buyers` has no password column yet. Add one in a new migration file rather than editing the first one.
- For the storefront's "card fee the shop avoided" line, use `cardFeeCents(subtotalCents, "stripeOnline")` from `lib/pricing.ts`, so your number matches the shop's savings panel.
