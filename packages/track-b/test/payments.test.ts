import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import {
  createPayments,
  signPayment,
  requirements,
  paymentKey,
} from "../../../lib/payments/service.js";
import { MemoryRepository } from "../../../lib/payments/memory.js";
import {
  verifyAuthorization,
  encodeHeader,
  validateBrowserLimit,
} from "../../../lib/payments/validation.js";
import { createPaymentHandler } from "../../../lib/payments/http.js";
import { walletVault } from "../../../lib/payments/wallets.js";
import {
  DOMAIN,
  authorizationTypes,
  centsToUnits,
} from "../../../lib/payments/config.js";
import type {
  Rail,
  Payment,
  Requirements,
} from "../../../lib/payments/types.js";
const encryptionKey = "11".repeat(32),
  txHash = `0x${"ab".repeat(32)}` as Hex;
class FakeRail implements Rail {
  facilitatorAddress = privateKeyToAccount(generatePrivateKey()).address;
  prepared = 0;
  broadcasts = 0;
  confirmed = 0;
  failVerify = false;
  failPrepare = false;
  failConfirm = false;
  failBroadcast = false;
  balance = 10000000n;
  hosted?: Rail["hosted"];
  async getBalance() {
    return this.balance;
  }
  async pendingNonce() {
    return 0;
  }
  async verify(p: Payment, r: Requirements) {
    await verifyAuthorization(p, r);
    if (this.failVerify) throw new Error("Insufficient funds");
  }
  async prepare() {
    if (this.failPrepare) throw new Error("Simulation failed");
    this.prepared++;
    return { rawTx: "0x1234" as Hex, txHash };
  }
  async broadcast() {
    this.broadcasts++;
    if (this.failBroadcast) throw new Error("RPC timeout");
  }
  async confirm() {
    if (this.failConfirm) throw new Error("Settlement reverted or pending");
    this.confirmed++;
  }
}
async function fixture() {
  const repository = new MemoryRepository(),
    rail = new FakeRail(),
    account = privateKeyToAccount(generatePrivateKey()),
    merchant = await walletVault(repository, encryptionKey).createWallet();
  const shop = {
    id: randomUUID(),
    slug: "cafe",
    name: "Demo Cafe",
    walletAddress: merchant.walletAddress,
    agentDiscountPct: 0,
    status: "live" as const,
  };
  const product = {
    id: randomUUID(),
    shopId: shop.id,
    name: "Coffee",
    priceCents: 500,
    available: true,
  };
  repository.shops.set(shop.slug, shop);
  repository.products.set(product.id, product);
  const payments = createPayments({
    repository,
    rail,
    encryptionKey,
    allowedPaymentOrigins: ["http://localhost:4020"],
    treasury: account,
    offrampAddress: merchant.walletAddress,
  });
  const body = {
      pickupName: "Alex",
      items: [{ productId: product.id, qty: 1 }],
    },
    r = requirements(shop.walletAddress, 500),
    p = await signPayment(account, r);
  return { repository, rail, account, shop, product, payments, body, r, p };
}
test("official SDK creates valid 5 AUSD signature with correct domain", async () => {
  const f = await fixture();
  await verifyAuthorization(f.p, f.r);
  assert.equal(f.p.payload.authorization.value, "5000000");
  assert.equal(centsToUnits(500), 5000000n);
});
test("invalid signature cannot create paid order", async () => {
  const f = await fixture();
  f.p.payload.signature = `0x${"00".repeat(65)}`;
  await assert.rejects(f.payments.placeOrder("cafe", f.body, f.p));
  assert.equal(f.repository.orders.size, 0);
  assert.equal(f.rail.prepared, 0);
});
test("wrong amounts and networks cannot create paid order", async () => {
  for (const change of [
    (p: Payment) => (p.payload.authorization.value = "1"),
    (p: Payment) => (p.accepted.amount = "1"),
    (p: Payment) =>
      ((p.accepted as { network: string }).network = "eip155:8453"),
  ]) {
    const f = await fixture();
    change(f.p);
    await assert.rejects(f.payments.placeOrder("cafe", f.body, f.p));
    assert.equal(f.rail.prepared, 0);
  }
});
test("expired authorization and incorrect signing domain rejected", async () => {
  const f = await fixture();
  f.p.payload.authorization.validBefore = "1";
  await assert.rejects(verifyAuthorization(f.p, f.r));
  const fresh = await signPayment(f.account, f.r),
    a = fresh.payload.authorization;
  fresh.payload.signature = await f.account.signTypedData({
    domain: { ...DOMAIN, name: "AUSD" },
    types: authorizationTypes,
    primaryType: "TransferWithAuthorization",
    message: {
      ...a,
      value: BigInt(a.value),
      validAfter: BigInt(a.validAfter),
      validBefore: BigInt(a.validBefore),
    },
  });
  await assert.rejects(verifyAuthorization(fresh, f.r));
});
test("pricing snapshots product names and matches Track A per-item rounding", async () => {
  const f = await fixture();
  f.shop.agentDiscountPct = 5;
  f.product.priceCents = 101;
  f.body.items[0].qty = 3;
  const q = await f.payments.quote("cafe", f.body);
  assert.equal(q.totalCents, 288);
  assert.equal(q.discountCents, 15);
  assert.deepEqual(q.orderItems, [
    { ...f.body.items[0], name: "Coffee", unitPriceCents: 96 },
  ]);
  await assert.rejects(f.payments.quote("cafe", { ...f.body, totalCents: 1 }));
});
test("paid transition requires confirmation; duplicates return same order", async () => {
  const f = await fixture();
  const a = await f.payments.placeOrder("cafe", f.body, f.p),
    b = await f.payments.placeOrder("cafe", f.body, f.p);
  assert.equal(a.status, "paid");
  assert.ok(a.paidAt);
  assert.equal(a.txHash, txHash);
  assert.equal(a.id, b.id);
  assert.equal(f.rail.prepared, 1);
  assert.equal(f.rail.broadcasts, 1);
});
test("concurrent duplicate attempts prepare one transaction and one order", async () => {
  const f = await fixture();
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => f.payments.placeOrder("cafe", f.body, f.p)),
  );
  assert.ok(results.some((r) => r.status === "fulfilled"));
  assert.equal(f.rail.prepared, 1);
  assert.equal(f.repository.orders.size, 1);
});
test("nonce cannot pay a different order body", async () => {
  const f = await fixture();
  await f.payments.placeOrder("cafe", f.body, f.p);
  await assert.rejects(
    f.payments.placeOrder("cafe", { ...f.body, pickupName: "Other" }, f.p),
    /replay/,
  );
});
test("failed settlement remains unpaid; retry reuses prepared transaction", async () => {
  const f = await fixture();
  f.rail.failConfirm = true;
  await assert.rejects(f.payments.placeOrder("cafe", f.body, f.p));
  assert.equal([...f.repository.orders.values()][0].status, "awaiting_payment");
  assert.equal([...f.repository.orders.values()][0].txHash, null);
  f.rail.failConfirm = false;
  assert.equal(
    (await f.payments.placeOrder("cafe", f.body, f.p)).status,
    "paid",
  );
  assert.equal(f.rail.prepared, 1);
});
test("broadcast timeout recovers across service restart", async () => {
  const f = await fixture();
  f.rail.failBroadcast = true;
  await assert.rejects(f.payments.placeOrder("cafe", f.body, f.p));
  assert.equal(
    (await f.repository.getIntent(paymentKey(f.p)))?.state,
    "prepared",
  );
  f.rail.failBroadcast = false;
  const restarted = createPayments({
    repository: f.repository,
    rail: f.rail,
    encryptionKey,
  });
  assert.equal(
    (await restarted.placeOrder("cafe", f.body, f.p)).status,
    "paid",
  );
  assert.equal(f.rail.prepared, 1);
});
test("verification and preparation failures never mark orders paid", async () => {
  for (const field of ["failVerify", "failPrepare"] as const) {
    const f = await fixture();
    f.rail[field] = true;
    await assert.rejects(f.payments.placeOrder("cafe", f.body, f.p));
    assert.ok(
      [...f.repository.orders.values()].every(
        (o) => o.status === "awaiting_payment",
      ),
    );
    await assert.rejects(f.payments.placeOrder("cafe", f.body, f.p));
    assert.equal(f.rail.broadcasts, 0);
  }
});
test("buyer identity must match signing wallet", async () => {
  const f = await fixture(),
    buyerId = randomUUID();
  f.repository.buyers.set(buyerId, f.shop.walletAddress);
  await assert.rejects(
    f.payments.placeOrder("cafe", { ...f.body, buyerId }, f.p),
    /Buyer wallet/,
  );
});
test("balance reads chain atomic units and returns cents", async () => {
  const f = await fixture();
  f.rail.balance = 1234567n;
  const b = await f.payments.getBalance(f.shop.walletAddress);
  assert.equal(b.balanceCents, 123);
  assert.equal(b.units, "1234567");
});
test("wallet creation returns no key; ciphertext tampering fails", async () => {
  const f = await fixture(),
    w = await f.payments.createWallet(),
    saved = (await f.repository.getWallet(w.id))!;
  assert.deepEqual(Object.keys(w).sort(), ["id", "walletAddress"]);
  assert.ok(saved.encryptedKey.startsWith("v1:"));
  saved.walletAddress = f.shop.walletAddress;
  assert.throws(() => walletVault(f.repository, encryptionKey).decrypt(saved));
});
test("HTTP challenge, payment response and ownership denial", async () => {
  const f = await fixture(),
    handler = createPaymentHandler(f.payments),
    url = "http://localhost:4020/api/shops/cafe/orders";
  const challenge = await handler(
    new Request(url, { method: "POST", body: JSON.stringify(f.body) }),
  );
  assert.equal(challenge.status, 402);
  assert.ok(challenge.headers.has("payment-required"));
  const paid = await handler(
    new Request(url, {
      method: "POST",
      body: JSON.stringify(f.body),
      headers: {
        "payment-signature": encodeHeader(f.p),
        "Idempotency-Key": "checkout-test-001",
      },
    }),
  );
  assert.equal(paid.status, 200);
  assert.ok(paid.headers.has("payment-response"));
  assert.equal(
    (await handler(new Request("http://localhost:4020/api/shops/cafe/balance")))
      .status,
    403,
  );
});
test("payX402 persists same authorization on retry", async () => {
  const f = await fixture(),
    w = await f.payments.createWallet(),
    handler = createPaymentHandler(f.payments);
  const fetcher = (async (url: RequestInfo | URL, options?: RequestInit) =>
    handler(new Request(url, options))) as typeof fetch;
  const a = await f.payments.payX402(
      w,
      "http://localhost:4020/api/shops/cafe/orders",
      f.body,
      { fetcher, idempotencyKey: "order-1", expectedTotalCents: 500 },
    ),
    b = await f.payments.payX402(
      w,
      "http://localhost:4020/api/shops/cafe/orders",
      f.body,
      { fetcher, idempotencyKey: "order-1", expectedTotalCents: 500 },
    );
  assert.equal(a.order.id, b.order.id);
  assert.equal(f.rail.prepared, 1);
});
for (const changedPrice of [400, 600, 2600]) {
  test(`fresh authorization rejects catalog change from approved 500 to ${changedPrice}`, async () => {
    const f = await fixture(),
      w = await f.payments.createWallet();
    const initial = await f.payments.quote("cafe", f.body);
    const handler = createPaymentHandler(f.payments);
    let signedRequests = 0;
    const fetcher = (async (url: RequestInfo | URL, options?: RequestInit) => {
      const request = new Request(url, options);
      if (request.headers.has("payment-signature")) signedRequests++;
      else f.product.priceCents = changedPrice;
      return handler(request);
    }) as typeof fetch;
    await assert.rejects(
      f.payments.payX402(
        w,
        "http://localhost:4020/api/shops/cafe/orders",
        f.body,
        {
          fetcher,
          idempotencyKey: "price-race",
          expectedTotalCents: initial.totalCents,
        },
      ),
      (e: unknown) =>
        e instanceof Error &&
        "status" in e &&
        e.status === 409 &&
        /approve again/.test(e.message),
    );
    assert.equal(signedRequests, 0);
    assert.equal(f.repository.clients.size, 0);
    assert.equal(f.repository.orders.size, 0);
    assert.equal(f.rail.prepared, 0);
    assert.equal(f.rail.broadcasts, 0);
  });
}
for (const [limit, status] of [
  ["400", 403],
  ["invalid", 503],
] as const) {
  test(`fresh signing rechecks a changed spending limit ${limit}`, async () => {
    const previous = process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS;
    try {
      process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS = "2500";
      const f = await fixture(),
        w = await f.payments.createWallet();
      const initial = await f.payments.quote("cafe", f.body);
      validateBrowserLimit(initial.totalCents);
      const handler = createPaymentHandler(f.payments);
      const fetcher = (async (
        url: RequestInfo | URL,
        options?: RequestInit,
      ) => {
        process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS = limit;
        return handler(new Request(url, options));
      }) as typeof fetch;
      await assert.rejects(
        f.payments.payX402(
          w,
          "http://localhost:4020/api/shops/cafe/orders",
          f.body,
          {
            fetcher,
            idempotencyKey: "cap-race",
            expectedTotalCents: initial.totalCents,
          },
        ),
        (e: unknown) =>
          e instanceof Error && "status" in e && e.status === status,
      );
      assert.equal(f.repository.clients.size, 0);
      assert.equal(f.rail.prepared, 0);
    } finally {
      if (previous === undefined)
        delete process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS;
      else process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS = previous;
    }
  });
}
test("settled checkout recovery ignores new catalog/cap but rejects a different approved total", async () => {
  const previous = process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS;
  try {
    process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS = "2500";
    const f = await fixture(),
      w = await f.payments.createWallet();
    const handler = createPaymentHandler(f.payments);
    let challenges = 0;
    const fetcher = (async (url: RequestInfo | URL, options?: RequestInit) => {
      const request = new Request(url, options);
      if (!request.headers.has("payment-signature")) challenges++;
      return handler(request);
    }) as typeof fetch;
    const options = {
      fetcher,
      idempotencyKey: "settled-original",
      expectedTotalCents: 500,
    };
    const first = await f.payments.payX402(
      w,
      "http://localhost:4020/api/shops/cafe/orders",
      f.body,
      options,
    );
    f.product.priceCents = 900;
    process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS = "100";
    const recovered = await f.payments.payX402(
      w,
      "http://localhost:4020/api/shops/cafe/orders",
      f.body,
      options,
    );
    assert.equal(recovered.order.id, first.order.id);
    assert.equal(recovered.txHash, first.txHash);
    assert.equal(challenges, 1);
    assert.equal(f.rail.prepared, 1);
    assert.equal(f.repository.clients.size, 1);
    await assert.rejects(
      f.payments.payX402(
        w,
        "http://localhost:4020/api/shops/cafe/orders",
        f.body,
        { ...options, expectedTotalCents: 900 },
      ),
      /different approved total/,
    );
    assert.equal(f.rail.prepared, 1);
  } finally {
    if (previous === undefined)
      delete process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS;
    else process.env.PAYMENTS_BROWSER_MAX_ORDER_CENTS = previous;
  }
});
test("testnet treasury funding idempotency and cap", async () => {
  const f = await fixture(),
    w = await f.payments.createWallet();
  const a = await f.payments.fundBuyer(w, 1000, "buyer-fund-001"),
    b = await f.payments.fundBuyer(w, 1000, "buyer-fund-001");
  assert.equal(a.txHash, b.txHash);
  assert.equal(f.rail.prepared, 1);
  await assert.rejects(
    f.payments.fundBuyer(w, 500, "buyer-fund-001"),
    /different transfer/,
  );
  await assert.rejects(f.payments.fundBuyer(w, 10001, "buyer-fund-002"), /cap/);
});
test("merchant withdrawal records sent and transaction after confirmation", async () => {
  const f = await fixture(),
    w = await f.payments.createWallet();
  f.shop.walletAddress = w.walletAddress;
  const result = await f.payments.withdraw(f.shop, 500, "withdraw-001");
  assert.equal(result.withdrawal?.status, "sent");
  assert.equal(result.withdrawal?.txHash, txHash);
});

