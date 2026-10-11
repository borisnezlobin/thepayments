<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# The Payments: team rules for every agent

Three teammates build in parallel, each with their own coding agent. Track A is the merchant side, Track B is payments and the chain, and Track C is the buyer side and agents. [PLAN.md](PLAN.md) says what each track builds.

## Git: one branch, pull constantly

- Work on `main` only. Never create branches or pull requests.
- Run `git pull --rebase --autostash` before you start a task, before every commit, and whenever you see new commits on `origin/main` (`git fetch && git status -sb`).
- Commit small and push right away. A push that is rejected means someone pushed first: pull with rebase, re-run the build, push again.
- `npm run build` and `npm run lint` must pass before you push. Lint caps cyclomatic complexity at 15.
- If a rebase conflicts in a file another track owns, keep their version and tell them in their handoff file.

## Handoff files: how tracks talk to each other

`handoff/` holds one file per direction: `AtoB.md` is Track A writing to Track B, `CtoA.md` is Track C writing to Track A, and so on.

- After every pull, read the files addressed to your track (`handoff/*to<your track>.md`) and act on anything new.
- Write to a handoff file whenever another track needs to know something: a contract change, a new environment variable, a new migration, an endpoint that is ready, or something of theirs that is broken.
- Add entries at the top as `## YYYY-MM-DD HH:MM <title>` followed by what changed and what they need to do. Commit and push the handoff file immediately.
- The receiving track deletes an entry once it has handled it. Git keeps the history.

## Who owns what

| Path | Owner |
| --- | --- |
| `app/page.tsx`, `app/m/**`, `app/api/shops/import`, `app/api/shops/route.ts`, `app/api/shops/[slug]/route.ts`, `app/api/shops/[slug]/menu`, `app/api/shops/[slug]/inbox/**`, `lib/shops/**`, `components/merchant/**` | A |
| `lib/payments/**`, `app/api/shops/[slug]/orders/**`, `app/api/orders/**`, `app/api/shops/[slug]/balance`, `app/api/shops/[slug]/withdraw` | B |
| `app/s/**`, `app/shops/**`, `app/account/**`, `app/mcp/**`, `app/api/buyer/**`, `components/buyer/**` | C |
| `lib/contract.ts`, `lib/db/**`, `lib/pricing.ts`, `components/ui/**`, `app/globals.css`, `app/layout.tsx`, `supabase/migrations/**` | Shared |

Shared files change additively. Add new fields and functions, and don't rename or remove existing ones without a handoff entry to both other tracks. Each schema change is a new file in `supabase/migrations/`, never an edit to an existing one.

## Design rules

- Use the tokens in `app/globals.css` (`bg-accent`, `text-ink-muted`, `text-body-sm`, `rounded-card`, `shadow-card` and the rest). Don't write raw hex colors or arbitrary sizes.
- Use the components in `components/ui` before writing new markup for a button, field, ticket or status.
- Icons come from `@phosphor-icons/react`. Use `@phosphor-icons/react/dist/ssr` in server components. No emoji.
- Teal `#00BCA8` (`accent`) is a fill and accent only. Teal text uses `accent-ink`, and text on a teal fill uses `on-accent`.
- No all-caps labels and no rounded element with a visible colored border. Subtle form inputs are the one exception. Body text carries `--tracking-body` from the theme. Don't add other letter-spacing.
- No AI-template tells (from the defect.tech standard): no grids of identical cards or small headed lists, no rows of three as a reflex, no gradient washes or glows as decoration, no `→` after button or link text, no eyebrows above headings, no middle-dot metadata strips, no fade-in on every section, no centered-everything layouts. One obvious subject per screen.
- Copy: never join a second clause with ", and" or ", so" (make it its own sentence). No trailing appositions after a colon or dash, no "it's not X, it's Y", no "matters", no hype words, no fragments posing as sentences. Every line carries a fact or an action. Avoid filler words like "seamless", "elevate", "curated", "crafted" and "genuinely".
- Use the theme's named sizes and layouts (`lg:layout-sidebar`, `lg:layout-hero`, `drop-shadow-ticket`) instead of arbitrary values like `grid-cols-[1fr_22rem]`.


## Context.dev (menu import)

- The key lives in `CONTEXT_DEV_API_KEY`, server-side only (`.env.local` locally, Vercel env in production). Never expose it to the browser.
- Every call goes through `lib/shops/contextDev.ts`, which retries 408, 429 and 5xx with bounded backoff and honors `Retry-After`. `lib/shops/importMenu.ts` decides what to call.
- [Scrape](https://docs.context.dev/api-reference/web-scraping/scrape) (`POST /web/scrape`) with the `json` format extracts the menu against the schema in `lib/shops/menuExtraction.ts`. About 1 credit per page, cached for 3 days by default.
- [Map URLs](https://docs.context.dev/api-reference/web-scraping/map) (`GET /web/urls` with `search`) finds the menu page when the pasted page has no items. 2 credits, and it only runs when the first scrape comes back empty.
- The team key has 1,000 free credits a month, so an import costs 1 to 3 credits. Tests must never call the live API.
