import "server-only";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { findShops, getMenu } from "@/lib/catalog";
import {
  checkoutSchema,
  slugSchema,
  type CheckoutInput,
} from "@/lib/buyer/schemas";
import { resolveAgent } from "@/lib/buyer/auth";
import { placeBuyerOrder } from "@/lib/buyer/checkout";
import {
  CatalogError,
  IntegrationUnavailable,
  InvalidOrder,
} from "@/lib/errors";
const output = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
const failure = (code: string, message: string) => ({
  ...output({ error: code, message }),
  isError: true,
});
async function catalogTool(fn: () => Promise<unknown>) {
  try {
    return output(await fn());
  } catch (error) {
    if (error instanceof IntegrationUnavailable)
      return failure(
        "catalog_integration_pending",
        "The shop catalog is not connected yet.",
      );
    if (error instanceof CatalogError)
      return failure("catalog_unavailable", error.message);
    return failure("internal_error", "The request could not be completed.");
  }
}
async function placeOrderTool(
  input: CheckoutInput,
  extra: Record<string, unknown> | undefined,
) {
  const buyerId = typeof extra?.buyerId === "string" ? extra.buyerId : null;
  if (!buyerId)
    return failure(
      "authentication_required",
      "Connect with the buyer's private agent link token as a Bearer token. No order was created.",
    );
  try {
    const order = await placeBuyerOrder({ buyerId, kind: "agent" }, input);
    return output({
      status: order.status,
      orderId: order.id,
      totalCents: order.totalCents,
      txHash: order.txHash,
      message: "Paid from the buyer's wallet. The shop has the order.",
    });
  } catch (error) {
    if (error instanceof InvalidOrder)
      return failure("invalid_order", error.message);
    if (error instanceof IntegrationUnavailable)
      return failure(
        "integration_pending",
        "Ordering is not connected yet. No order was created and no funds moved.",
      );
    return failure("internal_error", "The request could not be completed.");
  }
}
// Agents authenticate with the token from the buyer's private agent link.
// The same revocation and expiry rules apply as in the browser.
async function verifyAgent(_request: Request, token?: string) {
  const principal = token ? await resolveAgent(token) : null;
  if (!principal) return undefined;
  return {
    token: token!,
    clientId: "agent-link",
    scopes: ["orders:request"],
    extra: { buyerId: principal.buyerId },
  };
}
const protocolHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "find_shops",
      {
        title: "Find shops",
        description: "Find published shops by name.",
        inputSchema: z.object({ query: z.string().max(100).optional() }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      async ({ query }) => catalogTool(() => findShops(query)),
    );
    server.registerTool(
      "get_menu",
      {
        title: "Get a menu",
        description:
          "Read available menu items. Money is integer USD cents; agentPriceCents is the discounted unit price. A dish sold in sizes appears once per size: items sharing a baseName are sizes of one dish, and sizeLabel names the size. Order the productId of the size you want.",
        inputSchema: z.object({ slug: slugSchema }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      async ({ slug }) => {
        const result = await catalogTool(() => getMenu(slug));
        return result.content[0].text === "null"
          ? failure("shop_not_found", "There is no live shop at that address.")
          : result;
      },
    );
    server.registerTool(
      "place_order",
      {
        title: "Ask to place a pickup order",
        description:
          "Requires the buyer's private agent link token as a Bearer token. Pays for the order from the buyer's pre-funded wallet and sends it to the shop. Report it as paid only when the result's status is paid. Money is integer USD cents; expectedTotalCents must match the agent prices from get_menu.",
        inputSchema: checkoutSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (input, ctx) => placeOrderTool(input, ctx.http?.authInfo?.extra),
    );
  },
  { serverInfo: { name: "thepayments", version: "0.1.0" } },
);
// Reading shops and menus stays public. Only place_order needs the agent token.
export const mcpHandler = withMcpAuth(protocolHandler, verifyAgent, {
  required: false,
});
