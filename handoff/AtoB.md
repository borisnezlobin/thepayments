# Track A to Track B

Newest entries first. Track B deletes an entry once it has handled it.

## 2026-10-11 15:25 Track A review of PR #1: your edits to Track A files are good

- I read your changes to `useInbox.ts`, `MoneyPanel.tsx`, `InboxBoard.tsx`, `dashboard.ts`, `summary.ts` and the withdraw route. The retry key for withdrawals, the "Unavailable" balance and the "Check withdrawal" state are all good. Approved from Track A's side.
- Most of the diff in those files is your formatter re-wrapping lines. Please drop the reformatting before merge if you can, since it will conflict with ongoing Track A work in the same files.
- Hosted Supabase already has the init, Track C and Track A migrations (through `20261011223000_product_sizes`). Your two migrations sort earlier, so pushing them to hosted needs `npx supabase db push --include-all`.
- New since your branch: products can have sizes (`baseName`, `sizeLabel`, see AtoC.md). Each size is its own product, so x402 pricing by product is unchanged.

## 2026-10-11 14:45 Your branch fits Track A, please merge it to main

- I read `feat/track-b-payments`. `getBalance(shop)`, `withdraw(shop, amountCents)`, `createWallet()` and `explorerUrl()` match what the merchant dashboard calls, so no Track A changes are needed. Please merge to `main` and delete the branch (the team rules are main only).
- Your migration `20261011194144_track_b_payments.sql` sorts before migrations already on main (`20261011195048_track_c_agent_links`, `20261011210000_default_discount_3`). Rename it with a newer timestamp when you merge, so `npx supabase migration up` applies it on databases that already ran ours.
- Shops published before your merge got a placeholder wallet address that isn't in your vault. I'll republish the demo shops once your code is on main.

## 2026-10-11 14:20 Defect design standard now applies to every page

- The user asked us to follow the defect.tech design standard. The rules that apply to us are now in the design section of `AGENTS.md`. Please check your pages against them.
- Ink is now true black (`--color-ink: #000000`). The old teal near-black counted as the banned "tinted near-black".
- Body text has a little letter-spacing (`--tracking-body`) at the user's request. Headings and anything with `font-display` stay at normal spacing.
- Sliders: use the `range-accent` class with `style={rangeFill(value, min, max)}` from `components/ui/rangeFill.ts`.
- The default agent discount is now 3% (new migration `20261011210000_default_discount_3.sql`). Run `npx supabase migration up`.

## 2026-10-11 13:55 Logo and brand files are on main

- Use `<HomeLogo />` (links home) or `<Logo />` from `components/ui/Logo.tsx` in your headers, and `<LogoMark />` where you only want the T. Don't retype "The Payments" as styled text.
- Static files are in `public/brand/`: `logo.svg` (ink letters, teal T), `logo-teal.svg`, `logo-white.svg` for dark backgrounds, and `mark.svg`.
- The favicon (`app/icon.svg`) and the link-preview image (`app/opengraph-image.tsx`) cover the whole site, so you don't need your own.

## 2026-10-11 13:30 Merchant dashboard is live and calls your functions

- `GET /api/shops/[slug]/balance` and `POST /api/shops/[slug]/withdraw` exist and call `getBalance(shop)` and `withdraw(shop, amountCents)`. Withdraw sends the whole balance.
- The dashboard shows a withdrawal as "On its way" while `status` is `pending`, "Sent" when it's `sent`, and links `txHash` to Base Sepolia's explorer. Set both when your transfer lands.
- Publishing a shop calls `createWallet()` once and stores the address in `shops.wallet_address`. Your x402 `payTo` should be that address.
- The order board polls every 2 seconds and prints any order whose status is `paid`. Tested locally with orders inserted the way your endpoint will insert them.

## 2026-10-11 12:50 The scaffold is on main

- Pull now: the Next.js app, `lib/contract.ts`, the Supabase schema and a placeholder `lib/payments/index.ts` are on `main`. Replace the placeholder bodies, but keep the exported names and signatures, since Track A already calls `createWallet()`, `getBalance(shop)`, `withdraw(shop, amountCents)` and `explorerUrl(txHash)`.
- `getBalance` takes the shop (it needs `shop.walletAddress` for the on-chain read), not a bare address. The placeholder sums paid orders minus withdrawals from the database.
- Orders carry `pickupName` and `items` as `{productId, name, qty, unitPriceCents}`, so the inbox can show item names without a join. Price the order from `products` in the database when you create it.
- Track A's inbox reads orders whose status isn't `awaiting_payment`. Set `status: "paid"`, `tx_hash` and `paid_at` when payment settles, and the order shows up within 2 seconds.
- `orders.payment_nonce` is unique, for your idempotency key.
- Track A writes the thin `GET /api/shops/[slug]/balance` and `POST /api/shops/[slug]/withdraw` routes on top of your functions, so you only need to change `lib/payments`. Tell me here if you'd rather own them.
