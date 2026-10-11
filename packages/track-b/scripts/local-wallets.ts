import { readFile } from "node:fs/promises";
import { walletVault } from "../../../lib/payments/wallets.js";
import { MemoryRepository } from "../../../lib/payments/memory.js";
import { requiredEnv } from "../../../lib/payments/config.js";
import type { StoredWallet, Wallet } from "../../../lib/payments/types.js";
export async function localWallets() {
  const repository = new MemoryRepository();
  const saved = JSON.parse(
    await readFile(".local/wallets.json", "utf8"),
  ) as StoredWallet[];
  for (const wallet of saved) await repository.saveWallet(wallet);
  const roles = JSON.parse(
    await readFile(".local/addresses.json", "utf8"),
  ) as Record<"treasury" | "facilitator" | "buyer" | "merchant", Wallet>;
  const vault = walletVault(repository, requiredEnv("PAYMENTS_ENCRYPTION_KEY"));
  return { repository, roles, vault };
}
