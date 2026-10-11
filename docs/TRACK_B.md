# Track B: AUSD payments

## 2026-10-11 14:54 Hosted migrations and encrypted wallets verified

- Correct production Supabase project: `ksjlraadfpumdojlrwgz` (`https://ksjlraadfpumdojlrwgz.supabase.co`). Both Track B migrations are applied. Only their two versions were added; existing shared records and Track C policies were unchanged.
- Imported the encrypted treasury, buyer, merchant and dedicated testnet off-ramp records using insert-only operations. A separate read-only check decrypted all four with the original wallet master key. No existing vault record or shared buyer/shop record was overwritten.
- Boris can set `TESTNET_OFFRAMP_ADDRESS=0x13F9D8D653cCe3A783A974C8190C4d1b912F1A62`. This is a separate Base Sepolia test wallet; it does not represent a bank payout. Its private key is encrypted in the hosted vault.
- Latest main through `624af91` is integrated. Instinct retains Track C secure login, pending request and owner-only approval. No duplicate wallet/receipt implementation is needed.
- Use normal buyer signup, merchant onboarding, owner wallet provisioning and Track C agent authorization. No special production accounts, hardcoded buyer/shop references or fixture catalog data are required. Existing encrypted testnet wallet records are operator infrastructure and do not create buyer/merchant application records.
- Boris approves merging once the code checks pass and the PR is mergeable. Keep `PAYMENTS_CHECKOUT_ENABLED=false` until production Supabase API credentials, the original vault key, treasury reference, approved origins and normal purchase flow are verified. Production setup gates enabling payments, not merging code. No demo-ID environment variables are required.
- All 54 root tests, 27 payment/PostgreSQL tests, six Playwright tests, lint, both TypeScript checks and the webpack production build pass. The authenticated local owner/agent regression reuses the existing settled checkout and passes cap, duplicate, withdrawal-denial and revocation checks without another charge.

### Hosted operator commands

Run these from `packages/track-b`. The ignored `.env.hosted` contains the approved project connection and the original wallet encryption key. Commands never print keys or connection strings.

```sh
npm run hosted-audit
npm run hosted-wallets -- --check
```

`hosted-wallets -- --prepare` creates the dedicated encrypted testnet off-ramp once and configures only local public wallet references. `hosted-wallets -- --import` inserts missing encrypted records, stops on identity/key conflicts, and verifies stored records afterward. It never overwrites existing wallets, creates Auth users, associates shared buyer/shop rows, funds a wallet or signs a payment. The application still requires the project's server-only Supabase API key. Configure it in ignored `.env.hosted` for operator runtime checks and in Vercel for production; never use `NEXT_PUBLIC_` for the API secret or encryption key.

Track B implements `lib/payments`, x402 orders and public order status. Track A's balance/withdrawal routes and screens are preserved. Shared models and per-item discount rounding are used. Work stays on `feat/track-b-payments` as explicitly requested.

## Verified configuration

Direct contract reads on Base Sepolia confirmed the following on October 11, 2026:

| Setting            | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| x402               | v2, `exact`, `eip3009`                                               |
| Network / chain ID | `eip155:84532` / 84532                                               |
| AUSD               | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`                         |
| Decimals           | 6; 1 cent = 10,000 units                                             |
| EIP-712            | **Agora Dollar**, version **1**                                      |
| ERC-20 name        | AUSD (not the signing domain name)                                   |
| Domain separator   | `0x5a85328c8aae02b57a5bc1fb1848cb2fb9ccbdc204c554a4db199b13fed1e8bb` |
| Faucet             | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C`                         |
| Faucet function    | `requestFunds(address recipient)`                                    |

The deployed token's verified explorer ABI has both the bytes-signature and v/r/s overloads of `transferWithAuthorization`. The code uses v/r/s, matching the SDK. The deployed faucet call was successfully simulated with the treasury as recipient. Before chain operations, both rails check chain ID, decimals and domain separator. Requirements explicitly name AUSD; no SDK dollar-price shortcut can default to USDC.

Pinned dependencies: x402 core/EVM 2.28.0, viem 2.57.4, Supabase JS 2.117.3. The official ExactEvmScheme signs authorizations and verifies local payments. Hosted transport follows the official v2 `/verify` and `/settle` bodies.

