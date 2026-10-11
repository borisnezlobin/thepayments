import { readFile, writeFile, rename, open, unlink } from "node:fs/promises";
import { localWallets } from "./local-wallets.js";
import { MemoryRepository } from "../../../lib/payments/memory.js";
import { createPayments } from "../../../lib/payments/service.js";
import { createHostedRail } from "../../../lib/payments/hosted.js";
import { createRail } from "../../../lib/payments/rail.js";
import { createPaymentHandler } from "../../../lib/payments/http.js";
import { requiredEnv } from "../../../lib/payments/config.js";
import type { Intent, Payment } from "../../../lib/payments/types.js";
import type { Hex, Address } from "viem";
class LocalDemoRepository extends MemoryRepository {
  async load() {
    try {
      const s = JSON.parse(await readFile(".local/payment-state.json", "utf8"));
      for (const i of s.intents as Intent[]) this.intents.set(i.key, i);
      for (const i of this.intents.values())
        if (i.order) this.orders.set(i.order.id, i.order);
      for (const [key, p] of s.clients as [string, Payment][])
        this.clients.set(key, p);
      for (const [key, n] of s.nonces as [string, number][])
        this.nonces.set(key, n);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  async persist() {
    await writeFile(
      ".local/payment-state.tmp",
      JSON.stringify({
        intents: [...this.intents.values()],
        clients: [...this.clients.entries()],
        nonces: [...this.nonces.entries()],
      }),
      { mode: 0o600 },
    );
    await rename(".local/payment-state.tmp", ".local/payment-state.json");
  }
  override async claim(i: Intent) {
    const r = await super.claim(i);
    await this.persist();
    return r;
  }
  override async prepare(key: string, raw: Hex, hash: Hex) {
    await super.prepare(key, raw, hash);
    await this.persist();
  }
  override async startHosted(key: string, block: string) {
    await super.startHosted(key, block);
    await this.persist();
  }
  override async recordHostedHash(key: string, hash: Hex) {
    await super.recordHostedHash(key, hash);
    await this.persist();
  }
  override async complete(key: string) {
    const r = await super.complete(key);
    await this.persist();
    return r;
  }
  override async allocateNonce(address: Address, pending: number) {
    const n = await super.allocateNonce(address, pending);
    await this.persist();
    return n;
  }
  override async saveClientPayment(key: string, payment: Payment) {
    const p = await super.saveClientPayment(key, payment);
    await this.persist();
    return p;
  }
}
// One process holds an exclusive file lock; not a deployed persistence adapter.
const lock = await open(".local/live-demo.lock", "wx", 0o600);
try {
  const { roles, vault, repository: wallets } = await localWallets(),
    repository = new LocalDemoRepository();
  await repository.load();
  for (const w of wallets.wallets.values()) await repository.saveWallet(w);
  const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
  const rail =
    process.env.PAYMENTS_FACILITATOR_MODE === "local"
      ? createRail(rpc, await vault.account(roles.facilitator))
      : createHostedRail(
          rpc,
          process.env.HOSTED_FACILITATOR_URL ?? "https://x402.org/facilitator",
        );
  const shop = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "track-b-demo",
    name: "5 AUSD demo",
    walletAddress: roles.merchant.walletAddress,
    agentDiscountPct: 0,
    status: "live" as const,
  };
  const product = {
    id: "22222222-2222-4222-8222-222222222222",
    shopId: shop.id,
    name: "Coffee",
    priceCents: 500,
    available: true,
  };
  repository.shops.set(shop.slug, shop);
  repository.products.set(product.id, product);
  const payments = createPayments({
    repository,
    rail,
    encryptionKey: requiredEnv("PAYMENTS_ENCRYPTION_KEY"),
    treasury: await vault.account(roles.treasury),
    allowedPaymentOrigins: ["http://localhost:4020"],
  });
  console.log(
    "Treasury",
    await payments.getBalance(roles.treasury.walletAddress),
  );
  console.log("Funding buyer with 100 testnet AUSD from treasury");
  const funding = await payments.fundBuyer(roles.buyer, 10000, "demo-buyer-funding-100-ausd");
  console.log("BUYER FUNDING", JSON.stringify(funding, null, 2));
  const handler = createPaymentHandler(payments),
    fetcher = (async (url: RequestInfo | URL, options?: RequestInit) =>
      handler(new Request(url, options))) as typeof fetch;
  const result = await payments.payX402(
    roles.buyer,
    "http://localhost:4020/api/shops/track-b-demo/orders",
    { pickupName: "Track B test", items: [{ productId: product.id, qty: 1 }] },
    {
      idempotencyKey: process.env.DEMO_ORDER_KEY ?? "first-real-five-ausd",
      fetcher,
    },
  );
  console.log("REAL PAYMENT", JSON.stringify(result, null, 2));
  console.log(
    "Merchant chain balance",
    await payments.getBalance(roles.merchant.walletAddress),
  );
  await writeFile(
    ".local/settlement-result.json",
    JSON.stringify(result, null, 2),
    { mode: 0o600 },
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : "Demo failed");
  process.exitCode = 1;
} finally {
  await lock.close();
  await unlink(".local/live-demo.lock");
}
