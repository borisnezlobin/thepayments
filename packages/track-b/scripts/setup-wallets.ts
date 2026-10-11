import { mkdir, writeFile, readFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { MemoryRepository } from "../../../lib/payments/memory.js";
import { walletVault } from "../../../lib/payments/wallets.js";
const directory = resolve(".local");
await mkdir(directory, { recursive: true, mode: 0o700 });
const publicPath = resolve(directory, "addresses.json");
try {
  console.log(await readFile(publicPath, "utf8"));
  process.exit(0);
} catch {}
const repository = new MemoryRepository(),
  key = randomBytes(32).toString("hex"),
  vault = walletVault(repository, key);
const treasury = await vault.createWallet(),
  facilitator = await vault.createWallet(),
  buyer = await vault.createWallet(),
  merchant = await vault.createWallet();
const roles = { treasury, facilitator, buyer, merchant };
await writeFile(
  resolve(directory, "wallets.json"),
  JSON.stringify([...repository.wallets.values()], null, 2),
  { mode: 0o600, flag: "wx" },
);
await writeFile(
  ".env",
  `PAYMENTS_ENCRYPTION_KEY=${key}\nBASE_SEPOLIA_RPC_URL=https://sepolia.base.org\n`,
  { mode: 0o600, flag: "wx" },
);
await chmod(".env", 0o600);
await writeFile(publicPath, JSON.stringify(roles, null, 2), {
  mode: 0o600,
  flag: "wx",
});
console.log(JSON.stringify(roles, null, 2));
console.log(
  "Private keys are encrypted in .local/wallets.json; encryption key is in ignored .env. No secrets printed.",
);
