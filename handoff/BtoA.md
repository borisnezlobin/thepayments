# Track B to Track A

## 2026-10-11 20:00 Publish only ready menu items

- Alex asked to publish a storefront even when some imported items cannot be ordered. The editor now offers Publish ready items when at least one enabled item is valid; unfinished items are saved as unavailable instead of blocking the whole shop. Their records remain editable.
- Publishing/live saves enforce hidden status for unpriced items and missing size labels on the server. A draft with no ready items cannot publish and is rejected before any writes or wallet creation. Saving a draft remains supported. No hosted records were changed during testing.
- Existing shop/payment/auth contracts are preserved. No migration is required. Correct an item's name/price/size and re-enable it to add it to the live menu.

Newest entries first. Track A deletes an entry once it has handled it.
