import "server-only";
import { randomBytes } from "node:crypto";
import type { Shop, Withdrawal } from "../contract";
import { db } from "../db/client";
import { toWithdrawal, type WithdrawalRow } from "../db/rows";

export interface Wallet {
  address: string;
}

export interface PaidOrderResult {
  orderId: string;
  txHash: string;
}

export const PAYMENTS_ARE_PLACEHOLDERS = true;

export async function createWallet(): Promise<Wallet> {
  return { address: `0x${randomBytes(20).toString("hex")}` };
}

export async function getBalance(shop: Pick<Shop, "id">): Promise<number> {
  const [paid, withdrawn] = await Promise.all([
    db().from("orders").select("total_cents").eq("shop_id", shop.id).neq("status", "awaiting_payment"),
    db().from("withdrawals").select("amount_cents").eq("shop_id", shop.id).neq("status", "failed"),
  ]);
  if (paid.error) throw paid.error;
  if (withdrawn.error) throw withdrawn.error;
  const earned = paid.data.reduce((sum, row) => sum + row.total_cents, 0);
  const out = withdrawn.data.reduce((sum, row) => sum + row.amount_cents, 0);
  return earned - out;
}

export async function withdraw(shop: Pick<Shop, "id">, amountCents: number): Promise<Withdrawal> {
  const { data, error } = await db()
    .from("withdrawals")
    .insert({ shop_id: shop.id, amount_cents: amountCents, status: "pending" })
    .select()
    .single<WithdrawalRow>();
  if (error) throw error;
  return toWithdrawal(data);
}

export async function payX402(): Promise<PaidOrderResult> {
  throw new Error("payX402 is not implemented yet. Track B owns it.");
}

export function explorerUrl(txHash: string) {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}
