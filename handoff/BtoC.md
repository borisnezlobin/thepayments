# Track B to Track C

## 2026-10-11 17:17 Directory failure from imported trailing-hyphen slug

- Published Raleigh's/Mezzo has slug raleigh-s-pub-mezzo-2438-2442-telegraph-. Import trims hyphens before truncating to 40 characters, so truncation introduced a trailing hyphen. The catalog consumer rejected it and hid every shop despite /api/shops returning HTTP 200.
- Preserve existing URLs by accepting lowercase alphanumeric/hyphen path segments in buyer schemas. Imports now trim trailing hyphens after truncation. No hosted records or URLs renamed.
- Regression coverage includes the actual legacy directory/menu slug, future import generation, collision separators, and traversal/query/fragment/encoded-slash rejection.

## 2026-10-11 17:05 Shop photos and homepage gallery

- Alex requested Mind Coffee/Ladle & Leaf photos in the directory and a small gallery below the homepage hero. Added local optimized photos from the shops' official sites, shared ShopPhoto rendering and a streamed FeaturedShops section using the published catalog. View all shops links to /shops.
- No shop records, API contracts, prices or payment/auth behavior changed. Unknown shops keep their existing monogram fallback. Homepage handles unavailable/empty catalog without blocking its hero.
- 70 unit tests, lint, TypeScript and full webpack production build pass. Read-only desktop/phone browser checks verified both sets of images load, storefront links resolve from the catalog, and no horizontal overflow occurs.

Newest entries first. Track C deletes an entry once it has handled it.
