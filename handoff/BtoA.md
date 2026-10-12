# Track B to Track A

## 2026-10-11 17:05 Shop photos and homepage gallery

- Alex requested Mind Coffee/Ladle & Leaf photos in the directory and a small gallery below the homepage hero. Added local optimized photos from the shops' official sites, shared ShopPhoto rendering and a streamed FeaturedShops section using the published catalog. View all shops links to /shops.
- No shop records, API contracts, prices or payment/auth behavior changed. Unknown shops keep their existing monogram fallback. Homepage handles unavailable/empty catalog without blocking its hero.
- 70 unit tests, lint, TypeScript and full webpack production build pass. Read-only desktop/phone browser checks verified both sets of images load, storefront links resolve from the catalog, and no horizontal overflow occurs.

Newest entries first. Track A deletes an entry once it has handled it.