Official references:

- [Agora deployments](https://docs.agora.finance/developer/contract-deployments)
- [Agora ERC features](https://docs.agora.finance/developer/advanced-erc-features)
- [Agora faucet guide](https://docs.agora.finance/instant-settlement/guides/getting-testnet-tokens)
- [Deployed token ABI](https://base-sepolia.blockscout.com/api/v2/smart-contracts/0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC)
- [x402 v2 specification](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md)
- [Exact EVM scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md)
- [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc)
- [Supabase explicit grants change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

## Settlement and idempotency

Hosted mode is the default, starting with `https://x402.org/facilitator`. Its `/supported` advertises v2 Exact on Base Sepolia. **AUSD settlement is now proven on Base Sepolia.** With explicit user approval, an unfunded buyer's valid 5-AUSD authorization was sent to `/verify`; it returned `isValid:false` and `invalid_exact_evm_token_name_mismatch`, including a transfer simulation revert. That unfunded diagnostic was inconclusive. After funding, the same verified domain successfully settled both treasury funding and checkout; do not change it to AUSD. CDP requires authentication not yet implemented by this transport, and PayAI has not been tested.

A hosted intent persists the original payment, order snapshot and starting block before `/settle`. Returned transaction hashes are saved and verified on chain. If the response is lost, retries search `AuthorizationUsed` logs from the saved block and recover the hash. A successful receipt, two confirmations, exact AUSD Transfer (payer/merchant/amount), and matching AuthorizationUsed (payer/nonce) are required before atomically marking an order paid. Signature verification alone never marks it paid.

Local mode runs a self-hosted relayer inside the Node server: verify using the SDK, simulate ERC-3009, allocate a dedicated relayer's nonce in Postgres, sign and **save exact transaction bytes before broadcasting**. A retry rebroadcasts the same bytes. The relayer pays gas for buyer funding, checkout and merchant withdrawals. Buyer and merchant need no ETH. No public gas-spending facilitator route is exposed.

Use a stable `Idempotency-Key` on both checkout requests, or echo the key returned with the 402 challenge. Allowed keys contain 8–128 letters, digits, underscores or hyphens. A fresh signature for the same checkout/payer/body returns or reconciles the original order. Changed bodies cannot reuse that checkout. Authorization nonces are additionally unique by network, token and payer.

`payX402` persists the authorization before the paid retry. Pass a new checkout ID for each intentional purchase and reuse it across retries. Without an explicit key, identical wallet/URL/body calls deduplicate indefinitely. Never create a fresh checkout automatically after a timeout.

Known recovery limits: an intent stuck in `reserved` before durable preparation fails closed with 409 and requires operator inspection. Allocated-but-unbroadcast local relayer nonces can leave gaps requiring repair. Never clear the journal/nonce ledger without checking chain state. Use a dedicated relayer account exclusively for this service. Very long hosted reconciliation ranges may exceed RPC log limits and need bounded manual scans. Do not change rails for an unresolved intent.

## Database and environment

Apply `supabase/migrations/20261011194144_track_b_payments.sql` and `20261011201257_track_b_buyer_wallets.sql` after the team's initial migration to a development project. If the database already ran later team migrations, use `npx supabase migration up --local --include-all`; this was verified against the running local stack. Keep already-applied migration versions unchanged. It adds four Track B tables and service-only RPCs with RLS, explicit grants and no public policies. No existing migration is edited. Wallet storage uses AES-256-GCM with wallet ID and address as authenticated data.

A claim atomically inserts the journal and `awaiting_payment` order with pickup name, named items, discounted unit prices and `payment_nonce`. Completion atomically sets `status=paid`, `tx_hash` and `paid_at`; withdrawals become `sent`. Track A's existing 2-second inbox polling sees paid orders.

Server-only variables (also in root `.env.example`):

| Variable                              | Requirement                                                             |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Team's development DB credentials                                       |
| `PAYMENTS_ENCRYPTION_KEY`             | 32-byte hex without 0x; securely retain it                              |
| `BASE_SEPOLIA_RPC_URL`                | Defaults to https://sepolia.base.org; wrong chain refused               |
| `PAYMENTS_FACILITATOR_MODE`           | hosted (default) or local                                               |
| `HOSTED_FACILITATOR_URL`              | Defaults to x402.org; HTTPS required                                    |
| `TREASURY_WALLET_ID`                  | Preferred encrypted treasury ID for fundBuyer                           |
| `TREASURY_PRIVATE_KEY`                | Optional securely provisioned alternative                               |
| `FACILITATOR_PRIVATE_KEY`             | Only local mode; ETH-funded dedicated testnet relayer                   |
| `TESTNET_OFFRAMP_ADDRESS`             | Testnet withdrawal recipient; bank deposit is a stub                    |
| `PAYMENTS_ALLOWED_ORIGINS`            | Comma-separated exact payment origins; defaults to NEXT_PUBLIC_SITE_URL |

No secrets use `NEXT_PUBLIC_`. Public payment exports import `server-only`.

## First real 5-AUSD payment

Four wallets were created locally; private keys are encrypted in ignored `packages/track-b/.local/wallets.json`. The master key is in ignored package `.env` (mode 0600). Preserve both securely. Public identities are in `.local/addresses.json`. Setup does not rotate existing wallets.

| Purpose       | Public address                               | Funding                                                   |
| ------------- | -------------------------------------------- | --------------------------------------------------------- |
| Treasury      | `0x1f431DBAd3FC68268ee1299e0477c96CC64C0972` | Base Sepolia ETH for faucet; receives 10,000 testnet AUSD |
| Local relayer | `0x7D53Cc1159f4C8f2F8A6bE1d32086841384Dbd5C` | Base Sepolia ETH if using local settlement                |
| Buyer         | `0x765C18522496620Fd4574a3BBa6aac6BC1a0a0B0` | 100 AUSD distributed by fundBuyer                         |
| Merchant      | `0x125dE09d79f5F56f733505c1dDaaF39569F93F38` | Receives 5 AUSD; no initial funding                       |

The sponsor confirmed 10,000 testnet AUSD per faucet request. The caller needs gas to call `requestFunds(treasuryAddress)`. [Google's faucet](https://cloud.google.com/application/web3/faucet) dispenses native test tokens; its documented Ethereum Sepolia option funds chain 11155111, not Base Sepolia. Select Base Sepolia if available; otherwise choose a Base Sepolia faucet from [Base's official list](https://docs.base.org/base-chain/tools/network-faucets). Do not buy real ETH. Hosted checkout gas is paid by the facilitator; local mode also needs ETH in the relayer.

From repository root:

```sh
npm ci
npm --prefix packages/track-b ci
npm --prefix packages/track-b run check-funding
npm --prefix packages/track-b run faucet
npm --prefix packages/track-b run live-demo
```

`faucet` persists signed transaction bytes before broadcast and waits for confirmation. `live-demo` funds the buyer with 100 AUSD and performs a 5-AUSD payment using explicit AUSD x402 requirements and 0% discount. It defaults to x402.org; set `PAYMENTS_FACILITATOR_MODE=local` in the ignored package `.env` for the local alternative. It prints transaction hash, explorer URL, paid order and merchant chain balance when successful. It keeps a durable journal and result in `.local/` under an exclusive process lock.

This proof uses an in-process HTTP Request/Response flow and local catalog/order fixtures. It proves real chain settlement when funded, **not deployed Supabase integration**. Never deploy the fixture repository.

For the app: configure Supabase in the package `.env`, then run `node --env-file=.env --import tsx scripts/import-wallets.ts` from `packages/track-b` to import encrypted wallets. Configure the server with the same encryption key and the reported treasury wallet ID. Publish a shop with Track A, create/fund its buyer through Track C, and set the demo shop/product/buyer-wallet IDs for `npm --prefix packages/track-b run demo` to pay the real app route.

Confirmed live evidence (October 11, 2026):

| Action                                             | Transaction                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Faucet transfer: 10,000 AUSD to treasury           | [0x2a54567ef726440a211e1af8761750767233aca2341b404cc1c54ddb4e2adfcc](https://sepolia.basescan.org/tx/0x2a54567ef726440a211e1af8761750767233aca2341b404cc1c54ddb4e2adfcc) |
| Hosted ERC-3009 funding: 100 AUSD treasury → buyer | [0xfdd45a36eca3b8919092314b49555c289a4aabcf0d92aff362def3cd9e03f143](https://sepolia.basescan.org/tx/0xfdd45a36eca3b8919092314b49555c289a4aabcf0d92aff362def3cd9e03f143) |
| Hosted x402 checkout: 5 AUSD buyer → merchant      | [0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173](https://sepolia.basescan.org/tx/0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173) |

Receipt status, two confirmations, exact Transfer and matching AuthorizationUsed events were verified before marking the fixture order paid. An independent Blockscout query reported status ok at block 47990410. Repeating the same live demo returned the same funding and checkout hashes, with no further debits. Balances afterward: treasury 9,900 AUSD, buyer 95 AUSD, merchant 5 AUSD. Treasury ETH remaining: 0.00009949342599991. The hosted facilitator paid gas; no buyer or merchant ETH was required.

## Track A integration

Preserved interfaces: `createWallet(): {address}`, `getBalance(shop): number` in cents, `withdraw(shop, amountCents): Withdrawal`, and `explorerUrl(txHash)`. Wallets also return an optional id. The existing protected API wrappers and merchant screens are unchanged.

Withdrawals return `sent` and a hash only after verified settlement. An optional third withdrawal argument supplies a stable idempotency key. Legacy calls derive it from shop, amount and last sent withdrawal, allowing later withdrawals after new sales. Reconcile pending failures before initiating another withdrawal.

Orders contain pickup name, named items, discounted `unitPriceCents`, totals, `paid_at`, `chain=base-sepolia`, and hash. Public `GET /api/orders/:id` returns only ID, status, chain, hash, total, paid time and explorer URL, without buyer or pickup details.

## Track C integration

Call only from server code:

```ts
const wallet = await createWallet();
// Store wallet.address in buyers.wallet_address; optionally store wallet.id.
await fundBuyer(wallet, 1000, `initial-funding-${buyer.id}`);
const result = await payX402(
  wallet,
  `${origin}/api/shops/${slug}/orders`,
  {
    buyerId: buyer.id,
    pickupName: "Alex",
    items: [{ productId, qty: 1 }],
  },
  { idempotencyKey: checkoutId },
);
// {orderId, order, txHash, explorerUrl}
```

Generate checkoutId once and preserve it through MCP/HTTP retries. Derive buyer ID from the authenticated server session, not browser input. If supplied, buyerId must match the signed wallet. Anonymous external agents can omit it.

External clients POST product IDs, quantities and pickupName. 402 returns JSON plus base64 PAYMENT-REQUIRED and Idempotency-Key. Retry with base64 PAYMENT-SIGNATURE and the same checkout key. Success returns the paid Order and PAYMENT-RESPONSE. Agent-supplied prices are rejected. EOA buyer wallets are implemented; ERC-1271 buyer-wallet integration and XRPL are not.

## Tests and limits

The test suite verifies real cryptographic SDK signatures, invalid signatures/domains/amounts, checkout retries with fresh signatures, concurrent requests, failed settlement, hosted response-loss reconciliation, required receipt events, balances, wallet encryption, funding and withdrawals. Embedded PostgreSQL executes the actual shared initial schema and Track B migration, testing RLS/grants, atomic claim/confirmation and nonce allocation.

Lint and type checks pass. `npm run build -- --webpack` passed. Default Turbopack was blocked by a CSS worker's inability to bind a local port in this environment. Production and Track B tooling dependency audits are clean; inherited app development dependency advisories remain.

Verified locally: actual Supabase RPC integration, authenticated buyer checkout with JavaScript disabled, owner-scoped receipt/history/balance and Track A inbox polling. Hosted cloud deployment and direct MCP spending remains intentionally unsupported. Also incomplete: CDP authentication/PayAI fallback validation, automated reserved-intent/nonce-gap recovery, smart contract buyer wallets, XRPL and bank conversion.

## Questions for Agora

1. Which facilitator has confirmed support for the Base Sepolia domain Agora Dollar / 1?
2. Does the hosted name-mismatch diagnostic mislabel an insufficient-balance simulation revert?
3. What are faucet cooldowns, and can the sponsor supply Base Sepolia gas if faucet signup is slow?
4. Are ERC-1271 overloads and authorization events stable across proxy upgrades?
5. What US merchant eligibility and dollar off-ramp should be described after the testnet demo?

## Shared application integration and real browser proof

The feature branch now connects Track C's existing checkout seam instead of using the fixture repository. Wallet provisioning is atomic through `track_b_assign_buyer_wallet`; an existing wallet is preserved. Buyer identity comes from Track C's verified owner/agent principal. New checkouts compare authoritative catalog prices to `expectedTotalCents` before wallet creation or funding. Retry uses the persisted authorization even if the menu later changes. Buyer wallet balance is checked on chain; the treasury can fund new wallets once per buyer when explicitly enabled.

HTML checkout redirects to `/orders/:id` after verified settlement. Receipts are queried by both order ID and authenticated buyer ID. Account pages show the actual chain balance and paid order history. Failed HTML checkout preserves the same input/key in its retry form. Wrong origin, forged buyer IDs and edited checkout bodies are rejected. The normal-site referrer policy now permits browser form Origin headers; private `/agent/**` and `/m/**` capability routes retain no-referrer. This fixes the no-JavaScript login failure without accepting null/cross-site origins. [Origin header behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin).

Real website payment:

- Order: `65c09301-874b-46af-b4cb-67d5a82e9c53` in the running local Supabase database.
- Transaction: [0xeb14a96553a2911776c36531e77b84eecaaead675825acced4da54809956e078](https://sepolia.basescan.org/tx/0xeb14a96553a2911776c36531e77b84eecaaead675825acced4da54809956e078).
- 5 AUSD from the same buyer wallet to the same merchant wallet, settled by x402.org; receipt/events independently checked.
- The signed-in browser had JavaScript disabled. Track A's dashboard was already open and received the order via its existing two-second polling.
- Repeating the checkout returned the same order/hash. Changed pickup name, changed displayed price, forged buyerId and wrong-origin submissions were rejected. No replay debits occurred.
- Current balances after both checkout proofs: treasury 9,900 AUSD, buyer 90 AUSD, merchant 10 AUSD. No additional treasury ETH is needed for hosted checkout.

### Team setup and acceptance procedure

1. Review PR #1 and the feature branch. The human explicitly requested no main merge; handoff requests to merge do not override that instruction.
2. Apply both Track B migrations to the team's development database. Use `--include-all` for local databases with later migration versions. Do not reset teammates' data or rename migrations already applied to this local stack.
3. Set the required server variables above. Set `PAYMENTS_CHECKOUT_ENABLED=true`. For signup/first-checkout demo funding, set `PAYMENTS_AUTO_FUND_BUYERS=true` and configure the encrypted treasury ID or secure treasury key. Wallets are provisioned on the first valid checkout, not on every page load. Every environment must use the same encryption key as its stored wallet ciphertext.
4. Track A can use its existing protected balance/withdrawal routes and polling inbox unchanged. **Older placeholder merchant addresses are not in the vault. Republishing alone preserves those non-null addresses.** Create a fresh demo shop, or deliberately clear/replace an unfunded placeholder only after checking that no payments are pending. Never replace a funded or user-owned wallet automatically.
5. Track C's seam, buyer API, storefront button, account page and owned receipt are wired on this branch. These are the necessary integration edits; Auth/session/agent-link logic remains intact. Do not duplicate the implementation independently on main. Track C’s authenticated MCP `place_order` creates owner-approval requests; it does not pay directly.
6. Configure Auth Site URL/redirects for the team's actual app origin. Sign up and confirm email if required. Publish a live shop with a real managed wallet. Choose one product, update the total, enter a pickup name and pay. Check the owned receipt's Basescan link, the `orders` row's paid status/hash/time and the merchant board's update. Repeat the same checkout key and confirm order/transaction counts remain one.

To reproduce the completed local test, keep Docker and the started Supabase stack running. The ignored root `.env.local` is already configured for `http://127.0.0.1:3102`. Start `npm run dev -- --webpack --hostname 127.0.0.1 --port 3102`, then run `npm --prefix packages/track-b run browser-e2e`. Private test credentials and merchant capabilities are retained only in ignored `.local/` files. The browser script replays its existing checkout by default and does not charge again. `setup-app-test` is a development-only fixture initializer; it refuses to replace an existing `.env.local`.

Final validation: 54 app unit tests plus 26 Track B tests, actual PostgreSQL migration/RLS checks, actual local Supabase RPCs, real chain transfers, no-JavaScript browser checkout, merchant polling, receipt ownership filtering and duplicate/invalid submission checks. Lint and both TypeScript checks pass. The complete integrated production build passes with `npm run build -- --webpack`. Default Turbopack remains affected by its worker port restriction in this execution environment. No production deployment or main merge occurred.

Remaining limits: hosted cloud/Auth email configuration, direct MCP spending, smart-contract buyer wallets, XRPL, bank off-ramp conversion and automated recovery of reserved local-relayer nonce gaps. Configure TESTNET_OFFRAMP_ADDRESS before demonstrating withdrawals; the hosted rail pays their gas but the bank deposit remains a stub.

## Instinct phone browser deployment handoff

Use Track C's existing private `/agent/:token` link. Track B does not create another login system. The account owner creates the link on `/account`; Instinct opens it in its own browser and presses **Connect for ordering**. Its HttpOnly cookie resolves the existing buyer grant on every checkout. Revoked, expired or replaced grants fail authentication. Agent sessions cannot open account management, create links, approve their own requests or use merchant withdrawal APIs. The buyer payment API accepts no wallet address, private key, destination URL or transfer instruction.

`POST /api/buyer/orders` accepts the existing validated form or JSON contract: `shopSlug`, `items` (product IDs and quantities), `pickupName`, `expectedTotalCents`, `idempotencyKey`. The server derives buyer identity from Track C's principal. It re-prices the products from Supabase and binds the signature to the shop's stored merchant wallet, AUSD token, Base Sepolia network and exact amount. Private keys remain encrypted in the server vault. An agent submission first becomes a pending Track C order request. Only the authenticated owner’s Approve action can transition it to approved and invoke payment. Signing and hosted x402 settlement happen server-side; Instinct needs neither MetaMask nor a blockchain signature screen.

Fresh browser purchases have a default **25 AUSD per-purchase cap**. Set `PAYMENTS_BROWSER_MAX_ORDER_CENTS` to a positive integer of at most 10000 (100 AUSD); invalid configuration fails closed. The on-chain pre-funded wallet balance is the remaining total spending budget, not a daily allowance. Agent checkouts never create a wallet or call treasury funding, even if owner auto-funding is enabled. To increase an agent's total budget, the operator must explicitly fund the buyer. Original authorized retries remain reconcilable after the cap or catalog changes; they do not create another charge.

Before giving Instinct a link, provision the verified buyer profile's wallet through the operator-only CLI. Configure the ignored package `.env` with the target Supabase server credentials, vault encryption key and funded treasury ID. Then run:

```sh
npm --prefix packages/track-b run provision-buyer -- VERIFIED_AUTH_BUYER_UUID 1000
```

This funds 10 AUSD, returns only public wallet/transaction information and preserves any existing managed wallet. Identical commands reuse the same funding intent. To provision the demo with 100 AUSD, pass `10000` cents instead. Changing the amount intentionally creates a separate funding intent. There is no browser funding endpoint. The existing local demo buyer is already funded; do not fund it again merely to replay the test.

For a real phone, deploy the reviewed integrated application to **https://thepayments.vercel.app** with the team's Supabase project and imported encrypted wallets. Configure `APP_ORIGIN`, `NEXT_PUBLIC_SITE_URL` and `PAYMENTS_ALLOWED_ORIGINS` to that exact production origin; configure Supabase Auth Site URL and callbacks accordingly. Enable `PAYMENTS_CHECKOUT_ENABLED=true`, retain hosted mode and set the spending cap. localhost on the developer machine is not reachable from the phone. The production homepage is publicly accessible; no Vercel settings were changed. Track B has not deployed this integration or verified the production payment environment.

Phone acceptance: owner funds the buyer and creates a link; Instinct opens/connects in its own browser, chooses items, updates the total and enters pickup name. Instinct asks the human to approve the shop/items/total before pressing Pay. The server also requires the authenticated owner to approve the request on `/account`. The approved payment hook rereads the owner-scoped canonical request before signing; supplied request fields cannot change the approved amount or items. A paid receipt must show a verified Basescan transaction. Track A's dashboard must show the same paid order. Retry the identical checkout and confirm the same order/hash; preserve the key on timeouts. A newly generated key represents a new purchase, so do not refresh the storefront to retry an uncertain payment.

Regression proof additionally creates a real Track C agent link through the owner's existing UI, connects a fresh browser, replays the settled purchase, checks the 25-AUSD cap and withdrawal/account denial, revokes the link and verifies checkout then returns 401. No extra charge is made. Local Supabase security advisors report no warning/error issues.

## Latest security review and release status

The integrated branch preserves Track C’s latest request/approval system from main. Agents submit held requests; only the authenticated owner pays. The approval hook now takes the verified buyer ID and rereads the canonical owner-scoped request. Its wallet, approved items/amount, merchant catalog and original checkout ID feed Track B’s durable x402 client. Approved requests remain visible with **Check payment** after a timeout; retries reconcile the original intent. Direct owner checkout stays available. Fresh-browser testing exercised pending request → owner approval → original settled order/hash, with one order and no additional debit.

Agent grants now expire after one hour. Resolution also enforces the one-hour lifetime from `created_at` on older rows with longer `expires_at`. Revocation/replacement remain Track C’s existing mechanisms. The 25-AUSD purchase cap and pre-funded wallet budget are enforced server-side. Account owner and agent may spend concurrently within the on-chain wallet balance; this is not a per-day allowance.

Checkout now rejects merchant addresses absent from the encrypted vault or whose key cannot be decrypted. No existing address is overwritten. The actual local demo merchant has a usable encrypted key. Production must provision/import its managed merchant wallet before accepting a purchase.

Withdrawal API now requires a persistent `Idempotency-Key`. The merchant UI saves that key across retries/reloads and offers **Check withdrawal** even after the balance has been debited or become unavailable. The backend recovers the original withdrawal intent/amount before consulting the chain balance. Tests verify the same withdrawal ID/hash after debit and an RPC outage. The bank off-ramp remains a testnet stub; configure a fixed testnet destination before enabling that part of a demo.

Track A’s inbox now isolates chain-balance failure: paid orders and sales summary still load, balance is explicitly null/unavailable and new withdrawals are disabled. This is a narrow integration fix handed back to Track A, with a regression test; no balance is fabricated.

Production `/api/shops` was checked directly and returned HTTP200 with `[]` at 2026-10-11 21:01UTC. The earlier500 no longer reproduces. Track A must publish a real demo shop and available products. The connected Supabase project `B@B proj` does not contain `public.shops` or this application’s migrations, so it cannot be assumed to be the production database. Identify the project referenced by Vercel’s SUPABASE_URL before applying any migration; do not install app tables in an unrelated project. Hosted payment schema/permissions, encrypted wallet imports and Vercel payment secrets remain release gates. Local migrations, RLS/RPC tests and security advisors pass.

Apply the initial shared migration, Track C agent-link and approval migrations, default-discount migration and both additive Track B migrations to the confirmed hosted target. Preserve migration history; use the team’s process to include missing lower timestamp versions. Configure APP_ORIGIN, NEXT_PUBLIC_SITE_URL and PAYMENTS_ALLOWED_ORIGINS to `https://thepayments.vercel.app`; configure Supabase Auth callbacks and server-only keys. Enable checkout only after wallet provisioning and this environment verification. Never send secrets or private capability links to a repository handoff or chat.

The user subsequently authorized merging only after passing tests, no conflicts and no unresolved integration/security blockers. Hosted target/environment verification is still a release gate. No merge or production deployment has been performed. PR#1 is the handoff to review; avoid independently rebuilding the wallet, checkout or receipt implementations already included here.

Agent confirmation pages refresh through the approved/payment-in-flight state, then offer View paid receipt. The browser regression is repeatable against its already-paid approval request and verifies that receipt without generating a fresh checkout or debit. Corrected PR revision ca933c9 passed the Vercel preview deployment; the final confirmation revision is checked separately before handoff.
