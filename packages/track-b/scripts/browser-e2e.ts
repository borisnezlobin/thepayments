import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { validateSettlementReceipt } from "../../../lib/payments/rail.js";
import { SupabaseRepository } from "../../../lib/payments/supabase.js";
const fixture = JSON.parse(await readFile(".local/app-fixture.json", "utf8"));
const status = JSON.parse(
  await readFile(".local/supabase-status.json", "utf8"),
);
const db = createClient(
  status.API_URL,
  status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const origin = "http://127.0.0.1:3102";
const browser = await chromium.launch({ headless: true });
try {
  const buyer = await browser.newContext({ javaScriptEnabled: false });
  const page = await buyer.newPage();
  await page.goto(`${origin}/login`);
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/account/, { timeout: 60000 });
  console.log(
    "Authenticated local Supabase buyer login passed with JavaScript disabled.",
  );
  const merchant = await browser.newContext();
  const dashboard = await merchant.newPage();
  await dashboard.goto(`${origin}/m/${fixture.merchantToken}`);
  let saved: { order: { id: string; txHash: string } } | null = null;
  try {
    saved = JSON.parse(await readFile(".local/browser-result.json", "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  if (!saved) {
    await page.goto(`${origin}/s/track-b-browser-demo`);
    await page
      .getByRole("spinbutton", {
        name: "Quantity for Test coffee",
        exact: true,
      })
      .fill("1");
    await page
      .getByRole("button", { name: "Update order total", exact: true })
      .click();
    const button = page.getByRole("button", {
      name: "Pay $5.00 from wallet",
      exact: true,
    });
    assert.equal(await button.isEnabled(), true);
    fixture.checkoutId = await page
      .locator("input[name=idempotencyKey]")
      .inputValue();
    await writeFile(".local/app-fixture.json", JSON.stringify(fixture), {
      mode: 0o600,
    });
    await page
      .getByRole("textbox", { name: "Pickup name", exact: true })
      .fill("Track B browser");
    await button.click();
    await page.waitForURL(/\/orders\/[0-9a-f-]+$/, { timeout: 120000 });
    assert.equal(
      await page
        .getByRole("heading", { name: "Your pickup is paid", exact: true })
        .isVisible(),
      true,
    );
    const id = new URL(page.url()).pathname.split("/").pop()!;
    const { data: order, error } = await db
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error("Paid Supabase order missing");
    assert.equal(order.status, "paid");
    assert.ok(order.tx_hash);
    assert.ok(order.paid_at);
    assert.equal(order.buyer_id, fixture.buyerId);
    assert.equal(order.shop_id, fixture.shopId);
    assert.equal(order.total_cents, 500);
    saved = { order: { id: order.id, txHash: order.tx_hash } };
    await writeFile(".local/browser-result.json", JSON.stringify(saved), {
      mode: 0o600,
    });
  } else {
    await page.goto(`${origin}/orders/${saved.order.id}`);
  }
  const body = {
    shopSlug: "track-b-browser-demo",
    items: [{ productId: fixture.productId, qty: 1 }],
    pickupName: "Track B browser",
    expectedTotalCents: 500,
    idempotencyKey: fixture.checkoutId,
  };
  const replay = await buyer.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin },
    data: body,
  });
  assert.equal(replay.status(), 200);
  const repeated = await replay.json();
  assert.equal(repeated.id, saved.order.id);
  assert.equal(repeated.txHash, saved.order.txHash);
  const changed = await buyer.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin },
    data: { ...body, pickupName: "Changed name" },
  });
  assert.equal(changed.status(), 409);
  const forged = await buyer.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin },
    data: { ...body, buyerId: "someone-else" },
  });
  assert.equal(forged.status(), 400);
  const crossOrigin = await buyer.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin: "https://evil.test" },
    data: body,
  });
  assert.equal(crossOrigin.status(), 403);
  const badPrice = await buyer.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin },
    data: {
      ...body,
      expectedTotalCents: 1,
      idempotencyKey: crypto.randomUUID(),
    },
  });
  assert.equal(badPrice.status(), 409);
  // Use Track C's owner-generated login link in an entirely fresh agent browser.
  await page.goto(`${origin}/account`);
  await page
    .getByRole("button", {
      name: /Create agent link|Replace agent link/i,
    })
    .click();
  const agentUrl = await page
    .getByLabel("Your private agent link")
    .inputValue();
  assert.ok(agentUrl, "Owner-generated agent link missing");
  const agent = await browser.newContext();
  const agentPage = await agent.newPage();
  await agentPage.goto(agentUrl!);
  await agentPage
    .getByRole("button", { name: "Connect for ordering", exact: true })
    .click();
  await agentPage.waitForURL(/\/shops/, { timeout: 60000 });
  const agentReplay = await agent.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin },
    data: body,
  });
  let held: { requestId: string };
  if (agentReplay.status() === 202) {
    held = await agentReplay.json();
    const { data: beforeApproval } = await db
      .from("track_c_order_requests")
      .select("status,order_id")
      .eq("id", held.requestId)
      .single();
    assert.equal(beforeApproval!.status, "pending");
    assert.equal(beforeApproval!.order_id, null);
    await page.goto(`${origin}/account`);
    await page
      .getByRole("button", { name: "Approve and pay $5.00", exact: true })
      .click();
    await page.waitForURL(/notice=approved/, { timeout: 120000 });
  } else {
    assert.equal(agentReplay.status(), 200);
    assert.equal((await agentReplay.json()).txHash, saved.order.txHash);
    const { data: previousRequest } = await db
      .from("track_c_order_requests")
      .select("id")
      .eq("buyer_id", fixture.buyerId)
      .eq("idempotency_key", fixture.checkoutId)
      .single();
    assert.ok(previousRequest);
    held = { requestId: previousRequest.id };
    await page.goto(`${origin}/account`);
  }
  const approvedReplay = await agent.request.post(
    `${origin}/api/buyer/orders`,
    { headers: { origin }, data: body },
  );
  assert.equal(approvedReplay.status(), 200);
  assert.equal((await approvedReplay.json()).txHash, saved.order.txHash);
  await agentPage.goto(`${origin}/requests/${held.requestId}`);
  await agentPage
    .getByRole("link", { name: "View paid receipt", exact: true })
    .click();
  await agentPage
    .getByRole("heading", { name: "Your pickup is paid", exact: true })
    .waitFor();
  const excessive = await agent.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin },
    data: {
      ...body,
      expectedTotalCents: 2501,
      idempotencyKey: crypto.randomUUID(),
    },
  });
  assert.equal(excessive.status(), 403);
  const withdrawal = await agent.request.post(
    `${origin}/api/shops/track-b-browser-demo/withdraw`,
    {
      headers: { origin },
      data: {},
    },
  );
  assert.equal(withdrawal.status(), 401);
  await agentPage.goto(`${origin}/account`);
  await agentPage.waitForURL(/\/shops\?notice=agent/);
  await page.getByRole("button", { name: /Revoke agent access/i }).click();
  const revoked = await agent.request.post(`${origin}/api/buyer/orders`, {
    headers: { origin },
    data: body,
  });
  assert.equal(revoked.status(), 401);
  await agent.close();
  console.log(
    "Fresh Track C agent-link session: owner approval, retry, spending cap, withdrawal denial and revocation passed.",
  );
  // The dashboard was opened before payment; wait for its existing polling to show the paid order.
  await dashboard
    .getByText("Track B browser", { exact: true })
    .waitFor({ timeout: 20000 });
  const inbox = await merchant.request.get(
    `${origin}/api/shops/track-b-browser-demo/inbox`,
    { headers: { "x-shop-token": fixture.merchantToken } },
  );
  assert.equal(inbox.status(), 200);
  const board = await inbox.json();
  assert.ok(
    board.orders.some(
      (o: { id: string; status: string }) =>
        o.id === saved!.order.id && o.status === "paid",
    ),
  );
  const ledger = new SupabaseRepository(db);
  const { data: record } = await db
    .from("orders")
    .select("payment_nonce")
    .eq("id", saved.order.id)
    .single();
  const intent = await ledger.getIntent(record!.payment_nonce);
  assert.equal(intent?.state, "confirmed");
  const chain = createPublicClient({
    chain: baseSepolia,
    transport: http(
      process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    ),
  });
  const receipt = await chain.getTransactionReceipt({
    hash: saved.order.txHash as `0x${string}`,
  });
  validateSettlementReceipt(receipt, intent!.payment);
  const outputs = resolve("../../../outputs");
  await mkdir(outputs, { recursive: true });
  await page.goto(`${origin}/orders/${saved.order.id}`);
  await page.screenshot({
    path: resolve(outputs, "buyer-paid-receipt.png"),
    fullPage: true,
  });
  await dashboard.screenshot({
    path: resolve(outputs, "merchant-paid-order.png"),
    fullPage: true,
  });
  const { data: counted } = await db
    .from("orders")
    .select("id")
    .eq("buyer_id", fixture.buyerId)
    .eq("shop_id", fixture.shopId);
  assert.equal(counted?.length, 1);
  const result = {
    orderId: saved.order.id,
    txHash: saved.order.txHash,
    explorerUrl: `https://sepolia.basescan.org/tx/${saved.order.txHash}`,
    buyerId: fixture.buyerId,
    shopId: fixture.shopId,
    status: "paid",
    block: receipt.blockNumber.toString(),
    checkoutReplay: "same order and transaction",
    merchantInbox: "paid order appeared by polling",
    javascript: "disabled on buyer browser",
    agentSession: "fresh Track C secure login link",
    agentRestrictions:
      "spending cap, withdrawal/account denial and revoked-link rejection passed",
  };
  await writeFile(
    resolve(outputs, "browser-checkout-proof.json"),
    JSON.stringify(result, null, 2),
  );
  console.log("REAL BROWSER CHECKOUT", JSON.stringify(result, null, 2));
  await buyer.close();
  await merchant.close();
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(
    "Browser integration test failed:",
    message
      .replace(/\/agent\/[A-Za-z0-9_-]{43}/g, "/agent/[redacted]")
      .replaceAll(fixture.password, "[redacted]")
      .replaceAll(fixture.merchantToken, "[redacted]"),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
