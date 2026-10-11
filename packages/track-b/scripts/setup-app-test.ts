import { readFile, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { localWallets } from "./local-wallets.js";
import { requiredEnv } from "../../../lib/payments/config.js";
const status = JSON.parse(
  await readFile(".local/supabase-status.json", "utf8"),
);
const origin = "http://127.0.0.1:3102";
const config: Record<string, string> = {
  SUPABASE_URL: status.API_URL,
  SUPABASE_SECRET_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  NEXT_PUBLIC_SITE_URL: origin,
  APP_ORIGIN: origin,
  PAYMENTS_ENCRYPTION_KEY: requiredEnv("PAYMENTS_ENCRYPTION_KEY"),
  BASE_SEPOLIA_RPC_URL: "https://sepolia.base.org",
  PAYMENTS_FACILITATOR_MODE: "hosted",
  HOSTED_FACILITATOR_URL: "https://x402.org/facilitator",
  PAYMENTS_ALLOWED_ORIGINS: origin,
  PAYMENTS_CHECKOUT_ENABLED: "true",
  PAYMENTS_AUTO_FUND_BUYERS: "false",
};
const db = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { repository, roles } = await localWallets();
for (const w of repository.wallets.values()) {
  const { error } = await db
    .from("track_b_wallets")
    .upsert(
      {
        id: w.id,
        wallet_address: w.walletAddress,
        encrypted_key: w.encryptedKey,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`Wallet import failed: ${error.code}`);
}
let fixture: {
  buyerId: string;
  email: string;
  password: string;
  shopId: string;
  productId: string;
  merchantToken: string;
  checkoutId: string;
};
try {
  fixture = JSON.parse(await readFile(".local/app-fixture.json", "utf8"));
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  const email = `track-b-${randomUUID()}@example.test`,
    password = randomBytes(24).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error("Test Auth user creation failed");
  fixture = {
    buyerId: data.user.id,
    email,
    password,
    shopId: randomUUID(),
    productId: randomUUID(),
    merchantToken: randomBytes(32).toString("hex"),
    checkoutId: randomUUID(),
  };
  await writeFile(".local/app-fixture.json", JSON.stringify(fixture), {
    mode: 0o600,
    flag: "wx",
  });
}
config.TREASURY_WALLET_ID = roles.treasury.id;
for (const q of [
  db
    .from("buyers")
    .upsert(
      {
        id: fixture.buyerId,
        email: fixture.email,
        wallet_address: roles.buyer.walletAddress,
      },
      { onConflict: "id" },
    ),
  db
    .from("shops")
    .upsert(
      {
        id: fixture.shopId,
        slug: "track-b-browser-demo",
        name: "Track B test café",
        source_url: "https://example.test/track-b-demo",
        wallet_address: roles.merchant.walletAddress,
        agent_discount_pct: 0,
        status: "live",
      },
      { onConflict: "id" },
    ),
]) {
  const { error } = await q;
  if (error) throw new Error(`Fixture seed failed: ${error.code}`);
}
for (const q of [
  db
    .from("products")
    .upsert(
      {
        id: fixture.productId,
        shop_id: fixture.shopId,
        name: "Test coffee",
        price_cents: 500,
        available: true,
      },
      { onConflict: "id" },
    ),
  db
    .from("shop_secrets")
    .upsert(
      { shop_id: fixture.shopId, admin_token: fixture.merchantToken },
      { onConflict: "shop_id" },
    ),
]) {
  const { error } = await q;
  if (error) throw new Error(`Catalog seed failed: ${error.code}`);
}
const rootEnv = "../../.env.local";
try {
  await readFile(rootEnv);
  throw new Error(
    "Existing app .env.local detected; merge configuration manually instead of replacing it",
  );
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
await writeFile(
  rootEnv,
  Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600, flag: "wx" },
);
console.log(
  "Local Supabase app fixture prepared. Encrypted wallets imported; verified Auth buyer seeded.",
);
console.log(
  "Test app origin",
  origin,
  "shop slug track-b-browser-demo",
  "product",
  fixture.productId,
);
console.log(
  "Credentials and merchant capability remain in ignored private files. No secrets printed.",
);
