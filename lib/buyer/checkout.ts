import "server-only";
import { checkoutSchema, type CheckoutInput } from "@/lib/buyer/schemas";
import { IntegrationUnavailable } from "@/lib/errors";
import { requestApproval, type ApprovalRequest } from "./approvals";
import type { Principal } from "./auth";
export { checkoutEnabled } from "./payment";

export type CheckoutResult = {
  status: "awaiting_approval";
  request: ApprovalRequest;
};
// Track C's single orchestration entry point for browser and MCP orders.
// An agent's order is held for the owner's approval and never pays by itself.
// The owner's own checkout stays disabled until Track B's payX402 is connected.
export async function placeBuyerOrder(
  principal: Principal,
  input: CheckoutInput,
  source: "web" | "mcp" = "web",
): Promise<CheckoutResult> {
  const order = checkoutSchema.parse(input);
  if (!principal.buyerId) throw new Error("Authentication required.");
  if (principal.kind === "agent")
    return {
      status: "awaiting_approval",
      request: await requestApproval(principal.buyerId, order, source),
    };
  throw new IntegrationUnavailable("payments");
}
