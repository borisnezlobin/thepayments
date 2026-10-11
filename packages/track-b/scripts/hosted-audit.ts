import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { Address } from "viem";
import { SupabaseRepository } from "../../../lib/payments/supabase.js";
import { walletVault } from "../../../lib/payments/wallets.js";
const target = "ksjlraadfpumdojlrwgz";
const local = process.argv.includes("--local");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const privateDir = fileURLToPath(new URL("../.local/", import.meta.url));
function connectionArgs(): string[] {
  if (local) return ["--local"];
  process.loadEnvFile(".env.hosted");
  const raw = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!raw) throw new Error("DATABASE_URL is required");
  const url = new URL(raw);
  const correct =
    url.hostname === `db.${target}.supabase.co` ||
    (url.hostname.endsWith(".pooler.supabase.com") &&
      decodeURIComponent(url.username).endsWith(`.${target}`));
  if (!correct || !["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error(
      "Database connection does not identify the approved production project",
    );
  if (url.searchParams.get("sslmode") === "disable")
    throw new Error("TLS must be enabled");
  url.searchParams.set("sslmode", "require");
  // Every CLI connection is read-only, including future query changes.
  url.searchParams.set("options", "-c default_transaction_read_only=on");
  return ["--db-url", url.toString()];
}
function query(connection: string[], sql: string) {
  const result = spawnSync(
    "npx",
    ["supabase", "db", "query", ...connection, "--output", "json", "--", sql],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 45000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (result.status !== 0) throw new Error("Read-only database query failed");
  return JSON.parse(result.stdout).rows;
}
async function managedWallets() {
  const url = process.env.SUPABASE_URL,
    secret = process.env.SUPABASE_SECRET_KEY,
    master = process.env.PAYMENTS_ENCRYPTION_KEY;
  if (!url || !secret || !master)
    return {
      status: "not_configured",
      needs: ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "PAYMENTS_ENCRYPTION_KEY"],
    };
  if (new URL(url).hostname !== `${target}.supabase.co`)
    throw new Error("Data API target differs from the approved project");
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const repository = new SupabaseRepository(db),
    vault = walletVault(repository, master);
  const { data, error } = await db
    .from("shops")
    .select("slug,wallet_address")
    .eq("status", "live");
  if (error) return { status: "data_api_unavailable" };
  const merchants = [];
  for (const shop of data) {
    let usable = false;
    if (shop.wallet_address) {
      const wallet = await repository.findWallet(
        shop.wallet_address as Address,
      );
      if (wallet) {
        try {
          vault.decrypt(wallet);
          usable = true;
        } catch {
          /* Report only public metadata. */
        }
      }
    }
    merchants.push({ slug: shop.slug, address: shop.wallet_address, usable });
  }
  return { status: "checked", merchants };
}
try {
  const connection = connectionArgs();
  const sql = await readFile(
    new URL("../sql/hosted-audit.sql", import.meta.url),
    "utf8",
  );
  const audit = query(connection, sql)[0].audit;
  const history: { version: string; name: string }[] =
    audit.migrationHistoryPresent
      ? query(
          connection,
          "select version,name from supabase_migrations.schema_migrations order by version;",
        )
      : [];
  const files = (await readdir(`${root}/supabase/migrations`))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const recorded = new Set(history.map((row) => row.version));
  const missingRecordedMigrations = files.filter(
    (f) => !recorded.has(f.split("_")[0]),
  );
  const result = {
    target: local ? "LOCAL VERIFICATION ONLY" : target,
    audit,
    recordedVersions: [...recorded],
    migrationHistory: history,
    missingRecordedMigrations,
    migrationAction:
      "Review schema and history first; this audit never applies or repairs migrations.",
    managedWallets: local
      ? { status: "not_checked_in_local_mode" }
      : await managedWallets(),
  };
  await mkdir(privateDir, { recursive: true });
  const file = `${privateDir}/${local ? "local" : "hosted"}-audit.json`;
  await writeFile(file, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(
    JSON.stringify({
      target: result.target,
      tables: audit.tables.length,
      policies: audit.policies.length,
      paymentFunctions: audit.paymentFunctions.length,
      missingRecordedMigrations,
      managedWalletStatus: result.managedWallets.status,
      report: file,
    }),
  );
} catch {
  console.error(
    "Read-only audit could not complete. Configure packages/track-b/.env.hosted securely for the approved project and verify database access. No database changes were made; credentials and raw connection errors are not printed.",
  );
  process.exitCode = 1;
}
