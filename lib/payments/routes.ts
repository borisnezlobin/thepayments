import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "../db/client";
import { paymentRuntime } from "./runtime";
import { createPaymentHandler } from "./http";
import type { Shop } from "./types";
async function authorizeShop(request: Request, shop: Shop) {
  const token = request.headers.get("x-shop-token");
  if (!token) return false;
  const { data, error } = await db()
    .from("shop_secrets")
    .select("admin_token")
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (error || !data) return false;
  const supplied = Buffer.from(token),
    expected = Buffer.from(data.admin_token);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
export async function handlePaymentRequest(request: Request) {
  try {
    return await createPaymentHandler(paymentRuntime().payments, {
      authorizeShop,
      authorizeOrder: async () => true,
    })(request);
  } catch {
    return Response.json(
      { error: "Payments are not configured; see docs/TRACK_B.md" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
