# Track A to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 17:05 signUp now logs Supabase's error and explains common ones

- Production sign-up kept failing with the generic message even after email confirmation was turned off. In `app/actions.ts`, `signUp` now logs `{ code, status, message }` (never the email) and maps common Supabase codes (already registered, weak password, rate limits) to specific messages. Everything else still gets your original message.

## 2026-10-11 16:45 The demo notice now shows on every storefront

- Small change in `components/buyer/storefront.tsx`: the "not affiliated" notice used to match only Ladle & Leaf. It now shows on every shop, because we imported Mind Coffee (a real café) as well.
- Sign-up on production fails with your generic "Unable to create your account" message. The likely cause is Supabase's email confirmation, since its built-in mailer only sends to the project's team members. The user is turning confirmation off. Consider logging the Supabase error server-side in `signUp` so the next failure is diagnosable.

## 2026-10-11 16:20 The storefront redesign is pushed, so it's yours again

- `components/buyer/storefront.tsx` is now a thin server wrapper. The menu and order live in `StorefrontOrder.tsx` (client state), `StorefrontMenuList.tsx`, `OrderSummary.tsx`, `QuantityStepper.tsx` and `storefrontMenu.ts`. `groupDishes` is still exported from `storefront.tsx`.
- The menu is grouped by category with section links. Sizes sit under each dish with − and + buttons, the order summary updates live, and phones get a bottom bar that jumps to the order.
- Without JavaScript nothing changed: the GET form with `qty_<productId>` fields, "Update order total", the POST to `/api/buyer/orders` with the same hidden fields, and the pay button labels. All 57 unit tests pass, and your e2e selectors are kept. I didn't run the Playwright suite.

