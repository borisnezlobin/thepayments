import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Track B migrations preserve populated shared tables and Track C owner policies", async () => {
  const db = new PGlite();
  const migration = async (name: string) =>
    db.exec(
      (
        await readFile(
          new URL(`../../../supabase/migrations/${name}.sql`, import.meta.url),
          "utf8",
        )
      ).replace("create extension if not exists pgcrypto;", ""),
    );
  const owner = "11111111-1111-4111-8111-111111111111";
  const shop = "22222222-2222-4222-8222-222222222222";
  const order = "33333333-3333-4333-8333-333333333333";
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated;",
    );
    await migration("20261011000000_init");
    await migration("20261011195048_track_c_agent_links");
    await migration("20261011210000_default_discount_3");
    await migration("20261011215500_track_c_order_approvals");
    await db.exec(
      "alter table products add column base_name text, add column size_label text;",
    );
    await db.query(
      "insert into buyers(id,email,wallet_address) values($1,'owner@example.test','0x1234');",
      [owner],
    );
    await db.query(
      "insert into shops(id,slug,name,source_url,wallet_address,status) values($1,'existing','Existing','https://example.test','0x5678','live');",
      [shop],
    );
    await db.query(
      "insert into shop_secrets(shop_id,admin_token) values($1,'test-capability');",
      [shop],
    );
    await db.query(
      "insert into products(shop_id,name,price_cents,base_name,size_label) values($1,'Coffee',500,'Coffee','Large');",
      [shop],
    );
    await db.query(
      "insert into orders(id,shop_id,buyer_id,pickup_name,items,subtotal_cents,discount_cents,total_cents,status) values($1,$2,$3,'Owner','[]',500,0,500,'paid');",
      [order, shop, owner],
    );
    await db.query(
      "insert into withdrawals(shop_id,amount_cents,status) values($1,100,'sent');",
      [shop],
    );
    await db.query(
      "insert into track_c_agent_links(buyer_id,token_hash,expires_at) values($1,repeat('a',64),now()+interval '1 hour');",
      [owner],
    );
    await db.query(
      "insert into track_c_order_requests(buyer_id,idempotency_key,source,shop_slug,shop_name,items,pickup_name,subtotal_cents,total_cents,status,order_id,expires_at) values($1,gen_random_uuid(),'web','existing','Existing','[]','Owner',500,500,'paid',$2,now()+interval '1 hour');",
      [owner, order],
    );
    const tables = [
      "buyers",
      "shops",
      "shop_secrets",
      "products",
      "orders",
      "withdrawals",
      "track_c_agent_links",
      "track_c_order_requests",
    ];
    const snapshot = async () =>
      Promise.all(
        tables.map(
          async (table) => (await db.query(`select * from ${table}`)).rows,
        ),
      );
    const before = await snapshot();
    const policies = (
      await db.query("select * from pg_policies order by tablename,policyname")
    ).rows;
    await migration("20261011194144_track_b_payments");
    await migration("20261011201257_track_b_buyer_wallets");
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(
      (
        await db.query(
          "select * from pg_policies order by tablename,policyname",
        )
      ).rows,
      policies,
    );
    const functions = (
      await db.query<{ prosecdef: boolean; allowed: boolean; client: boolean }>(
        "select prosecdef, has_function_privilege('service_role',oid,'EXECUTE') allowed, has_function_privilege('authenticated',oid,'EXECUTE') client from pg_proc where proname like 'track_b_%'",
      )
    ).rows;
    assert.equal(functions.length, 8);
    assert.ok(functions.every((f) => !f.prosecdef && f.allowed && !f.client));
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role};`);
      for (const table of [
        "track_b_wallets",
        "track_b_intents",
        "track_b_nonces",
        "track_b_client_payments",
      ]) {
        await assert.rejects(db.query(`select * from ${table}`));
      }
      await db.exec("reset role;");
    }
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub='${owner}';`,
    );
    assert.equal(
      (await db.query("select * from track_c_order_requests")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from track_c_agent_links")).rows.length,
      1,
    );
    await db.exec(
      "set request.jwt.claim.sub='44444444-4444-4444-8444-444444444444';",
    );
    assert.equal(
      (await db.query("select * from track_c_order_requests")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from track_c_agent_links")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