test("checkout idempotency prevents double charge with a fresh valid signature", async () => {
  const f = await fixture();
  const first = await f.payments.placeOrder(
    "cafe",
    f.body,
    f.p,
    "checkout-new-sig",
  );
  const fresh = await signPayment(f.account, f.r);
  const second = await f.payments.placeOrder(
    "cafe",
    f.body,
    fresh,
    "checkout-new-sig",
  );
  assert.equal(first.id, second.id);
  assert.equal(f.rail.prepared, 1);
});

test("hosted settlement stays unpaid until receipt validation and reconciles lost response", async () => {
  const f = await fixture();
  let calls = 0,
    reconciled = false;
  f.rail.hosted = {
    startBlock: async () => "123",
    settle: async () => {
      calls++;
      reconciled = true;
      throw new Error("Response lost after successful broadcast");
    },
    reconcile: async () => (reconciled ? txHash : null),
  };
  await assert.rejects(
    f.payments.placeOrder("cafe", f.body, f.p, "hosted-checkout-1"),
  );
  const intent = await f.repository.getIntent(paymentKey(f.p));
  assert.equal(intent?.state, "hosted");
  assert.equal(intent?.order?.status, "awaiting_payment");
  const fresh = await signPayment(f.account, f.r);
  const order = await f.payments.placeOrder(
    "cafe",
    f.body,
    fresh,
    "hosted-checkout-1",
  );
  assert.equal(order.status, "paid");
  assert.equal(order.txHash, txHash);
  assert.equal(calls, 1);
  assert.equal(f.rail.prepared, 0);
  assert.equal(f.rail.confirmed, 1);
});
test("successful hosted response with failed receipt cannot mark paid", async () => {
  const f = await fixture();
  f.rail.hosted = {
    startBlock: async () => "123",
    settle: async () => txHash,
    reconcile: async () => null,
  };
  f.rail.failConfirm = true;
  await assert.rejects(
    f.payments.placeOrder("cafe", f.body, f.p, "hosted-checkout-2"),
  );
  assert.equal([...f.repository.orders.values()][0].status, "awaiting_payment");
});
test("receipt verification requires success, AUSD transfer and matching nonce event", async () => {
  const { validateSettlementReceipt } =
    await import("../../../lib/payments/rail.js");
  const { encodeEventTopics, encodeAbiParameters, parseAbiItem } =
    await import("viem");
  const f = await fixture(),
    a = f.p.payload.authorization;
  const transfer = {
    address: DOMAIN.verifyingContract,
    topics: encodeEventTopics({
      abi: [
        parseAbiItem(
          "event Transfer(address indexed from,address indexed to,uint256 value)",
        ),
      ],
      eventName: "Transfer",
      args: { from: a.from, to: a.to },
    }),
    data: encodeAbiParameters([{ type: "uint256" }], [5000000n]),
  };
  const used = {
    address: DOMAIN.verifyingContract,
    topics: encodeEventTopics({
      abi: [
        parseAbiItem(
          "event AuthorizationUsed(address indexed authorizer,bytes32 indexed nonce)",
        ),
      ],
      eventName: "AuthorizationUsed",
      args: { authorizer: a.from, nonce: a.nonce },
    }),
    data: "0x",
  };
  const receipt = {
    status: "success",
    logs: [transfer, used],
  } as unknown as Parameters<typeof validateSettlementReceipt>[0];
  validateSettlementReceipt(receipt, f.p);
  assert.throws(() =>
    validateSettlementReceipt({ ...receipt, status: "reverted" }, f.p),
  );
  assert.throws(() => validateSettlementReceipt({ ...receipt, logs: [] }, f.p));
  assert.throws(() =>
    validateSettlementReceipt(
      { ...receipt, logs: receipt.logs.slice(0, 1) },
      f.p,
    ),
  );
});

