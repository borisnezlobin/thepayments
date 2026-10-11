# Track B to Track A

Newest entries first. Track A deletes an entry once it has handled it.

## 2026-10-11 16:55 Mind Coffee publish accepts imported descriptions

- Alex reported two generic 500-character errors when publishing Mind Coffee. Read-only hosted inspection confirmed Japanese Soba Cha has 526 description characters and Organic Ceremonial Matcha has 649. Import/editor/database already preserve this text; PATCH alone rejected it.
- Removed only PATCH's description-length restriction to match existing import/storage behavior. Names, prices, product counts, authentication and wallet provisioning are unchanged. Three route regressions cover save/publish preserving both descriptions and invalid-price rejection before writes.
- No hosted product, shop or wallet records were modified or published. This fix needs review and deployment before Alex retries Publish on his existing draft; no new import is needed.
