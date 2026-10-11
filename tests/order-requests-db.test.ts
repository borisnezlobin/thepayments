import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
let database: PGlite;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const migration = (suffix: string) =>
  readFileSync(
    `supabase/migrations/${readdirSync("supabase/migrations").find((name) => name.endsWith(suffix))!}`,
    "utf8",
  );
beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  await database.exec(
    migration("_init.sql").replace(
      "create extension if not exists pgcrypto;",
      "",
    ),
  );
  await database.exec(migration("_track_c_order_approvals.sql"));
  await database.query(
    "insert into buyers (id, email) values ($1, $2), ($3, $4)",
    [alice, "alice@example.test", bob, "bob@example.test"],
  );
  await database.query(
    `insert into track_c_order_requests
      (buyer_id, idempotency_key, source, shop_slug, shop_name, items, pickup_name, subtotal_cents, total_cents, expires_at)
     values ($1, gen_random_uuid(), 'web', 'test-cafe', 'Test Café', '[]', 'Lee', 500, 475, now() + interval '30 minutes')`,
    [alice],
  );
}, 30_000);
afterAll(async () => {
  await database?.close();
});
async function asBuyer(id: string) {
  await database.exec("set role authenticated");
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [id],
  );
}
describe("order approval migration on PostgreSQL", () => {
  it("lets owners read only their own requests", async () => {
    await asBuyer(alice);
    expect(
      (await database.query("select * from track_c_order_requests")).rows,
    ).toHaveLength(1);
    await database.exec("reset role");
    await asBuyer(bob);
    expect(
      (await database.query("select * from track_c_order_requests")).rows,
    ).toHaveLength(0);
    await database.exec("reset role");
  });
  it("keeps approval writes on the server", async () => {
    await asBuyer(alice);
    await expect(
      database.query("update track_c_order_requests set status = 'approved'"),
    ).rejects.toThrow();
    await database.exec("reset role");
    await database.exec("set role anon");
    await expect(
      database.query("select * from track_c_order_requests"),
    ).rejects.toThrow();
    await database.exec("reset role");
  });
  it("rejects a reused key and a total above the regular price", async () => {
    const { rows } = await database.query<{ idempotency_key: string }>(
      "select idempotency_key from track_c_order_requests",
    );
    await expect(
      database.query(
        `insert into track_c_order_requests
          (buyer_id, idempotency_key, source, shop_slug, shop_name, items, pickup_name, subtotal_cents, total_cents, expires_at)
         values ($1, $2, 'mcp', 'test-cafe', 'Test Café', '[]', 'Lee', 500, 475, now())`,
        [alice, rows[0].idempotency_key],
      ),
    ).rejects.toThrow();
    await expect(
      database.query(
        `insert into track_c_order_requests
          (buyer_id, idempotency_key, source, shop_slug, shop_name, items, pickup_name, subtotal_cents, total_cents, expires_at)
         values ($1, gen_random_uuid(), 'web', 'test-cafe', 'Test Café', '[]', 'Lee', 400, 475, now())`,
        [alice],
      ),
    ).rejects.toThrow();
  });
});
