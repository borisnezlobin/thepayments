import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import type { Repository, Wallet, StoredWallet } from "./types";
export function walletVault(repository: Repository, encryptionKey: string) {
  if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey))
    throw new Error("PAYMENTS_ENCRYPTION_KEY must be 32 bytes encoded as hex");
  const key = Buffer.from(encryptionKey, "hex");
  return {
    async createWallet(): Promise<Wallet> {
      const privateKey = generatePrivateKey(),
        account = privateKeyToAccount(privateKey);
      const wallet = { id: randomUUID(), walletAddress: account.address };
      const iv = randomBytes(12),
        cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(
        Buffer.from(`${wallet.id}:${wallet.walletAddress.toLowerCase()}`),
      );
      const ciphertext = Buffer.concat([
        cipher.update(privateKey, "utf8"),
        cipher.final(),
      ]);
      const encryptedKey = [
        "v1",
        iv.toString("hex"),
        cipher.getAuthTag().toString("hex"),
        ciphertext.toString("hex"),
      ].join(":");
      await repository.saveWallet({ ...wallet, encryptedKey });
      return wallet;
    },
    async account(wallet: Wallet) {
      const saved = await repository.getWallet(wallet.id);
      if (
        !saved ||
        saved.walletAddress.toLowerCase() !== wallet.walletAddress.toLowerCase()
      )
        throw new Error("Wallet not found");
      return this.decrypt(saved);
    },
    decrypt(saved: StoredWallet) {
      const [version, iv, tag, ciphertext] = saved.encryptedKey.split(":");
      if (version !== "v1")
        throw new Error("Unsupported encrypted wallet version");
      const cipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(iv, "hex"),
      );
      cipher.setAAD(
        Buffer.from(`${saved.id}:${saved.walletAddress.toLowerCase()}`),
      );
      cipher.setAuthTag(Buffer.from(tag, "hex"));
      const privateKey = Buffer.concat([
        cipher.update(Buffer.from(ciphertext, "hex")),
        cipher.final(),
      ]).toString("utf8") as Hex;
      const account = privateKeyToAccount(privateKey);
      if (account.address.toLowerCase() !== saved.walletAddress.toLowerCase())
        throw new Error("Wallet integrity failure");
      return account;
    },
  };
}
