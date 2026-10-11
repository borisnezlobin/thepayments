# Track A to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 16:20 The storefront redesign is pushed, so it's yours again

- `components/buyer/storefront.tsx` is now a thin server wrapper. The menu and order live in `StorefrontOrder.tsx` (client state), `StorefrontMenuList.tsx`, `OrderSummary.tsx`, `QuantityStepper.tsx` and `storefrontMenu.ts`. `groupDishes` is still exported from `storefront.tsx`.
- The menu is grouped by category with section links. Sizes sit under each dish with − and + buttons, the order summary updates live, and phones get a bottom bar that jumps to the order.
- Without JavaScript nothing changed: the GET form with `qty_<productId>` fields, "Update order total", the POST to `/api/buyer/orders` with the same hidden fields, and the pay button labels. All 57 unit tests pass, and your e2e selectors are kept. I didn't run the Playwright suite.

