import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import { AUSD, abi } from "../../../lib/payments/config.js";
import { faucetAbi, AUSD_FAUCET } from "../../../lib/payments/faucet.js";
import { localWallets } from "./local-wallets.js";
const { roles } = await localWallets(),
  client = createPublicClient({
    chain: baseSepolia,
    transport: http(
      process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    ),
  });
if ((await client.getChainId()) !== 84532) throw new Error("Wrong network");
for (const [role, wallet] of Object.entries(roles)) {
  const [eth, ausd] = await Promise.all([
    client.getBalance({ address: wallet.walletAddress }),
    client.readContract({
      address: AUSD,
      abi,
      functionName: "balanceOf",
      args: [wallet.walletAddress],
    }),
  ]);
  console.log(
    role,
    wallet.walletAddress,
    "ETH",
    formatEther(eth),
    "AUSD",
    Number(ausd) / 1000000,
  );
}
try {
  await client.simulateContract({
    account: roles.treasury.walletAddress,
    address: AUSD_FAUCET,
    abi: faucetAbi,
    functionName: "requestFunds",
    args: [roles.treasury.walletAddress],
  });
  console.log(
    "Deployed requestFunds(address) simulation succeeded (no broadcast)",
  );
} catch (e) {
  console.log(
    "Faucet simulation failed",
    e instanceof Error ? e.name : "unknown",
  );
}
