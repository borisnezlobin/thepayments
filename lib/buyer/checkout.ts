import "server-only";
import { checkoutSchema, type CheckoutInput } from "@/lib/buyer/schemas";
import type { Order } from "@/lib/contract";
import { IntegrationUnavailable } from "@/lib/errors";
import type { Principal } from "./auth";

// Track C's single orchestration seam for browser and MCP orders.
// Deliberately disabled: no simulated balances, orders, hashes, or settlement.
// Connect Track B's payX402 ONLY after agreeing the wallet and retry contract.
export async function placeBuyerOrder(
  principal: Principal,
  input: CheckoutInput,
): Promise<Order> {
  checkoutSchema.parse(input);
  if (!principal.buyerId) throw new Error("Authentication required.");
  throw new IntegrationUnavailable("payments");
}
export const checkoutEnabled = false;
