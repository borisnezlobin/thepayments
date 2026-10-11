import type { Address, Hex } from "viem";
import type {
  Repository,
  Shop,
  Product,
  StoredWallet,
  Order,
  Intent,
  Payment,
} from "./types";
// Explicit fixture adapter. Never use for deployed payments: state disappears on restart.
export class MemoryRepository implements Repository {
  readonly shops = new Map<string, Shop>();
  readonly products = new Map<string, Product>();
  readonly buyers = new Map<string, Address>();
  readonly wallets = new Map<string, StoredWallet>();
  readonly intents = new Map<string, Intent>();
  readonly orders = new Map<string, Order>();
  readonly nonces = new Map<string, number>();
  readonly clients = new Map<string, Payment>();
  async getShop(slug: string) {
    return this.shops.get(slug) ?? null;
  }
  async getProducts(shopId: string, ids: string[]) {
    return ids.flatMap((id) => {
      const p = this.products.get(id);
      return p && p.shopId === shopId ? [p] : [];
    });
  }
  async getBuyerAddress(id: string) {
    return this.buyers.get(id) ?? null;
  }
  async saveWallet(wallet: StoredWallet) {
    this.wallets.set(wallet.id, structuredClone(wallet));
  }
  async getWallet(id: string) {
    return this.wallets.get(id) ?? null;
  }
  async findWallet(address: Address) {
    return (
      [...this.wallets.values()].find(
        (w) => w.walletAddress.toLowerCase() === address.toLowerCase(),
      ) ?? null
    );
  }
  async claim(intent: Intent) {
    const existing =
      this.intents.get(intent.key) ??
      [...this.intents.values()].find(
        (i) => intent.checkoutKey && i.checkoutKey === intent.checkoutKey,
      );
    if (existing) return { created: false, intent: structuredClone(existing) };
    this.intents.set(intent.key, structuredClone(intent));
    if (intent.order)
      this.orders.set(intent.order.id, structuredClone(intent.order));
    return { created: true, intent: structuredClone(intent) };
  }
  async getCheckout(key: string) {
    return structuredClone(
      [...this.intents.values()].find((i) => i.checkoutKey === key) ?? null,
    );
  }
  async startHosted(key: string, startBlock: string) {
    const i = this.intents.get(key);
    if (!i || i.state !== "reserved")
      throw new Error("Invalid hosted transition");
    Object.assign(i, { state: "hosted", startBlock });
  }
  async recordHostedHash(key: string, txHash: Hex) {
    const i = this.intents.get(key);
    if (!i || i.state !== "hosted" || (i.txHash && i.txHash !== txHash))
      throw new Error("Invalid hosted state");
    i.txHash = txHash;
  }
  async getIntent(key: string) {
    return structuredClone(this.intents.get(key) ?? null);
  }
  async prepare(key: string, rawTx: Hex, txHash: Hex) {
    const i = this.intents.get(key);
    if (!i || i.state !== "reserved")
      throw new Error("Invalid intent transition");
    Object.assign(i, { rawTx, txHash, state: "prepared" });
  }
  async complete(key: string) {
    const i = this.intents.get(key);
    if (!i || !i.txHash || i.state === "reserved")
      throw new Error("Unprepared payment");
    i.state = "confirmed";
    if (i.order) {
      i.order.status = "paid";
      i.order.paidAt = new Date().toISOString();
      i.order.txHash = i.txHash;
      this.orders.set(i.order.id, structuredClone(i.order));
    }
    if (i.withdrawal) {
      i.withdrawal.status = "sent";
      i.withdrawal.txHash = i.txHash;
    }
    return structuredClone(i);
  }
  async getOrder(id: string) {
    return structuredClone(this.orders.get(id) ?? null);
  }
  async allocateNonce(address: Address, chainNonce: number) {
    const key = address.toLowerCase(),
      nonce = Math.max(chainNonce, this.nonces.get(key) ?? 0);
    this.nonces.set(key, nonce + 1);
    return nonce;
  }
  async getClientPayment(key: string) {
    return structuredClone(this.clients.get(key) ?? null);
  }
  async saveClientPayment(key: string, payment: Payment) {
    if (!this.clients.has(key)) this.clients.set(key, structuredClone(payment));
    return structuredClone(this.clients.get(key)!);
  }
}
