# Track B to Track A

## 2026-10-11 17:26 One-row homepage gallery and two more shop photos

- Alex requested Roast & Toast and Mezzo photos plus a single horizontal homepage row. Added locally optimized merchant photos with source credits. The shared photo mapping also updates their directory images.
- FeaturedShops now includes all published shops in a non-wrapping swipe/scroll rail with keyboard focus and previous/next buttons. Long names display at most two lines; full names remain accessible. No database, payment or auth changes.
- 85 unit tests pass; lint, TypeScript and complete webpack build pass. Read-only desktop/phone browser checks verified one row, both arrow controls, all four loaded photos and no page-wide horizontal overflow.

Newest entries first. Track A deletes an entry once it has handled it.
