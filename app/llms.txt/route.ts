import { appOrigin } from "@/lib/config";
export function GET() {
  const origin = appOrigin();
  return new Response(
    `# The Payments\n\nBuyer storefronts for pickup orders from local shops.\n\n## Discovery\n- Shop directory: ${origin}/shops\n- Storefront: ${origin}/s/{slug}\n- Agent instructions: ${origin}/agents\n- MCP Streamable HTTP: ${origin}/mcp\n- Tools: find_shops, get_menu, place_order\n\n## Browser ordering\nSign in by pasting the buyer's agent access token at ${origin}/agents/connect, or open the private agent link the buyer sends. Do not request a password.\nOpen a storefront, choose quantities, update the order total and enter a pickup name. Then place the order.\nOrders pay from the buyer's funded wallet, up to the per-order spending limit. You land on the receipt. Report the order as paid only when the receipt says it is paid.\nMenus are server-rendered HTML and advertise the merchant's JSON menu via rel=alternate.\nMoney is integer USD cents; the menu's agent prices include the shop discount.\n\n## Current availability\nShop discovery requires the merchant catalog connection.\nAgents can't create or fund a wallet.\nplace_order needs the buyer's agent access token as a Bearer token. It pays from the buyer's funded wallet. Report an order as paid only when its status is paid. No payment or order is simulated.\nNever claim an order is paid without a confirmed result from the payment integration.\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
