import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
let database: PGlite;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const sessionHash = "a".repeat(64);
const tokenHash = "b".repeat(64);
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
  await database.exec(migration("_track_c_agent_links.sql"));
  // Twice, because it may be pasted into the SQL editor before db push runs it.
  await database.exec(migration("_track_c_agent_sessions.sql"));
  await database.exec(migration("_track_c_agent_sessions.sql"));
}, 30_000);
afterAll(async () => {
  await database?.close();
});
beforeEach(async () => {
  await database.exec(
    "reset role; delete from track_c_agent_sessions; delete from track_c_agent_links;",
  );
  await database.query(
    "insert into buyers (id, email) values ($1, $2), ($3, $4) on conflict (id) do nothing",
    [alice, "alice@example.test", bob, "bob@example.test"],
  );
  await database.query(
    "insert into track_c_agent_sessions (buyer_id, session_hash, expires_at) values ($1, $2, now() + interval '90 days')",
    [alice, sessionHash],
  );
  await database.query(
    "insert into track_c_agent_links (buyer_id, token_hash, expires_at) values ($1, $2, now() + interval '15 minutes')",
    [alice, tokenHash],
  );
});
async function asBuyer(id: string) {
  await database.exec("set role authenticated");
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [id],
  );
}
const rows = async (sql: string, params: unknown[] = []) =>
  (await database.query(sql, params)).rows;
describe("agent session migration on PostgreSQL", () => {
  it("lets owners see and end only their own session", async () => {
    await asBuyer(bob);
    expect(await rows("select * from track_c_agent_sessions")).toHaveLength(0);
    expect(
      await rows("delete from track_c_agent_sessions returning buyer_id"),
    ).toHaveLength(0);
    await database.exec("reset role");
    await asBuyer(alice);
    expect(await rows("select * from track_c_agent_sessions")).toHaveLength(1);
    expect(
      await rows("delete from track_c_agent_sessions returning buyer_id"),
    ).toHaveLength(1);
  });
  it("only lets the server create or change sessions", async () => {
    await asBuyer(alice);
    await expect(
      database.query(
        "update track_c_agent_sessions set expires_at = now() + interval '10 years'",
      ),
    ).rejects.toThrow();
    await database.exec("reset role");
    await database.exec("delete from track_c_agent_sessions");
    await asBuyer(alice);
    await expect(
      database.query(
        "insert into track_c_agent_sessions (buyer_id, session_hash, expires_at) values ($1, $2, now() + interval '1 day')",
        [alice, "c".repeat(64)],
      ),
    ).rejects.toThrow();
  });
  it("denies anonymous access", async () => {
    await database.exec("set role anon");
    await expect(
      database.query("select * from track_c_agent_sessions"),
    ).rejects.toThrow();
  });
  it("removes the session when the buyer is deleted", async () => {
    await database.query("delete from buyers where id = $1", [alice]);
    expect(await rows("select * from track_c_agent_sessions")).toHaveLength(0);
  });
});
describe("redeeming a connection token on PostgreSQL", () => {
  const nextHash = "c".repeat(64);
  const redeem = (currentBuyer: string | null = null) =>
    rows(
      "select * from public.track_c_redeem_agent_token($1, $2, 900, 7776000, $3::uuid)",
      [tokenHash, nextHash, currentBuyer],
    );
  const sessions = () =>
    rows(
      "select buyer_id, session_hash, expires_at > now() + interval '89 days' as lasting from track_c_agent_sessions",
    );
  const links = () => rows("select buyer_id from track_c_agent_links");

  it("works once and replaces the earlier session", async () => {
    await database.exec("set role service_role");
    expect(await redeem()).toEqual([
      { session_buyer_id: alice, session_expires_at: expect.any(Date) },
    ]);
    expect(await redeem()).toEqual([]);
    expect(await links()).toEqual([]);
    expect(await sessions()).toEqual([
      { buyer_id: alice, session_hash: nextHash, lasting: true },
    ]);
  });

  it.each([
    ["is older than 15 minutes", "created_at = now() - interval '16 minutes'"],
    ["has expired", "expires_at = now() - interval '1 second'"],
  ])("refuses a token that %s", async (_, change) => {
    await database.exec(`update track_c_agent_links set ${change}`);
    await database.exec("set role service_role");
    expect(await redeem()).toEqual([]);
    expect(await sessions()).toEqual([
      { buyer_id: alice, session_hash: sessionHash, lasting: true },
    ]);
  });

  it("keeps a connected agent on its own account", async () => {
    await database.exec("set role service_role");
    expect(await redeem(bob)).toEqual([]);
    expect(await links()).toEqual([{ buyer_id: alice }]);
    expect(await sessions()).toEqual([
      { buyer_id: alice, session_hash: sessionHash, lasting: true },
    ]);
    expect(await redeem(alice)).toHaveLength(1);
  });

  it("can only be called by the server", async () => {
    await asBuyer(alice);
    await expect(redeem()).rejects.toThrow(/permission denied for function/);
    await database.exec("reset role; set role anon");
    await expect(redeem()).rejects.toThrow(/permission denied for function/);
    await database.exec("reset role");
    expect(await links()).toEqual([{ buyer_id: alice }]);
  });
});
