import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import {
  signPayment,
  requirements,
  paymentKey,
} from "../../../lib/payments/service.js";
const root = new URL("../../../", import.meta.url);
test("actual PostgreSQL migration: role isolation, nonce allocation, atomic claim and confirmation", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    const initial = await readFile(
      new URL("supabase/migrations/20261011000000_init.sql", root),
      "utf8",
    );
    await db.exec(
      initial.replace("create extension if not exists pgcrypto;", ""),
    );
    await db.exec(
      await readFile(
        new URL(
          "supabase/migrations/20261011194144_track_b_payments.sql",
          root,
        ),
        "utf8",
      ),
    );
    const shopId = randomUUID(),
      buyer = privateKeyToAccount(generatePrivateKey()),
      merchant = privateKeyToAccount(generatePrivateKey()),
      orderId = randomUUID();
    await db.query(
      "insert into shops(id,slug,name,source_url,wallet_address,status) values($1,$2,$3,$4,$5,$6)",
      [
        shopId,
        "demo",
        "Demo",
        "https://example.test",
        merchant.address,
        "live",
      ],
    );
    const payment = await signPayment(
        buyer,
        requirements(merchant.address, 500),
      ),
      key = paymentKey(payment);
    const order = {
      id: orderId,
      shopId,
      buyerId: null,
      pickupName: "Alex",
      items: [],
      subtotalCents: 500,
      discountCents: 0,
      totalCents: 500,
      status: "awaiting_payment",
      chain: "base-sepolia",
      txHash: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
    };
    const intent = {
      key,
      checkoutKey: "checkout-sql-1",
      binding: "binding",
      order,
      withdrawal: null,
      payment,
      state: "reserved",
      rawTx: null,
      txHash: null,
    };
    const rpc = async (fn: string, args: unknown[], types: string[]) => {
      const result = await db.query<{ result: unknown }>(
        `select ${fn}(${args.map((_, i) => `$${i + 1}::${types[i]}`).join(",")}) as result`,
        args,
      );
      return result.rows[0].result;
    };
    await db.exec("set role anon;");
    await assert.rejects(db.query("select * from track_b_wallets"));
    await assert.rejects(rpc("track_b_claim", [intent], ["jsonb"]));
    await db.exec("reset role; set role service_role;");
    const first = (await rpc("track_b_claim", [intent], ["jsonb"])) as {
      created: boolean;
    };
    assert.equal(first.created, true);
    const second = (await rpc("track_b_claim", [intent], ["jsonb"])) as {
      created: boolean;
    };
    assert.equal(second.created, false);
    assert.equal((await db.query("select * from orders")).rows.length, 1);
    await assert.rejects(rpc("track_b_complete", [key], ["text"]));
    const txHash = `0x${"ab".repeat(32)}`;
    await rpc(
      "track_b_prepare",
      [key, "0x1234", txHash],
      ["text", "text", "text"],
    );
    await rpc("track_b_complete", [key], ["text"]);
    const paid = (
      await db.query<{
        status: string;
        tx_hash: string;
        paid_at: string;
        payment_nonce: string;
      }>("select * from orders")
    ).rows[0];
    assert.equal(paid.status, "paid");
    assert.equal(paid.tx_hash, txHash);
    assert.ok(paid.paid_at);
    assert.equal(paid.payment_nonce, key);
    await rpc("track_b_complete", [key], ["text"]);
    // Merchant progressed order; a payment retry must not regress ready -> paid.
    await db.query("update orders set status='ready' where id=$1", [orderId]);
    await rpc("track_b_complete", [key], ["text"]);
    assert.equal(
      (await db.query<{ status: string }>("select status from orders")).rows[0]
        .status,
      "ready",
    );
    assert.equal(
      await rpc(
        "track_b_allocate_nonce",
        [merchant.address, 10],
        ["text", "bigint"],
      ),
      10,
    );
    assert.equal(
      await rpc(
        "track_b_allocate_nonce",
        [merchant.address, 10],
        ["text", "bigint"],
      ),
      11,
    );
    assert.equal(
      await rpc(
        "track_b_allocate_nonce",
        [merchant.address, 20],
        ["text", "bigint"],
      ),
      20,
    );

    const freshIntent = {
      ...intent,
      key: key + "fresh",
      payment: await signPayment(buyer, requirements(merchant.address, 500)),
    };
    const freshClaim = (await rpc(
      "track_b_claim",
      [freshIntent],
      ["jsonb"],
    )) as { created: boolean; intent: { key: string } };
    assert.equal(freshClaim.created, false);
    assert.equal(freshClaim.intent.key, key);
    const hostedIntent = {
      ...intent,
      key: key + "hosted",
      checkoutKey: "hosted-sql",
      order: { ...order, id: randomUUID() },
    };
    await rpc("track_b_claim", [hostedIntent], ["jsonb"]);
    await rpc(
      "track_b_start_hosted",
      [hostedIntent.key, "100"],
      ["text", "text"],
    );
    await assert.rejects(rpc("track_b_complete", [hostedIntent.key], ["text"]));
    const hostedHash = `0x${"cd".repeat(32)}`;
    await rpc(
      "track_b_hosted_hash",
      [hostedIntent.key, hostedHash],
      ["text", "text"],
    );
    await rpc("track_b_complete", [hostedIntent.key], ["text"]);
    const saved = await rpc(
      "track_b_client_payment",
      ["client-key", payment],
      ["text", "jsonb"],
    );
    const duplicate = await rpc(
      "track_b_client_payment",
      ["client-key", { bad: true }],
      ["text", "jsonb"],
    );
    assert.deepEqual(saved, duplicate);
  } finally {
    await db.close();
  }
});
