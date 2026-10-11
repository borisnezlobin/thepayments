import { readFile, writeFile, open, unlink } from "node:fs/promises";
import {
  requestFaucetFunds,
  type FaucetTx,
} from "../../../lib/payments/faucet.js";
import { localWallets } from "./local-wallets.js";
const { roles, vault } = await localWallets();
console.log("Treasury recipient", roles.treasury.walletAddress);
console.log(
  "Faucet caller",
  roles.treasury.walletAddress,
  "requires Base Sepolia ETH",
);
const lock = await open(".local/faucet.lock", "wx", 0o600);
try {
  const result = await requestFaucetFunds({
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    account: await vault.account(roles.treasury),
    recipient: roles.treasury.walletAddress,
    load: async () => {
      try {
        return JSON.parse(
          await readFile(".local/faucet-tx.json", "utf8"),
        ) as FaucetTx;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    save: async (tx) => {
      await writeFile(".local/faucet-tx.json", JSON.stringify(tx), {
        mode: 0o600,
        flag: "wx",
      });
    },
  });
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : "Faucet failed");
  process.exitCode = 1;
} finally {
  await lock.close();
  await unlink(".local/faucet.lock");
}
