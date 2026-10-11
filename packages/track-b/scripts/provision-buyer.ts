import { createClient } from "@supabase/supabase-js";
import type { Address } from "viem";
import { requiredEnv } from "../../../lib/payments/config.js";
import { runtime } from "./runtime.js";

// Operator-only CLI. There is deliberately no HTTP funding endpoint for agents.
const [buyerId, cents = "1000"] = process.argv.slice(2);
const amount = Number(cents);
if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    buyerId ?? "",
  ) ||
  !Number.isSafeInteger(amount) ||
  amount < 1 ||
  amount > 10000
)
  throw new Error(
    "Usage: provision-buyer <verified Auth buyer UUID> [funding cents 1–10000]",
  );
try {
  const db = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await db
    .from("buyers")
    .select("wallet_address")
    .eq("id", buyerId)
    .single();
  if (error) throw new Error("Buyer profile missing");
  const { payments, repository } = runtime();
  let address = data.wallet_address as Address | null;
  if (!address) {
    const candidate = await payments.createWallet();
    const assigned = await db.rpc("track_b_assign_buyer_wallet", {
      p_buyer: buyerId,
      p_wallet: candidate.id,
    });
    if (assigned.error) throw new Error("Wallet assignment failed");
    address = assigned.data as Address;
  }
  const wallet = await repository.findWallet(address);
  if (!wallet) throw new Error("Existing wallet is not managed by this vault");
  const result = await payments.fundBuyer(
    wallet,
    amount,
    `operator-demo-funding-${buyerId}-${amount}`,
  );
  console.log(
    JSON.stringify({
      buyerId,
      walletAddress: address,
      fundedCents: amount,
      ...result,
    }),
  );
} catch {
  console.error(
    "Buyer provisioning failed. Check the buyer profile, vault key, treasury balance and persisted funding intent before retrying the same command.",
  );
  process.exitCode = 1;
}
