import { z } from "zod";
import { verifyTypedData, type Address } from "viem";
import { AUSD, DOMAIN, NETWORK, authorizationTypes } from "./config";
import type { Payment, Requirements } from "./types";
export class PaymentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const integer = z
  .string()
  .regex(/^(0|[1-9][0-9]{0,77})$/)
  .refine((v) => BigInt(v) < 2n ** 256n);
const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
export const inputSchema = z
  .object({
    buyerId: z.string().uuid().optional(),
    pickupName: z.string().trim().min(1).max(100),
    items: z
      .array(
        z
          .object({
            productId: z.string().uuid(),
            qty: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export const paymentSchema = z
  .object({
    x402Version: z.literal(2),
    resource: z.object({ url: z.string().url() }).passthrough().optional(),
    accepted: z.object({
      scheme: z.literal("exact"),
      network: z.literal(NETWORK),
      amount: integer,
      asset: address,
      payTo: address,
      maxTimeoutSeconds: z.number().int().min(1).max(300),
      extra: z
        .object({
          name: z.literal(DOMAIN.name),
          version: z.literal(DOMAIN.version),
          assetTransferMethod: z.literal("eip3009").default("eip3009"),
        })
        .passthrough(),
    }),
    payload: z
      .object({
        signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
        authorization: z
          .object({
            from: address,
            to: address,
            value: integer,
            validAfter: integer,
            validBefore: integer,
            nonce: hex32,
          })
          .strict(),
      })
      .strict(),
  })
  .passthrough();
export function parsePayment(value: unknown): Payment {
  const parsed = paymentSchema.safeParse(value);
  if (!parsed.success)
    throw new PaymentError(400, "Invalid x402 payment payload");
  return parsed.data as Payment;
}
export function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
export function message(payment: Payment) {
  const a = payment.payload.authorization;
  return {
    ...a,
    value: BigInt(a.value),
    validAfter: BigInt(a.validAfter),
    validBefore: BigInt(a.validBefore),
  };
}
export async function verifyAuthorization(
  payment: Payment,
  r: Requirements,
  now = Math.floor(Date.now() / 1000),
  checkTime = true,
): Promise<void> {
  const p = parsePayment(payment),
    a = p.payload.authorization,
    b = p.accepted;
  if (
    !sameAddress(b.asset, AUSD) ||
    !sameAddress(b.payTo, r.payTo) ||
    !sameAddress(a.to, r.payTo) ||
    b.amount !== r.amount ||
    a.value !== r.amount ||
    b.maxTimeoutSeconds !== r.maxTimeoutSeconds
  )
    throw new PaymentError(402, "Payment requirements mismatch");
  if (
    checkTime &&
    (BigInt(a.validAfter) >= BigInt(now) ||
      BigInt(a.validBefore) <= BigInt(now) ||
      BigInt(a.validBefore) > BigInt(now + r.maxTimeoutSeconds + 5))
  )
    throw new PaymentError(402, "Invalid authorization validity window");
  if (
    !(await verifyTypedData({
      address: a.from as Address,
      domain: DOMAIN,
      types: authorizationTypes,
      primaryType: "TransferWithAuthorization",
      message: message(p),
      signature: p.payload.signature,
    }))
  )
    throw new PaymentError(402, "Invalid authorization signature");
}
export function decodeHeader(value: string): unknown {
  if (value.length > 16384 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
    throw new PaymentError(400, "Invalid payment header");
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch {
    throw new PaymentError(400, "Invalid payment header");
  }
}
export const encodeHeader = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64");
