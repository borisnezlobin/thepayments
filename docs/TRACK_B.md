# Track B: AUSD payments

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

Apply `supabase/migrations/20261011194144_track_b_payments.sql` after the team's initial migration to a development project. It adds four Track B tables and service-only RPCs with RLS, explicit grants and no public policies. No existing migration is edited. Wallet storage uses AES-256-GCM with wallet ID and address as authenticated data.

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
| Buyer         | `0x765C18522496620Fd4574a3BBa6aac6BC1a0a0B0` | 100 AUSD distributed by fundBuyer                          |
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

| Action | Transaction |
|---|---|
| Faucet transfer: 10,000 AUSD to treasury | [0x2a54567ef726440a211e1af8761750767233aca2341b404cc1c54ddb4e2adfcc](https://sepolia.basescan.org/tx/0x2a54567ef726440a211e1af8761750767233aca2341b404cc1c54ddb4e2adfcc) |
| Hosted ERC-3009 funding: 100 AUSD treasury → buyer | [0xfdd45a36eca3b8919092314b49555c289a4aabcf0d92aff362def3cd9e03f143](https://sepolia.basescan.org/tx/0xfdd45a36eca3b8919092314b49555c289a4aabcf0d92aff362def3cd9e03f143) |
| Hosted x402 checkout: 5 AUSD buyer → merchant | [0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173](https://sepolia.basescan.org/tx/0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173) |

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

Still pending: deployed Supabase RPC integration and the complete authenticated browser/MCP flow. Funded hosted AUSD settlement is verified. Also incomplete: CDP authentication/PayAI fallback validation, automated reserved-intent/nonce-gap recovery, smart contract buyer wallets, XRPL and bank conversion.

## Questions for Agora

1. Which facilitator has confirmed support for the Base Sepolia domain Agora Dollar / 1?
2. Does the hosted name-mismatch diagnostic mislabel an insufficient-balance simulation revert?
3. What are faucet cooldowns, and can the sponsor supply Base Sepolia gas if faucet signup is slow?
4. Are ERC-1271 overloads and authorization events stable across proxy upgrades?
5. What US merchant eligibility and dollar off-ramp should be described after the testnet demo?

Track C delivery at `799c38c` was pulled and reviewed. Its `lib/buyer/checkout.ts` seam, `checkoutEnabled=false`, disabled storefront and unauthenticated MCP spend stub remain unchanged. Connecting that seam requires authoritative expected-total comparison, idempotent buyer-wallet provisioning/funding, authenticated receipt ownership and the remaining account/receipt integration. The funded settlement proof is now available. Those are integration blockers, not completed browser functionality.
