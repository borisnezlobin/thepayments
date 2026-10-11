import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Address, Hex } from "viem";
import type {
  Repository,
  Intent,
  StoredWallet,
  Payment,
  Shop,
  Product,
  Order,
} from "./types";
export class SupabaseRepository implements Repository {
  constructor(private db: SupabaseClient) {}
  static connect(url: string, serviceKey: string) {
    return new SupabaseRepository(
      createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  }
  private async rpc<T>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await this.db.rpc(name, args);
    if (error) throw new Error(`Track B database RPC failed: ${error.code}`);
    return data as T;
  }
  async getShop(slug: string): Promise<Shop | null> {
    const { data, error } = await this.db
      .from("shops")
      .select("id,slug,name,wallet_address,agent_discount_pct,status")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error("Catalog shops unavailable");
    return data
      ? {
          id: data.id,
          slug: data.slug,
          name: data.name,
          walletAddress: data.wallet_address,
          agentDiscountPct: data.agent_discount_pct,
          status: data.status,
        }
      : null;
  }
  async getProducts(shopId: string, ids: string[]): Promise<Product[]> {
    const { data, error } = await this.db
      .from("products")
      .select("id,shop_id,name,price_cents,available")
      .eq("shop_id", shopId)
      .in("id", ids);
    if (error) throw new Error("Catalog products unavailable");
    return (data ?? []).map((p) => ({
      id: p.id,
      shopId: p.shop_id,
      name: p.name,
      priceCents: p.price_cents,
      available: p.available,
    }));
  }
  async getBuyerAddress(id: string): Promise<Address | null> {
    const { data, error } = await this.db
      .from("buyers")
      .select("wallet_address")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Buyer lookup unavailable");
    return data?.wallet_address ?? null;
  }
  async saveWallet(wallet: StoredWallet) {
    const { error } = await this.db
      .from("track_b_wallets")
      .insert({
        id: wallet.id,
        wallet_address: wallet.walletAddress,
        encrypted_key: wallet.encryptedKey,
      });
    if (error) throw new Error("Wallet persistence failed");
  }
  async getWallet(id: string) {
    const { data, error } = await this.db
      .from("track_b_wallets")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Wallet lookup failed");
    return this.wallet(data);
  }
  async findWallet(address: Address) {
    const { data, error } = await this.db
      .from("track_b_wallets")
      .select("*")
      .ilike("wallet_address", address)
      .maybeSingle();
    if (error) throw new Error("Wallet lookup failed");
    return this.wallet(data);
  }
  private wallet(
    data: { id: string; wallet_address: Address; encrypted_key: string } | null,
  ): StoredWallet | null {
    return data
      ? {
          id: data.id,
          walletAddress: data.wallet_address,
          encryptedKey: data.encrypted_key,
        }
      : null;
  }
  async claim(intent: Intent) {
    return this.rpc<{ created: boolean; intent: Intent }>("track_b_claim", {
      p_intent: intent,
    });
  }
  async getCheckout(key: string): Promise<Intent | null> {
    const { data, error } = await this.db
      .from("track_b_intents")
      .select("document")
      .eq("document->>checkoutKey", key)
      .maybeSingle();
    if (error) throw new Error("Checkout lookup failed");
    return data?.document ?? null;
  }
  async startHosted(key: string, startBlock: string) {
    await this.rpc("track_b_start_hosted", { p_key: key, p_block: startBlock });
  }
  async recordHostedHash(key: string, txHash: Hex) {
    await this.rpc("track_b_hosted_hash", { p_key: key, p_hash: txHash });
  }
  async getIntent(key: string): Promise<Intent | null> {
    const { data, error } = await this.db
      .from("track_b_intents")
      .select("document")
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error("Intent lookup failed");
    return data?.document ?? null;
  }
  async prepare(key: string, rawTx: Hex, txHash: Hex) {
    await this.rpc("track_b_prepare", {
      p_key: key,
      p_raw: rawTx,
      p_hash: txHash,
    });
  }
  async complete(key: string) {
    return this.rpc<Intent>("track_b_complete", { p_key: key });
  }
  async getOrder(id: string): Promise<Order | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Order lookup failed");
    return data
      ? {
          id: data.id,
          shopId: data.shop_id,
          buyerId: data.buyer_id,
          pickupName: data.pickup_name,
          paidAt: data.paid_at,
          items: data.items,
          subtotalCents: data.subtotal_cents,
          discountCents: data.discount_cents,
          totalCents: data.total_cents,
          status: data.status,
          chain: data.chain,
          txHash: data.tx_hash,
          createdAt: data.created_at,
        }
      : null;
  }
  async allocateNonce(address: Address, chainNonce: number) {
    return this.rpc<number>("track_b_allocate_nonce", {
      p_address: address.toLowerCase(),
      p_chain_nonce: chainNonce,
    });
  }
  async getClientPayment(key: string): Promise<Payment | null> {
    const { data, error } = await this.db
      .from("track_b_client_payments")
      .select("payment")
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error("Client payment lookup failed");
    return data?.payment ?? null;
  }
  async saveClientPayment(key: string, payment: Payment) {
    return this.rpc<Payment>("track_b_client_payment", {
      p_key: key,
      p_payment: payment,
    });
  }
}
