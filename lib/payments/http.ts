import { randomUUID } from "node:crypto";
import type { Payments } from "./service";
import { decodeHeader, encodeHeader, PaymentError } from "./validation";
import type { Shop } from "./types";
export type Access = {
  authorizeShop(request: Request, shop: Shop): Promise<boolean>;
  authorizeOrder(request: Request, orderId: string): Promise<boolean>;
};
const headers = { "cache-control": "no-store" };
async function readBody(request: Request, maxBytes = 16384): Promise<unknown> {
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes)
    throw new PaymentError(413, "Request too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new PaymentError(400, "Invalid JSON");
  }
}
async function orderRequest(
  payments: Payments,
  request: Request,
  slug: string,
) {
  const body = await readBody(request),
    signature = request.headers.get("payment-signature"),
    key = request.headers.get("idempotency-key");
  if (key && !/^[a-zA-Z0-9_-]{8,128}$/.test(key))
    throw new PaymentError(400, "Invalid Idempotency-Key");
  if (!signature) {
    const q = await payments.quote(slug, body),
      challenge = {
        x402Version: 2,
        resource: {
          url: request.url,
          description: "Pickup order",
          mimeType: "application/json",
        },
        accepts: [q.requirements],
      };
    return Response.json(challenge, {
      status: 402,
      headers: {
        ...headers,
        "PAYMENT-REQUIRED": encodeHeader(challenge),
        "Idempotency-Key": key ?? randomUUID(),
      },
    });
  }
  if (!key)
    throw new PaymentError(
      400,
      "Echo Idempotency-Key from the 402 challenge on payment retries",
    );
  const payment = decodeHeader(signature),
    result = await payments.placeOrder(slug, body, payment, key);
  const settle = {
    success: true,
    transaction: result.txHash,
    network: "eip155:84532",
  };
  return Response.json(result, {
    headers: { ...headers, "PAYMENT-RESPONSE": encodeHeader(settle) },
  });
}
async function orderStatus(
  payments: Payments,
  access: Access,
  request: Request,
  id: string,
) {
  if (!(await access.authorizeOrder(request, id)))
    throw new PaymentError(403, "Order access denied");
  const result = await payments.getOrder(id);
  if (!result) throw new PaymentError(404, "Order not found");
  return Response.json(
    {
      id: result.id,
      status: result.status,
      chain: result.chain,
      txHash: result.txHash,
      totalCents: result.totalCents,
      paidAt: result.paidAt,
      explorerUrl: result.txHash ? payments.explorerUrl(result.txHash) : null,
    },
    { headers },
  );
}
async function merchantRequest(
  payments: Payments,
  access: Access,
  request: Request,
  slug: string,
  action: string,
) {
  const shop = await payments.shop(slug);
  if (!shop) throw new PaymentError(404, "Shop not found");
  if (!(await access.authorizeShop(request, shop)))
    throw new PaymentError(403, "Merchant access denied");
  if (action === "balance")
    return Response.json(await payments.getBalance(shop.walletAddress), {
      headers,
    });
  const body = (await readBody(request, 1024)) as { amountCents: number };
  const key = request.headers.get("idempotency-key");
  if (!key) throw new PaymentError(400, "Idempotency-Key is required");
  return Response.json(await payments.withdraw(shop, body.amountCents, key), {
    headers,
  });
}
async function dispatch(payments: Payments, access: Access, request: Request) {
  const url = new URL(request.url),
    order = url.pathname.match(/^\/api\/orders\/([0-9a-f-]{36})$/i),
    shop = url.pathname.match(
      /^\/api\/shops\/([^/]+)\/(orders|balance|withdraw)$/,
    );
  if (order && request.method === "GET")
    return orderStatus(payments, access, request, order[1]);
  if (!shop) throw new PaymentError(404, "Route not found");
  const slug = decodeURIComponent(shop[1]),
    action = shop[2];
  if (action === "orders" && request.method === "POST")
    return orderRequest(payments, request, slug);
  const merchant =
    (action === "balance" && request.method === "GET") ||
    (action === "withdraw" && request.method === "POST");
  if (merchant) return merchantRequest(payments, access, request, slug, action);
  throw new PaymentError(405, "Method not allowed");
}
export function createPaymentHandler(
  payments: Payments,
  access: Access = {
    authorizeShop: async () => false,
    authorizeOrder: async () => false,
  },
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await dispatch(payments, access, request);
    } catch (e) {
      if (e instanceof PaymentError)
        return Response.json(
          { error: e.message },
          { status: e.status, headers },
        );
      const incidentId = randomUUID();
      console.error(
        "Track B request failed",
        incidentId,
        e instanceof Error ? e.name : "unknown",
      );
      return Response.json(
        {
          error:
            "Payment service unavailable; reuse the original authorization for retry",
          incidentId,
        },
        { status: 503, headers },
      );
    }
  };
}
