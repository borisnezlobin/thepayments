import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
let database: PGlite;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const hash = "a".repeat(64);
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
  // pgcrypto is not needed for this test: gen_random_uuid is built into Postgres.
  const initial = readFileSync(
    "supabase/migrations/20261011000000_init.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await database.exec(initial);
  const migration = readdirSync("supabase/migrations").find((name) =>
    name.endsWith("_track_c_agent_links.sql"),
  )!;
  await database.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
  await database.query(
    "insert into buyers (id, email) values ($1, $2), ($3, $4)",
    [alice, "alice@example.test", bob, "bob@example.test"],
  );
}, 30_000);
afterAll(async () => {
  await database?.close();
});
beforeEach(async () => {
  await database.exec("reset role; delete from track_c_agent_links;");
  await database.query(
    "insert into track_c_agent_links (buyer_id, token_hash, expires_at) values ($1, $2, now() + interval '30 days')",
    [alice, hash],
  );
});
async function asBuyer(id: string) {
  await database.exec("set role authenticated");
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [id],
  );
}
describe("agent grant migration on PostgreSQL", () => {
  it("allows owners to read and rotate only their own capability", async () => {
    await asBuyer(alice);
    expect(
      (await database.query("select * from track_c_agent_links")).rows,
    ).toHaveLength(1);
    await database.query(
      "update track_c_agent_links set token_hash = $1 where buyer_id = $2",
      ["b".repeat(64), alice],
    );
    expect(
      (
        await database.query<{ token_hash: string }>(
          "select token_hash from track_c_agent_links",
        )
      ).rows[0].token_hash,
    ).toBe("b".repeat(64));
  });
  it("hides another buyer’s grants and prevents cross-account writes", async () => {
    await asBuyer(bob);
    expect(
      (await database.query("select * from track_c_agent_links")).rows,
    ).toHaveLength(0);
    expect(
      (
        await database.query(
          "delete from track_c_agent_links returning buyer_id",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      database.query(
        "insert into track_c_agent_links (buyer_id, token_hash, expires_at) values ($1, $2, now() + interval '1 day')",
        [alice, "c".repeat(64)],
      ),
    ).rejects.toThrow();
  });
  it("does not allow transferring a grant to a different buyer", async () => {
    await asBuyer(alice);
    await expect(
      database.query(
        "update track_c_agent_links set buyer_id = $1 where buyer_id = $2",
        [bob, alice],
      ),
    ).rejects.toThrow();
  });
  it("denies anonymous reads and supports owner revocation", async () => {
    await database.exec("set role anon");
    await expect(
      database.query("select * from track_c_agent_links"),
    ).rejects.toThrow();
    await database.exec("reset role");
    await asBuyer(alice);
    await database.query(
      "delete from track_c_agent_links where buyer_id = $1",
      [alice],
    );
    expect(
      (await database.query("select * from track_c_agent_links")).rows,
    ).toHaveLength(0);
  });
});
