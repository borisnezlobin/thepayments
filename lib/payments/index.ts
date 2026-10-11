import "server-only";
import type { Address, Hex } from "viem";
import type { Shop, Withdrawal, CreateOrderRequest } from "../contract";
import { db } from "../db/client";
import { paymentRuntime } from "./runtime";
import { explorerUrl as transactionUrl } from "./config";
import { PaymentError } from "./validation";
export interface Wallet {
  address: string;
  id?: string;
  walletAddress?: string;
}
export interface PaidOrderResult {
  orderId: string;
  txHash: string;
}
export const PAYMENTS_ARE_PLACEHOLDERS = false;
export async function createWallet(): Promise<Wallet> {
  const w = await paymentRuntime().payments.createWallet();
  return { id: w.id, address: w.walletAddress, walletAddress: w.walletAddress };
}
async function loadShop(shop: Pick<Shop, "id">) {
  const { data, error } = await db()
    .from("shops")
    .select("slug")
    .eq("id", shop.id)
    .single();
  if (error) throw new Error("Shop lookup failed");
  const result = await paymentRuntime().repository.getShop(data.slug);
  if (!result) throw new PaymentError(404, "Shop not found");
  return result;
}
export async function getBalance(shop: Pick<Shop, "id">): Promise<number>;
export async function getBalance(address: string): Promise<number>;
export async function getBalance(
  shopOrAddress: Pick<Shop, "id"> | string,
): Promise<number> {
  const address =
    typeof shopOrAddress === "string"
      ? shopOrAddress
      : (await loadShop(shopOrAddress)).walletAddress;
  const result = await paymentRuntime().payments.getBalance(address as Address);
  if (result.balanceCents === null)
    throw new Error("Balance exceeds safe integer cents");
  return result.balanceCents;
}
export async function withdraw(
  shop: Pick<Shop, "id">,
  amountCents: number,
  idempotencyKey?: string,
): Promise<Withdrawal> {
  const { data, error } = await db()
    .from("withdrawals")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Withdrawal history unavailable");
  const key =
    idempotencyKey ??
    `withdraw-${shop.id}-${data?.id ?? "first"}-${amountCents}`;
  const result = await paymentRuntime().payments.withdraw(
    await loadShop(shop),
    amountCents,
    key,
  );
  if (!result.withdrawal) throw new Error("Withdrawal not recorded");
  return result.withdrawal;
}
export async function withdrawAll(
  shop: Pick<Shop, "id">,
  idempotencyKey: string,
): Promise<Withdrawal> {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey))
    throw new PaymentError(400, "Use a stable withdrawal idempotency key");
  const result = await paymentRuntime().payments.withdraw(
    await loadShop(shop),
    undefined,
    idempotencyKey,
  );
  if (!result.withdrawal) throw new Error("Withdrawal not recorded");
  return result.withdrawal;
}
async function resolveWallet(wallet: Wallet) {
  const { repository } = paymentRuntime();
  const saved = wallet.id
    ? await repository.getWallet(wallet.id)
    : await repository.findWallet(wallet.address as Address);
  if (
    !saved ||
    saved.walletAddress.toLowerCase() !== wallet.address.toLowerCase()
  )
    throw new PaymentError(400, "Wallet not in server vault");
  return { id: saved.id, walletAddress: saved.walletAddress };
}
export async function payX402(
  wallet: Wallet,
  url: string,
  body: CreateOrderRequest & { buyerId?: string },
  options: { idempotencyKey?: string } = {},
) {
  const result = await paymentRuntime().payments.payX402(
    await resolveWallet(wallet),
    url,
    body,
    options,
  );
  return { ...result, orderId: result.order.id };
}
export async function fundBuyer(
  wallet: Wallet,
  amountCents = 1000,
  idempotencyKey?: string,
) {
  return paymentRuntime().payments.fundBuyer(
    await resolveWallet(wallet),
    amountCents,
    idempotencyKey,
  );
}
export function explorerUrl(txHash: string) {
  return transactionUrl(txHash as Hex);
}
