import "server-only";
import { checkoutSchema, type CheckoutInput } from "@/lib/buyer/schemas";
import { appOrigin } from "@/lib/config";
import type { Order } from "@/lib/contract";
import {
  browserCheckoutEnabled,
  checkoutBuyer,
  validateBrowserLimit,
} from "@/lib/payments/buyer";
import { IntegrationUnavailable } from "@/lib/errors";
import type { Principal } from "./auth";
export { checkoutEnabled } from "./payment";

export async function placeBuyerOrder(
  principal: Principal,
  input: CheckoutInput,
): Promise<Order> {
  const order = checkoutSchema.parse(input);
  if (!principal.buyerId) throw new Error("Authentication required.");
  if (!browserCheckoutEnabled()) throw new IntegrationUnavailable("payments");
  if (principal.kind === "agent") {
    validateBrowserLimit(order.expectedTotalCents);
    return checkoutBuyer(principal.buyerId, order, appOrigin(), {
      preFundedOnly: true,
    });
  }
  return checkoutBuyer(principal.buyerId, order, appOrigin());
}
