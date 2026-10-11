import { randomUUID, createHash } from "node:crypto";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import type { PrivateKeyAccount, Address, Hex } from "viem";
import { AUSD, DOMAIN, NETWORK, centsToUnits, explorerUrl } from "./config";
import {
  decodeHeader,
  inputSchema,
  parsePayment,
  verifyAuthorization,
  PaymentError,
  sameAddress,
} from "./validation";
import type {
  Intent,
  Order,
  OrderInput,
  Payment,
  Rail,
  Repository,
  Requirements,
  Shop,
  Wallet,
  Withdrawal,
} from "./types";
import { walletVault } from "./wallets";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function requirements(payTo: Address, cents: number): Requirements {
  return {
    scheme: "exact",
    network: NETWORK,
    amount: centsToUnits(cents).toString(),
    asset: AUSD,
    payTo,
    maxTimeoutSeconds: 120,
    extra: {
      name: DOMAIN.name,
      version: DOMAIN.version,
      assetTransferMethod: "eip3009",
    },
  };
}
export function paymentKey(p: Payment): string {
  const a = p.payload.authorization;
  return `${NETWORK}:${AUSD.toLowerCase()}:${a.from.toLowerCase()}:${a.nonce.toLowerCase()}`;
}
export async function signPayment(
  account: PrivateKeyAccount,
  r: Requirements,
  url?: string,
): Promise<Payment> {
  const result = await new ExactEvmScheme(account).createPaymentPayload(2, r);
  return parsePayment({
    ...result,
    accepted: r,
    ...(url ? { resource: { url } } : {}),
  });
}
export function createPayments(options: {
  repository: Repository;
  rail: Rail;
  encryptionKey: string;
  treasury?: PrivateKeyAccount;
  treasuryWalletId?: string;
  offrampAddress?: Address;
  allowedPaymentOrigins?: string[];
}) {
  const { repository, rail } = options,
    vault = walletVault(repository, options.encryptionKey);
  async function quote(slug: string, value: unknown) {
    const parsed = inputSchema.safeParse(value);
    if (!parsed.success)
      throw new PaymentError(
        400,
        "Invalid order: use product UUIDs and quantities 1–100",
      );
    const input = parsed.data;
    if (
      new Set(input.items.map((i) => i.productId)).size !== input.items.length
    )
      throw new PaymentError(400, "Duplicate product IDs");
    const shop = await repository.getShop(slug);
    if (!shop || shop.status !== "live")
      throw new PaymentError(404, "Live shop not found");
    if (
      !Number.isInteger(shop.agentDiscountPct) ||
      shop.agentDiscountPct < 0 ||
      shop.agentDiscountPct > 50
    )
      throw new PaymentError(
        500,
        "Shop discount must be integer percent from 0 to 50",
      );
    const products = await repository.getProducts(
      shop.id,
      input.items.map((i) => i.productId),
    );
    let subtotalCents = 0,
      totalCents = 0;
    const orderItems = [];
    for (const item of input.items) {
      const p = products.find(
        (p) => p.id === item.productId && p.shopId === shop.id && p.available,
      );
      if (!p) throw new PaymentError(400, "Product unavailable");
      if (!Number.isSafeInteger(p.priceCents) || p.priceCents <= 0)
        throw new PaymentError(500, "Invalid catalog price");
      subtotalCents += p.priceCents * item.qty;
      const unitPriceCents = Math.round(
        (p.priceCents * (100 - shop.agentDiscountPct)) / 100,
      );
      totalCents += unitPriceCents * item.qty;
      orderItems.push({ ...item, name: p.name, unitPriceCents });
    }
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 1000000)
      throw new PaymentError(400, "Order exceeds testnet limit ($10,000)");
    const discountCents = subtotalCents - totalCents;
    return {
      shop,
      input,
      orderItems,
      subtotalCents,
      discountCents,
      totalCents,
      requirements: requirements(shop.walletAddress, totalCents),
    };
  }
  async function existingIntent(intent: Intent) {
    return (
      (await repository.getIntent(intent.key)) ??
      (intent.checkoutKey
        ? await repository.getCheckout(intent.checkoutKey)
        : null)
    );
  }
  async function settle(
    intent: Intent,
    payment: Payment,
    r: Requirements,
  ): Promise<Intent> {
    // Verify cryptographic identity even for expired retries, but never rebroadcast a reserved intent.
    await verifyAuthorization(payment, r, undefined, false);
    const existing = await existingIntent(intent);
    if (!existing) await rail.verify(payment, r);
    const claimed = await repository.claim(intent);
    let saved = claimed.intent;
    if (saved.binding !== intent.binding)
      throw new PaymentError(
        409,
        "Authorization nonce belongs to a different request",
      );
    if (saved.state === "confirmed") return saved;
    payment = saved.payment;
    r = payment.accepted;
    if (!claimed.created && saved.state === "reserved")
      throw new PaymentError(
        409,
        "Payment is being prepared or needs reconciliation; reuse this payment, do not sign another",
      );
    if (claimed.created) {
      // A failure leaves the reservation intact: this nonce cannot be reassigned or automatically paid again.
      if (rail.hosted) {
        await repository.startHosted(saved.key, await rail.hosted.startBlock());
      } else {
        const nonce = await repository.allocateNonce(
          rail.facilitatorAddress,
          await rail.pendingNonce(),
        );
        const tx = await rail.prepare(payment, nonce);
        await repository.prepare(saved.key, tx.rawTx, tx.txHash);
      }
      saved = (await repository.getIntent(saved.key))!;
    }
    if (rail.hosted && saved.state === "hosted") {
      const txHash =
        saved.txHash ??
        (await rail.hosted.reconcile(payment, saved.startBlock!)) ??
        (await rail.hosted.settle(payment, r));
      await repository.recordHostedHash(saved.key, txHash);
      await rail.confirm(txHash, payment);
      return repository.complete(saved.key);
    }
    if (!saved.rawTx || !saved.txHash)
      throw new PaymentError(503, "Payment preparation incomplete");
    // Exact signed transaction is saved before network I/O. Retries always broadcast the same bytes/hash.
    await rail.broadcast(saved.rawTx, saved.txHash);
    await rail.confirm(saved.txHash, payment);
    return repository.complete(saved.key);
  }
  async function placeOrder(
    slug: string,
    value: unknown,
    untrusted: unknown,
    checkoutId?: string,
  ): Promise<Order> {
    const payment = parsePayment(untrusted),
      a = payment.payload.authorization,
      key = paymentKey(payment);
    const parsed = inputSchema.safeParse(value);
    if (!parsed.success) throw new PaymentError(400, "Invalid order");
    const normalized = {
      ...parsed.data,
      items: [...parsed.data.items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      ),
    };
    const binding = hash({
      kind: "order",
      slug,
      input: normalized,
      payer: a.from.toLowerCase(),
    });
    const checkoutKey = hash({
      slug,
      payer: a.from.toLowerCase(),
      checkoutId: checkoutId ?? hash(normalized),
    });
    const prior =
      (await repository.getIntent(key)) ??
      (await repository.getCheckout(checkoutKey));
    if (prior) {
      if (prior.binding !== binding || !prior.order)
        throw new PaymentError(409, "Payment replay for another order");
      const r = prior.payment.accepted;
      await verifyAuthorization(payment, r, undefined, false);

      return (await settle(prior, payment, r)).order!;
    }
    const q = await quote(slug, normalized);
    if (q.input.buyerId) {
      const expected = await repository.getBuyerAddress(q.input.buyerId);
      if (!expected || !sameAddress(expected, a.from))
        throw new PaymentError(
          403,
          "Buyer wallet does not match payment signer",
        );
    }
    await verifyAuthorization(payment, q.requirements);
    const order: Order = {
      ...q.input,
      buyerId: q.input.buyerId ?? null,
      items: q.orderItems,
      paidAt: null,
      id: randomUUID(),
      shopId: q.shop.id,
      subtotalCents: q.subtotalCents,
      discountCents: q.discountCents,
      totalCents: q.totalCents,
      status: "awaiting_payment",
      chain: "base-sepolia",
      txHash: null,
      createdAt: new Date().toISOString(),
    };
    return (
      await settle(
        {
          key,
          checkoutKey,
          binding,
          order,
          withdrawal: null,
          payment,
          state: "reserved",
          rawTx: null,
          txHash: null,
        },
        payment,
        q.requirements,
      )
    ).order!;
  }
  async function transfer(
    account: PrivateKeyAccount,
    to: Address,
    amountCents: number,
    idempotencyKey: string,
    withdrawal: Withdrawal | null,
  ) {
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey))
      throw new PaymentError(
        400,
        "Use a stable idempotency key (8–128 letters, digits, _ or -)",
      );
    const r = requirements(to, amountCents),
      binding = hash({
        kind: withdrawal ? "withdraw" : "fund",
        shopId: withdrawal?.shopId ?? null,
        from: account.address.toLowerCase(),
        to: to.toLowerCase(),
        amountCents,
      });
    // The nonce is deterministic for a server initiated transfer, so retries sign the same authorization identity.
    const nonce =
      `0x${hash({ from: account.address.toLowerCase(), kind: withdrawal ? "withdraw" : "fund", idempotencyKey })}` as Hex;
    const key = `${NETWORK}:${AUSD.toLowerCase()}:${account.address.toLowerCase()}:${nonce}`;
    const prior = await repository.getIntent(key);
    if (prior && prior.binding !== binding)
      throw new PaymentError(
        409,
        "Idempotency key belongs to a different transfer",
      );
    // Reuse the persisted authorization and transaction on every retry.
    const signed = await signPayment(account, r);
    const authorization = { ...signed.payload.authorization, nonce };
    const { authorizationTypes } = await import("./config");
    const signature = await account.signTypedData({
      domain: DOMAIN,
      types: authorizationTypes,
      primaryType: "TransferWithAuthorization",
      message: {
        ...authorization,
        value: BigInt(authorization.value),
        validAfter: BigInt(authorization.validAfter),
        validBefore: BigInt(authorization.validBefore),
      },
    });
    const payment = prior?.payment ?? {
      ...signed,
      payload: { signature, authorization },
    };
    const result = await settle(
      prior ?? {
        key,
        binding,
        order: null,
        withdrawal,
        payment,
        state: "reserved",
        rawTx: null,
        txHash: null,
      },
      payment,
      r,
    );
    return {
      txHash: result.txHash!,
      explorerUrl: explorerUrl(result.txHash!),
      withdrawal: result.withdrawal,
    };
  }
  async function clientQuote(
    fetcher: typeof fetch,
    url: string,
    request: RequestInit,
    target: URL,
    body: OrderInput,
  ) {
    const challenge = await fetcher(url, request);
    if (challenge.status !== 402)
      throw new PaymentError(502, "Expected payment challenge");
    const header = challenge.headers.get("payment-required");
    if (!header) throw new PaymentError(502, "Missing PAYMENT-REQUIRED");
    const raw = decodeHeader(header) as {
      x402Version: number;
      accepts: Requirements[];
      resource?: { url: string };
    };
    if (raw.x402Version !== 2 || !Array.isArray(raw.accepts))
      throw new PaymentError(502, "Unsupported payment challenge");
    const r = raw.accepts.find(
      (r) =>
        r.network === NETWORK &&
        sameAddress(r.asset, AUSD) &&
        r.scheme === "exact",
    );
    if (!r || BigInt(r.amount) > 10000000000n)
      throw new PaymentError(402, "Unsupported or excessive payment");
    // Bind payment to our authoritative quote, including merchant recipient and catalog total.
    const match = target.pathname.match(/^\/api\/shops\/([^/]+)\/orders$/);
    if (!match) throw new PaymentError(400, "Unsupported order URL");
    const q = await quote(decodeURIComponent(match[1]), body);
    if (
      !sameAddress(r.payTo, q.requirements.payTo) ||
      r.amount !== q.requirements.amount
    )
      throw new PaymentError(402, "Challenge disagrees with catalog");
    return q;
  }
  return {
    shop: (slug: string) => repository.getShop(slug),
    createWallet: () => vault.createWallet(),
    getBalance: async (address: Address) => {
      const units = await rail.getBalance(address);
      return {
        address,
        asset: AUSD,
        chain: "base-sepolia" as const,
        units: units.toString(),
        balanceCents:
          units / 10000n <= BigInt(Number.MAX_SAFE_INTEGER)
            ? Number(units / 10000n)
            : null,
        decimals: 6,
      };
    },
    explorerUrl,
    quote,
    placeOrder,
    getOrder: (id: string) => repository.getOrder(id),
    async payX402(
      buyerWallet: Wallet,
      url: string,
      body: OrderInput,
      clientOptions: { idempotencyKey?: string; fetcher?: typeof fetch } = {},
    ) {
      const fetcher = clientOptions.fetcher ?? fetch;
      const target = new URL(url);
      if (!options.allowedPaymentOrigins?.includes(target.origin))
        throw new PaymentError(403, "Payment origin not allowed");
      const { encodeHeader } = await import("./validation");
      const clientKey = hash({
        wallet: buyerWallet.id,
        url,
        key: clientOptions.idempotencyKey ?? hash(body),
      });
      const request = {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": clientKey,
        },
        body: JSON.stringify(body),
        redirect: "error" as const,
      };
      let p = await repository.getClientPayment(clientKey);
      // Server binds an authorization to the order body; changing a reused key returns 409 there.
      if (!p) {
        const q = await clientQuote(fetcher, url, request, target, body);
        p = await repository.saveClientPayment(
          clientKey,
          await signPayment(
            await vault.account(buyerWallet),
            q.requirements,
            url,
          ),
        );
      }
      const response = await fetcher(url, {
        ...request,
        headers: { ...request.headers, "PAYMENT-SIGNATURE": encodeHeader(p) },
      });
      if (!response.ok)
        throw new PaymentError(
          response.status,
          "Payment request failed; retain this payment for reconciliation",
        );
      const order = (await response.json()) as Order;
      if (order.status !== "paid" || !order.txHash)
        throw new PaymentError(502, "Order is not confirmed paid");
      return {
        order,
        txHash: order.txHash,
        explorerUrl: explorerUrl(order.txHash),
      };
    },
    async fundBuyer(
      wallet: Wallet,
      amountCents = 1000,
      idempotencyKey = `fund-${wallet.id}`,
    ) {
      const treasuryWallet = options.treasuryWalletId
        ? await repository.getWallet(options.treasuryWalletId)
        : null;
      const treasury =
        options.treasury ??
        (treasuryWallet ? vault.decrypt(treasuryWallet) : null);
      if (!treasury) throw new Error("Treasury not configured");
      const stored = await repository.getWallet(wallet.id);
      if (!stored || !sameAddress(stored.walletAddress, wallet.walletAddress))
        throw new PaymentError(400, "Unknown buyer wallet");
      if (amountCents > 10000)
        throw new PaymentError(400, "Funding cap is $100 testnet AUSD");
      return transfer(
        treasury,
        wallet.walletAddress,
        amountCents,
        idempotencyKey,
        null,
      );
    },
    async withdraw(shop: Shop, amountCents: number, idempotencyKey: string) {
      if (!options.offrampAddress)
        throw new Error("Testnet off-ramp address not configured");
      const authoritative = await repository.getShop(shop.slug);
      if (!authoritative || authoritative.id !== shop.id)
        throw new PaymentError(404, "Shop not found");
      const saved = await repository.findWallet(authoritative.walletAddress);
      if (!saved) throw new Error("Merchant wallet not in server vault");
      const withdrawal: Withdrawal = {
        id: randomUUID(),
        shopId: shop.id,
        amountCents,
        txHash: null,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      return transfer(
        vault.decrypt(saved),
        options.offrampAddress,
        amountCents,
        idempotencyKey,
        withdrawal,
      );
    },
  };
}
export type Payments = ReturnType<typeof createPayments>;
