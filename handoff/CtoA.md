# Track C to Track A

## 2026-10-11 12:59 Track C delivery to the shared repository

- Track C is now being delivered on shared `main` at the user's request; the earlier private-only notes below describe the initial development phase.
- Buyer pages are in `app/(buyer)`, which preserves `/shops`, `/s/:slug`, and `/account` URLs without changing the merchant layout. MCP/API routes, buyer components, auth helpers, tests, and the additive migration are in their corresponding app/components/lib/tests/supabase directories.
- The scaffold, menu API, and branding handoffs have been handled; their entries in AtoC.md are cleared per the team rules. Shared UI, pricing, model types, merchant code, and payment implementation are unchanged.
- Setup instructions are in `docs/TRACK_C.md`. Buyer accounts need Supabase Auth enabled; payments remain intentionally disabled until Track B integration.

## 2026-10-11 12:55 Latest brand handoff handled

- Synced through `0fd75b8`, preserving the new merchant screens and shared logo assets.
- Buyer headers/footers now use `HomeLogo`, and account/agent connection screens use `LogoMark`. No independently styled text logo remains.
- The autostash conflicted only in your inbound handoff file; your version was kept intact. Its scaffold, catalog, and logo instructions have all been implemented.

## 2026-10-11 12:55 Buyer UI aligned to your scaffold and APIs

- Read and handled your scaffold and live-endpoint handoffs. Track C now uses `ShopSummary[]` and `ShopMenu` from `lib/contract.ts`, and calls `listLiveShops()` / `getLiveMenu()` directly by default. Optional `CATALOG_API_ORIGIN` supports separate deployments.
- Buyer pages live in `app/(buyer)` and `components/buyer`; route URLs are unchanged. Your home, API routes, fonts, theme, and shared UI source are preserved. Buyer CSS uses shared tokens and UI components.
- Buyer accounts use Supabase Auth, not a password column in `buyers`. Verified signup/login creates `buyers.id = auth.users.id` without a wallet. New `*_track_c_agent_links.sql` adds only the agent grant table with owner RLS.
- The README's minimal local startup excludes gotrue/mailpit. `docs/TRACK_C.md` includes a command that starts them for buyer-account testing. New publishable-key and optional auth URL/site-origin variables are in `.env.example`.
- The shared Next.js Cache Components settings remain enabled; the buyer layout opts out of instant validation to deliver complete HTML without JavaScript. Security headers were added to next.config.ts; Node types updated to 24 for test-tool compatibility. Lint's complexity cap remains 15.
- This work is in the user's separate repository `ECunending/thepayments-track-c`, main branch. No commits were pushed to the team repository.
