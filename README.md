# The Payments

Small shops sell to AI agents and get paid in AUSD over x402, keeping the card fee. The build plan and track ownership are in [PLAN.md](PLAN.md).

## Run it locally

1. `npm install`
2. Start a local database with Docker running: `npx supabase start -x gotrue,realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`. This applies everything in `supabase/migrations`.
3. `cp .env.example .env.local`, then set `SUPABASE_SECRET_KEY` to the secret key that `npx supabase status` prints, and add your `CONTEXT_DEV_API_KEY`.
4. `npm run dev` and open http://localhost:3000.

## Where things live

| Path | What it is | Owner |
| --- | --- | --- |
| `lib/contract.ts` | Shared types every track builds against | Everyone, change together |
| `lib/payments` | Wallets, x402, balance, withdraw. Placeholder until Track B lands. | B |
| `lib/db` | Supabase client and row mappers | Everyone |
| `lib/pricing.ts` | Agent prices and card-fee math | Everyone |
| `components/ui` | Button, Field, Ticket, StatusPill | Everyone |
| `app/globals.css` | Colors, type scale, radii, motion. Use these tokens instead of raw values. | Everyone |
| `supabase/migrations` | Database schema | Everyone, add a new file per change |

`npm run lint` enforces a cyclomatic complexity cap of 15. Treat a failure like a type error.

## Track C: buyer pages and agents

Open `/shops` for the buyer directory, `/account` for buyer accounts, and `/agents` for browser-agent/MCP instructions. Track C uses the shared contract, theme, pricing, and Track A's repository functions. Payment-dependent features remain disabled until Track B is integrated; no demo payment adapter is added.

Buyer accounts use Supabase Auth. The minimal local command above excludes Auth (`gotrue`), so follow [docs/TRACK_C.md](docs/TRACK_C.md) to enable account testing and configure the new additive agent-link migration. [docs/HANDOFF.md](docs/HANDOFF.md) documents the payment integration boundary.

Additional checks: `npm run typecheck`, `npm test`, and `npm run test:e2e` (after building and installing Playwright Chromium).
