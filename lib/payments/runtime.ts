import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import { createPayments } from "./service";
import { createRail } from "./rail";
import { createHostedRail } from "./hosted";
import { SupabaseRepository } from "./supabase";
import { requiredEnv } from "./config";
let configured: ReturnType<typeof configure> | undefined;
function configure() {
  const repository = SupabaseRepository.connect(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
  );
  const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
  const rail =
    process.env.PAYMENTS_FACILITATOR_MODE === "local"
      ? createRail(rpc, requiredEnv("FACILITATOR_PRIVATE_KEY") as Hex)
      : createHostedRail(
          rpc,
          process.env.HOSTED_FACILITATOR_URL ?? "https://x402.org/facilitator",
        );
  const payments = createPayments({
    repository,
    rail,
    encryptionKey: requiredEnv("PAYMENTS_ENCRYPTION_KEY"),
    treasury: process.env.TREASURY_PRIVATE_KEY
      ? privateKeyToAccount(process.env.TREASURY_PRIVATE_KEY as Hex)
      : undefined,
    treasuryWalletId: process.env.TREASURY_WALLET_ID,
    offrampAddress: process.env.TESTNET_OFFRAMP_ADDRESS as Address | undefined,
    allowedPaymentOrigins: (
      process.env.PAYMENTS_ALLOWED_ORIGINS ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      ""
    )
      .split(",")
      .filter(Boolean),
  });
  return { repository, rail, payments };
}
export function paymentRuntime() {
  return (configured ??= configure());
}