test("merchant placeholder or undecryptable vault wallet cannot accept checkout", async () => {
  const f = await fixture();
  const stored = await f.repository.findWallet(f.shop.walletAddress);
  assert.ok(stored);
  f.repository.wallets.delete(stored.id);
  await assert.rejects(f.payments.quote("cafe", f.body), /not provisioned/);
  f.repository.wallets.set(stored.id, { ...stored, encryptedKey: "invalid" });
  await assert.rejects(
    f.payments.quote("cafe", f.body),
    /signing wallet is unavailable/,
  );
  assert.equal(f.rail.prepared, 0);
});

test("withdraw-all retry recovers settlement after wallet debit and RPC outage", async () => {
  const f = await fixture();
  const first = await f.payments.withdraw(
    f.shop,
    undefined,
    "withdraw-persistent",
  );
  f.rail.getBalance = async () => {
    throw new Error("RPC offline after debit");
  };
  const repeated = await f.payments.withdraw(
    f.shop,
    undefined,
    "withdraw-persistent",
  );
  assert.equal(repeated.withdrawal?.id, first.withdrawal?.id);
  assert.equal(repeated.txHash, first.txHash);
  assert.equal(f.rail.prepared, 1);
});

test("expired authorization reconciles a previously settled hosted payment without a new charge", async () => {
  const f = await fixture();
  let settlementCalls = 0;
  f.rail.hosted = {
    startBlock: async () => "123",
    settle: async () => {
      settlementCalls++;
      throw new Error("Response lost after transfer");
    },
    reconcile: async () => (settlementCalls ? txHash : null),
  };
  await assert.rejects(
    f.payments.placeOrder("cafe", f.body, f.p, "expired-recovery"),
  );
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 300000;
    const order = await f.payments.placeOrder(
      "cafe",
      f.body,
      f.p,
      "expired-recovery",
    );
    assert.equal(order.status, "paid");
    assert.equal(order.txHash, txHash);
    assert.equal(settlementCalls, 1);
  } finally {
    Date.now = realNow;
  }
});
