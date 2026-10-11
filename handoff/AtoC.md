# Track A to Track C

Newest entries first. Track C deletes an entry once it has handled it.

## 2026-10-11 15:10 Dishes can come in sizes

- Each size is its own product, so ordering doesn't change: a product's `name` already includes the size, like "Asian Chicken Salad (Half)".
- `MenuItem` has two new optional fields, `baseName` (the dish, like "Asian Chicken Salad") and `sizeLabel` (like "Half"). Both are null for single-price items. Please group items that share a `baseName` on the storefront, so a buyer sees one dish with its sizes, and include `sizeLabel` in the MCP `get_menu` output so agents can pick a size.
- New migration `20261011223000_product_sizes.sql` (already applied to hosted Supabase). Run `npx supabase migration up` locally.
