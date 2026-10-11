import "server-only";
import { getMenu } from "@/lib/catalog";
import type { ShopMenu } from "@/lib/contract";
import { IntegrationUnavailable, InvalidOrder } from "@/lib/errors";
import { quote } from "@/lib/money";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CheckoutInput } from "./schemas";
import { payApprovedRequest } from "./payment";

// Agents never spend on their own. Every agent order becomes a request that
// the signed-in owner approves or declines from /account.
export const APPROVAL_MINUTES = 30;
const TABLE = "track_c_order_requests";
const COLUMNS =
  "id,idempotency_key,source,shop_slug,shop_name,items,pickup_name,subtotal_cents,total_cents,status,order_id,expires_at,created_at";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "declined"
  | "paid"
  | "failed";
export interface ApprovalItem {
  productId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
}
export interface ApprovalRequest {
  id: string;
  idempotencyKey: string;
  source: "web" | "mcp";
  shopSlug: string;
  shopName: string;
  items: ApprovalItem[];
  pickupName: string;
  subtotalCents: number;
  totalCents: number;
  status: ApprovalStatus;
  orderId: string | null;
  expiresAt: string;
  createdAt: string;
}
interface RequestRow {
  id: string;
  idempotency_key: string;
  source: "web" | "mcp";
  shop_slug: string;
  shop_name: string;
  items: ApprovalItem[];
  pickup_name: string;
  subtotal_cents: number;
  total_cents: number;
  status: ApprovalStatus;
  order_id: string | null;
  expires_at: string;
  created_at: string;
}
const toRequest = (row: RequestRow): ApprovalRequest => ({
  id: row.id,
  idempotencyKey: row.idempotency_key,
  source: row.source,
  shopSlug: row.shop_slug,
  shopName: row.shop_name,
  items: row.items,
  pickupName: row.pickup_name,
  subtotalCents: row.subtotal_cents,
  totalCents: row.total_cents,
  status: row.status,
  orderId: row.order_id,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});
export const isExpired = (request: ApprovalRequest, now = Date.now()) =>
  request.status === "pending" && Date.parse(request.expiresAt) <= now;

// Prices come from the live menu, never from the agent.
export function snapshotOrder(menu: ShopMenu, input: CheckoutInput) {
  const totals = quote(menu, input.items);
  if (totals.totalCents !== input.expectedTotalCents)
    throw new InvalidOrder(
      "The total changed since the menu was read. Review the order again.",
    );
  const products = new Map(menu.items.map((p) => [p.productId, p]));
  return {
    shop_slug: menu.shop.slug,
    shop_name: menu.shop.name,
    items: input.items.map((item) => ({
      productId: item.productId,
      name: products.get(item.productId)!.name,
      qty: item.qty,
      unitPriceCents: products.get(item.productId)!.agentPriceCents,
    })),
    pickup_name: input.pickupName,
    subtotal_cents: totals.subtotalCents,
    total_cents: totals.totalCents,
  };
}
export async function requestApproval(
  buyerId: string,
  input: CheckoutInput,
  source: "web" | "mcp",
): Promise<ApprovalRequest> {
  const menu = await getMenu(input.shopSlug);
  if (!menu) throw new InvalidOrder("That shop is not taking orders.");
  const snapshot = snapshotOrder(menu, input);
  const db = supabaseAdmin();
  // A retried request with the same key returns the first one unchanged.
  const { error } = await db.from(TABLE).upsert(
    {
      ...snapshot,
      buyer_id: buyerId,
      idempotency_key: input.idempotencyKey,
      source,
      expires_at: new Date(
        Date.now() + APPROVAL_MINUTES * 60_000,
      ).toISOString(),
    },
    { onConflict: "buyer_id,idempotency_key", ignoreDuplicates: true },
  );
  if (error) throw new IntegrationUnavailable("account");
  const { data, error: readError } = await db
    .from(TABLE)
    .select(COLUMNS)
    .eq("buyer_id", buyerId)
    .eq("idempotency_key", input.idempotencyKey)
    .single<RequestRow>();
  if (readError || !data) throw new IntegrationUnavailable("account");
  if (
    data.shop_slug !== snapshot.shop_slug ||
    data.total_cents !== snapshot.total_cents ||
    data.pickup_name !== snapshot.pickup_name ||
    JSON.stringify(
      data.items.map(({ productId, qty }) => ({ productId, qty })),
    ) !==
      JSON.stringify(
        snapshot.items.map(({ productId, qty }) => ({ productId, qty })),
      )
  )
    throw new InvalidOrder(
      "That order key was already used for another order.",
    );
  return toRequest(data);
}
export async function getRequest(buyerId: string, id: string) {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select(COLUMNS)
    .eq("buyer_id", buyerId)
    .eq("id", id)
    .maybeSingle<RequestRow>();
  if (error) throw new IntegrationUnavailable("account");
  return data ? toRequest(data) : null;
}
export async function pendingRequests(buyerId: string) {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select(COLUMNS)
    .eq("buyer_id", buyerId)
    .or(
      `status.eq.approved,and(status.eq.pending,expires_at.gt.${new Date().toISOString()})`,
    )
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<RequestRow[]>();
  if (error) throw new IntegrationUnavailable("account");
  return data.map(toRequest);
}
// Moves a pending request to its next state. The status check makes a
// double tap or a second device a no-op instead of a second payment.
async function transition(
  buyerId: string,
  id: string,
  from: ApprovalStatus,
  to: ApprovalStatus,
) {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .update({
      status: to,
      decided_at: to === "pending" ? null : new Date().toISOString(),
    })
    .eq("buyer_id", buyerId)
    .eq("id", id)
    .eq("status", from)
    .gt("expires_at", new Date().toISOString())
    .select(COLUMNS)
    .maybeSingle<RequestRow>();
  if (error) throw new IntegrationUnavailable("account");
  if (!data)
    throw new InvalidOrder("This order was already decided or has expired.");
  return toRequest(data);
}
export async function declineRequest(buyerId: string, id: string) {
  await transition(buyerId, id, "pending", "declined");
}
export async function approveRequest(buyerId: string, id: string) {
  const existing = await getRequest(buyerId, id);
  if (!existing) throw new InvalidOrder("This order request was not found.");
  const request =
    existing.status === "approved" || existing.status === "paid"
      ? existing
      : await transition(buyerId, id, "pending", "approved");
  try {
    const order = await payApprovedRequest(buyerId, request);
    await supabaseAdmin()
      .from(TABLE)
      .update({ status: "paid", order_id: order.id })
      .eq("id", id)
      .eq("buyer_id", buyerId);
    return order;
  } catch (error) {
    // Payments are not connected: hand the request back so it can be approved later.
    // Any other failure leaves it approved. Settlement must be checked before a retry.
    if (error instanceof IntegrationUnavailable)
      await transition(buyerId, id, "approved", "pending");
    throw error;
  }
}
