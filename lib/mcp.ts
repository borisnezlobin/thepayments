import "server-only";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { findShops, getMenu } from "@/lib/catalog";
import { checkoutSchema, slugSchema } from "@/lib/buyer/schemas";
import { CatalogError, IntegrationUnavailable } from "@/lib/errors";
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
export const mcpHandler = createMcpHandler(
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
          "Read available menu items. Money is integer USD cents; agentPriceCents is the discounted unit price.",
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
        title: "Place a pickup order (not available yet)",
        description:
          "Payment integration is pending. Cannot place orders or move funds yet. Never report an order as paid after calling it.",
        inputSchema: checkoutSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async () =>
        failure(
          "payment_integration_pending",
          "Wallet payment is not connected. No order was created and no funds moved.",
        ),
    );
  },
  { serverInfo: { name: "thepayments", version: "0.1.0" } },
);
