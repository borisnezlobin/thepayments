import { localWallets } from "./local-wallets.js";
import { SupabaseRepository } from "../../../lib/payments/supabase.js";
import { requiredEnv } from "../../../lib/payments/config.js";
const { repository: local, roles } = await localWallets();
const remote = SupabaseRepository.connect(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SECRET_KEY"),
);
for (const wallet of local.wallets.values()) {
  const existing = await remote.getWallet(wallet.id);
  if (!existing) await remote.saveWallet(wallet);
  else if (
    existing.walletAddress !== wallet.walletAddress ||
    existing.encryptedKey !== wallet.encryptedKey
  )
    throw new Error("Existing wallet differs; refusing to replace it");
}
console.log(
  "Encrypted wallets imported. Configure TREASURY_WALLET_ID:",
  roles.treasury.id,
);
console.log(
  "Use the same PAYMENTS_ENCRYPTION_KEY in the server environment. No keys printed.",
);
