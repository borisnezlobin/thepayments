import "server-only";
import type { Order } from "@/lib/contract";
import { IntegrationUnavailable } from "@/lib/errors";
import type { ApprovalRequest } from "./approvals";

// Track C's single payment seam for an order the buyer has approved.
// Deliberately disabled: no simulated balances, orders, hashes, or settlement.
// Connect Track B's payX402 here ONLY after agreeing the wallet and retry
// contract. Pass request.idempotencyKey through so a retry never charges twice.
export const checkoutEnabled = false;
export async function payApprovedRequest(
  request: ApprovalRequest,
): Promise<Order> {
  void request;
  throw new IntegrationUnavailable("payments");
}
