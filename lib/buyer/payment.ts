import "server-only";
import type { Order } from "@/lib/contract";
import { appOrigin } from "@/lib/config";
import { IntegrationUnavailable, InvalidOrder } from "@/lib/errors";
import { browserCheckoutEnabled, checkoutBuyer } from "@/lib/payments/buyer";
import { getRequest, type ApprovalRequest } from "./approvals";
export const checkoutEnabled = browserCheckoutEnabled();
export async function payApprovedRequest(
  buyerId: string,
  request: ApprovalRequest,
): Promise<Order> {
  if (!browserCheckoutEnabled()) throw new IntegrationUnavailable("payments");
  // Read the canonical owner-scoped approval; never sign agent-supplied request data.
  const approved = await getRequest(buyerId, request.id);
  if (!approved || !["approved", "paid"].includes(approved.status))
    throw new InvalidOrder("The owner has not approved this purchase.");
  return checkoutBuyer(
    buyerId,
    {
      shopSlug: approved.shopSlug,
      items: approved.items.map(({ productId, qty }) => ({ productId, qty })),
      pickupName: approved.pickupName,
      expectedTotalCents: approved.totalCents,
      idempotencyKey: approved.idempotencyKey,
    },
    appOrigin(),
    { preFundedOnly: true },
  );
}
