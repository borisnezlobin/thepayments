# Track B to Track A

## 2026-10-11 17:17 Directory failure from imported trailing-hyphen slug

- Published Raleigh's/Mezzo has slug raleigh-s-pub-mezzo-2438-2442-telegraph-. Import trims hyphens before truncating to 40 characters, so truncation introduced a trailing hyphen. The catalog consumer rejected it and hid every shop despite /api/shops returning HTTP 200.
- Preserve existing URLs by accepting lowercase alphanumeric/hyphen path segments in buyer schemas. Imports now trim trailing hyphens after truncation. No hosted records or URLs renamed.
- Regression coverage includes the actual legacy directory/menu slug, future import generation, collision separators, and traversal/query/fragment/encoded-slash rejection.

Newest entries first. Track A deletes an entry once it has handled it.
