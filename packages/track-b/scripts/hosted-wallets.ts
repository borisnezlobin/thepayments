import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { MemoryRepository } from "../../../lib/payments/memory.js";
import { walletVault } from "../../../lib/payments/wallets.js";
import type { StoredWallet, Wallet } from "../../../lib/payments/types.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const mode = process.argv[2] ?? "--check";
type DbWallet = { id: string; wallet_address: string; encrypted_key: string };
const encode = (s: string) => "'" + s.replaceAll("'", "''") + "'";
const fromDb = (w: DbWallet): StoredWallet => ({
  id: w.id,
  walletAddress: w.wallet_address as StoredWallet["walletAddress"],
  encryptedKey: w.encrypted_key,
});

function connection(raw: string, writable: boolean) {
  const url = new URL(raw),
    ref = "ksjlraadfpumdojlrwgz";
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !(
      url.hostname === `db.${ref}.supabase.co` ||
      (url.hostname.endsWith(".pooler.supabase.com") &&
        decodeURIComponent(url.username).endsWith(`.${ref}`))
    )
  )
    throw new Error("Wrong database");
  url.searchParams.set("sslmode", "require");
  url.searchParams.set(
    "options",
    writable
      ? "-c lock_timeout=5s -c statement_timeout=60s"
      : "-c default_transaction_read_only=on",
  );
  return url.toString();
}
function query<T>(raw: string, sql: string, writable = false): T[] {
  const run = spawnSync(
    "npx",
    [
      "--no-install",
      "supabase",
      "db",
      "query",
      "--db-url",
      connection(raw, writable),
      "--output",
      "json",
      "--",
      sql,
    ],
    { cwd: root, encoding: "utf8", timeout: 45000, maxBuffer: 4 * 1024 * 1024 },
  );
  if (run.status !== 0) throw new Error("Database operation failed");
  return JSON.parse(run.stdout).rows ?? [];
}
function inspect(
  planned: StoredWallet[],
  existing: DbWallet[],
  vault: ReturnType<typeof walletVault>,
) {
  return planned.filter((w) => {
    vault.decrypt(w);
    const matches = existing.filter(
      (e) =>
        e.id === w.id ||
        e.wallet_address.toLowerCase() === w.walletAddress.toLowerCase(),
    );
    if (!matches.length) return true;
    if (
      matches.length !== 1 ||
      matches[0].id !== w.id ||
      matches[0].wallet_address.toLowerCase() !== w.walletAddress.toLowerCase()
    )
      throw new Error("Wallet identity conflict");
    vault.decrypt(fromDb(matches[0]));
    return false;
  });
}
async function localPlan(
  config: Record<string, string>,
  vault: ReturnType<typeof walletVault>,
  memory: MemoryRepository,
) {
  const roles = JSON.parse(
    await readFile(".local/addresses.json", "utf8"),
  ) as Record<string, Wallet>;
  const saved = JSON.parse(
    await readFile(".local/wallets.json", "utf8"),
  ) as StoredWallet[];
  const selected = ["treasury", "buyer", "merchant"].map((role) => {
    const w = saved.find((w) => w.id === roles[role].id);
    if (
      !w ||
      w.walletAddress.toLowerCase() !== roles[role].walletAddress.toLowerCase()
    )
      throw new Error("Local role mismatch");
    vault.decrypt(w);
    return { role, wallet: w };
  });
  let offramp: StoredWallet;
  try {
    offramp = JSON.parse(await readFile(".local/offramp-wallet.json", "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT" || mode !== "--prepare")
      throw e;
    const wallet = await vault.createWallet();
    offramp = memory.wallets.get(wallet.id)!;
    await writeFile(".local/offramp-wallet.json", JSON.stringify(offramp), {
      mode: 0o600,
      flag: "wx",
    });
  }
  vault.decrypt(offramp);
  if (
    selected.some(
      (w) =>
        w.wallet.walletAddress.toLowerCase() ===
        offramp.walletAddress.toLowerCase(),
    )
  )
    throw new Error("Offramp must be separate");
  selected.push({ role: "offramp", wallet: offramp });
  if (
    config.TREASURY_WALLET_ID &&
    config.TREASURY_WALLET_ID !== roles.treasury.id
  )
    throw new Error("Treasury reference conflict");
  if (
    config.TESTNET_OFFRAMP_ADDRESS &&
    config.TESTNET_OFFRAMP_ADDRESS.toLowerCase() !==
      offramp.walletAddress.toLowerCase()
  )
    throw new Error("Offramp reference conflict");
  return { selected, roles, offramp };
}
async function prepare(
  config: Record<string, string>,
  roles: Record<string, Wallet>,
  offramp: StoredWallet,
) {
  let text = await readFile(".env.hosted", "utf8");
  for (const [name, value] of Object.entries({
    TREASURY_WALLET_ID: roles.treasury.id,
    TESTNET_OFFRAMP_ADDRESS: offramp.walletAddress,
  })) {
    const pattern = new RegExp(`^${name}=.*$`, "m");
    text = pattern.test(text)
      ? text.replace(pattern, `${name}=${value}`)
      : `${text.trimEnd()}\n${name}=${value}\n`;
  }
  await writeFile(".env.hosted", text, { mode: 0o600 });
  console.log(
    JSON.stringify({
      prepared: true,
      project: "ksjlraadfpumdojlrwgz",
      secretKeyConfigured: !!config.SUPABASE_SECRET_KEY,
      offrampAddress: offramp.walletAddress,
      checkoutEnabled: false,
    }),
  );
}
try {
  if (!["--prepare", "--check", "--import"].includes(mode))
    throw new Error("Invalid mode");
  const config: Record<string, string> = Object.fromEntries(
    Object.entries(parseEnv(await readFile(".env.hosted", "utf8"))).map(
      ([name, value]) => [name, value ?? ""],
    ),
  );
  const original = parseEnv(await readFile(".env", "utf8"));
  if (
    config.SUPABASE_URL !== "https://ksjlraadfpumdojlrwgz.supabase.co" ||
    config.PAYMENTS_CHECKOUT_ENABLED !== "false" ||
    config.PAYMENTS_ENCRYPTION_KEY !== original.PAYMENTS_ENCRYPTION_KEY
  )
    throw new Error("Configuration gate failed");
  const memory = new MemoryRepository(),
    vault = walletVault(memory, config.PAYMENTS_ENCRYPTION_KEY);
  const { selected, roles, offramp } = await localPlan(config, vault, memory);
  if (mode === "--prepare") await prepare(config, roles, offramp);
  else {
    const planned = selected.map((w) => w.wallet);
    const predicate = planned
      .map(
        (w) =>
          `(id=${encode(w.id)}::uuid or lower(wallet_address)=lower(${encode(w.walletAddress)}))`,
      )
      .join(" or ");
    const sql = `select id,wallet_address,encrypted_key from public.track_b_wallets where ${predicate} order by id`;
    const existing = query<DbWallet>(config.DATABASE_URL, sql);
    const missing = inspect(planned, existing, vault);
    if (mode === "--import" && missing.length) {
      const values = missing
        .map(
          (w) =>
            `(${encode(w.id)}::uuid,${encode(w.walletAddress)},${encode(w.encryptedKey)})`,
        )
        .join(",");
      query(
        config.DATABASE_URL,
        `insert into public.track_b_wallets(id,wallet_address,encrypted_key) values ${values} on conflict do nothing returning id`,
        true,
      );
    }
    const verified = inspect(
      planned,
      query<DbWallet>(config.DATABASE_URL, sql),
      vault,
    );
    if (mode === "--import" && verified.length)
      throw new Error("Import incomplete or conflict");
    console.log(
      JSON.stringify({
        project: "ksjlraadfpumdojlrwgz",
        mode,
        existingWallets: existing.length,
        insertedWallets:
          mode === "--import" ? missing.length - verified.length : 0,
        missingWallets: verified.length,
        wallets: selected.map((w) => ({
          role: w.role,
          address: w.wallet.walletAddress,
          decryptable: true,
          hosted: !verified.some((m) => m.id === w.wallet.id),
        })),
        checkoutEnabled: false,
      }),
    );
  }
} catch {
  console.error(
    "Wallet operation stopped. No secrets or raw errors printed. Existing wallets were never overwritten; inspect current records before retrying.",
  );
  process.exitCode = 1;
}
